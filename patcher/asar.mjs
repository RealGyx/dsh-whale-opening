// Dependency-free ASAR reader/writer.
//
// This module knows only the archive container format Electron uses; it never
// carries application code. The patcher uses it to read the two host files it
// rewrites (lib/main.js and lib/preload-app.cjs) out of an archive the user
// already installed, and to write a new archive where every other entry is
// copied through byte for byte.
//
// Layout produced and consumed here:
//   u32 first = 4
//   u32 blockSize (= aligned + 4)
//   u32 aligned
//   u32 jsonLength
//   json bytes (utf8), padded with the remainder of `aligned`
//   entry payloads, concatenated in header order
import fs from 'node:fs';
import crypto from 'node:crypto';

const HEADER_ALIGN = 4;

function alignUp(value) {
  return (value + HEADER_ALIGN - 1) & ~(HEADER_ALIGN - 1);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Open an archive for reading. Caller must close() it. */
export function openArchive(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const stat = fs.fstatSync(fd);
    if (stat.size < 16) throw new Error('not an asar archive: file is too small');
    const head = Buffer.alloc(16);
    if (fs.readSync(fd, head, 0, 16, 0) !== 16) throw new Error('not an asar archive: short read');
    const first = head.readUInt32LE(0);
    const blockSize = head.readUInt32LE(4);
    const aligned = head.readUInt32LE(8);
    const jsonLength = head.readUInt32LE(12);
    if (first !== 4) throw new Error('not an asar archive: unexpected leading word');
    if (blockSize !== aligned + 4) throw new Error('not an asar archive: inconsistent header sizes');
    if (jsonLength < 2 || jsonLength > aligned) throw new Error('not an asar archive: bad header length');
    const json = Buffer.alloc(jsonLength);
    if (fs.readSync(fd, json, 0, jsonLength, 16) !== jsonLength) {
      throw new Error('not an asar archive: truncated header');
    }
    const header = JSON.parse(json.toString('utf8'));
    if (!header || typeof header !== 'object' || typeof header.files !== 'object') {
      throw new Error('not an asar archive: no file tree');
    }
    const base = 8 + blockSize;
    if (base > stat.size) throw new Error('not an asar archive: truncated payload area');
    return {
      file, fd, header, base, size: stat.size,
      close() { try { fs.closeSync(fd); } catch { /* already closed */ } },
    };
  } catch (error) {
    try { fs.closeSync(fd); } catch { /* nothing to close */ }
    throw error;
  }
}

function entryOf(header, name) {
  let node = header;
  for (const part of name.split('/')) {
    if (!node?.files || !Object.hasOwn(node.files, part)) return null;
    node = node.files[part];
  }
  return node;
}

/** Read one regular file entry. Directories, links and unpacked entries throw. */
export function readEntry(archive, name) {
  const entry = entryOf(archive.header, name);
  if (!entry) throw new Error(`archive has no entry named ${name}`);
  if (entry.files) throw new Error(`${name} is a directory`);
  if (entry.link) throw new Error(`${name} is a symbolic link`);
  if (entry.unpacked) throw new Error(`${name} is stored unpacked outside the archive`);
  const size = Number(entry.size);
  if (!Number.isSafeInteger(size) || size < 0) throw new Error(`${name} has an invalid size`);
  const buffer = Buffer.alloc(size);
  if (size > 0) {
    const read = fs.readSync(archive.fd, buffer, 0, size, archive.base + Number(entry.offset));
    if (read !== size) throw new Error(`${name} is truncated in the archive`);
  }
  return buffer;
}

/** Data-bearing entries in header order, i.e. the order payloads are stored. */
export function dataEntries(header) {
  const out = [];
  const walk = (node, prefix) => {
    for (const [key, entry] of Object.entries(node.files ?? {})) {
      const name = prefix ? `${prefix}/${key}` : key;
      if (entry.files) walk(entry, name);
      else if (!entry.link && !entry.unpacked) out.push({ name, entry });
    }
  };
  walk(header, '');
  return out;
}

export function deleteEntry(header, name) {
  const parts = name.split('/');
  let node = header;
  for (const part of parts.slice(0, -1)) {
    node = node?.files?.[part];
    if (!node) return false;
  }
  const last = parts.at(-1);
  if (!node?.files || !Object.hasOwn(node.files, last)) return false;
  delete node.files[last];
  return true;
}

function applyIntegrity(entry, data) {
  const integrity = entry.integrity;
  if (!integrity) return;
  const blockSize = integrity.blockSize || 4194304;
  const blocks = [];
  for (let offset = 0; offset < data.length; offset += blockSize) {
    blocks.push(sha256(data.subarray(offset, offset + blockSize)));
  }
  entry.integrity = {
    algorithm: integrity.algorithm || 'SHA256',
    hash: sha256(data),
    blockSize,
    blocks,
  };
}

function packHeader(header) {
  const json = Buffer.from(JSON.stringify(header), 'utf8');
  const aligned = alignUp(4 + json.length);
  const block = Buffer.alloc(4 + aligned);
  block.writeUInt32LE(aligned, 0);
  block.writeUInt32LE(json.length, 4);
  json.copy(block, 8);
  const prefix = Buffer.alloc(8);
  prefix.writeUInt32LE(4, 0);
  prefix.writeUInt32LE(block.length, 4);
  return { header: Buffer.concat([prefix, block]), blockSize: block.length };
}

/**
 * Write a new archive: same entry tree, `replacements` substituted by name,
 * `drop` removed from the tree, everything else copied through unchanged.
 * The finished file is verified by re-reading it before this returns.
 */
export function rewriteArchive({ from, header, replacements, drop, to }) {
  // Dropped entries must not be carried into the payload area, otherwise their
  // bytes stay behind as unreachable padding and a second run writes a
  // different archive.
  const dropped = new Set(drop);
  const items = dataEntries(header).filter(item => !dropped.has(item.name));
  // Capture original locations before any offset is reassigned.
  for (const item of items) {
    item.origin = Number(item.entry.offset);
    item.originSize = Number(item.entry.size);
    if (replacements.has(item.name)) item.replacement = replacements.get(item.name);
  }
  for (const name of drop) deleteEntry(header, name);

  let total = 0;
  for (const item of items) {
    item.entry.offset = String(total);
    if (item.replacement) {
      item.entry.size = item.replacement.length;
      applyIntegrity(item.entry, item.replacement);
      total += item.replacement.length;
    } else {
      total += item.originSize;
    }
  }

  const packed = packHeader(header);
  const chunk = Buffer.alloc(4 * 1024 * 1024);
  const dest = fs.openSync(to, 'w');
  try {
    fs.writeSync(dest, packed.header);
    for (const item of items) {
      if (item.replacement) {
        fs.writeSync(dest, item.replacement);
        continue;
      }
      let copied = 0;
      while (copied < item.originSize) {
        const want = Math.min(chunk.length, item.originSize - copied);
        const read = fs.readSync(from.fd, chunk, 0, want, from.base + item.origin + copied);
        if (read <= 0) throw new Error(`unexpected end of archive while copying ${item.name}`);
        fs.writeSync(dest, chunk, 0, read);
        copied += read;
      }
    }
    fs.fsyncSync(dest);
  } finally {
    fs.closeSync(dest);
  }

  // Verify what was written before the caller may replace anything.
  const check = openArchive(to);
  try {
    if (JSON.stringify(check.header) !== JSON.stringify(header)) {
      throw new Error('verification failed: written header differs from the planned header');
    }
    for (const item of items) {
      if (!item.replacement) continue;
      if (!readEntry(check, item.name).equals(item.replacement)) {
        throw new Error(`verification failed: ${item.name} does not round-trip`);
      }
    }
    const expected = check.base + total;
    if (fs.fstatSync(check.fd).size !== expected) {
      throw new Error(`verification failed: archive size ${fs.fstatSync(check.fd).size} != ${expected}`);
    }
  } finally {
    check.close();
  }
  return { bytes: total, entries: items.length, dropped: [...drop] };
}

export { sha256 };
