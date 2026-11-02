#!/usr/bin/env node
// Desktop bridge patcher for dsh-whale-opening.
//
// Reads the app.asar that is already installed on *this* machine, applies the
// single-window opening bridge to its two host files, and writes the result
// back. No DSH code ships with this repository: the archive being edited is the
// user's own copy, and the only inserted code is ours.
//
// CLI messages are English on purpose: Windows consoles on non-UTF-8 code pages
// mangle non-ASCII output. The repository README covers usage in Chinese.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Electron's fs shim rewrites every path ending in .asar to "this archive,
// entry ''". The patcher treats the archive as an ordinary file, so opt out.
if (process.versions.electron) process.noAsar = true;

const { openArchive, readEntry, rewriteArchive, sha256 } = await import('./asar.mjs');
const { transformDesktop, applyPoster, UnsupportedBuildError } = await import('./transform.mjs');

const MAIN_ENTRY = 'lib/main.js';
const PRELOAD_ENTRY = 'lib/preload-app.cjs';
const OBSOLETE_ENTRIES = ['lib/preload-opening.cjs', 'lib/preload-whale-opening.cjs'];
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const EXE_NAME = 'DeepSeek Harness';

const log = message => process.stdout.write(message + '\n');

function fail(message, code = 1) {
  process.stderr.write('error: ' + message + '\n');
  process.exit(code);
}

function parseArgs(argv) {
  const options = { apply: false, restore: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) fail(`${arg} requires a value`);
      i += 1;
      return value;
    };
    switch (arg) {
      case '--apply': options.apply = true; break;
      case '--restore': options.restore = true; break;
      case '--install': options.install = next(); break;
      case '--poster': options.poster = next(); break;
      case '--dsh-home': options.dshHome = next(); break;
      case '--help': case '-h': options.help = true; break;
      default: fail(`unknown argument ${arg} (use --help)`);
    }
  }
  return options;
}

const USAGE = `usage: node patcher/patch.mjs [options]

  --install <dir>   DSH install directory containing resources\\app.asar
                    (auto-detected when omitted)
  --apply           write the patch; without it the patcher only checks (dry run)
  --restore         restore the newest app.asar.bak-* backup and exit
  --poster <file>   image used as the first-frame curtain; defaults to this
                    repository's media/ or the installed plugin's media/
  --dsh-home <dir>  DSH data directory used to locate the installed plugin
                    (defaults to $DSH_HOME)
  -h, --help        show this help

exit codes: 0 ok, 1 error, 2 unsupported DSH build (nothing was written)`;

function resolveInstallDir(explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  if (process.env.DSH_INSTALL_DIR) candidates.push(process.env.DSH_INSTALL_DIR);
  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness'));
    candidates.push(path.join(process.env.LOCALAPPDATA, 'DeepSeek Harness'));
  }
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
    if (base) candidates.push(path.join(base, 'DeepSeek Harness'));
  }
  candidates.push('D:\\DeepSeek Harness');
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'resources', 'app.asar'))) return path.resolve(dir);
  }
  return null;
}

function runningInstances() {
  if (process.platform !== 'win32') return [];
  const script = `Get-Process -Name '${EXE_NAME}' -ErrorAction SilentlyContinue | ForEach-Object { $_.Path }`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0 || !result.stdout) return [];
  return result.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function isUnder(child, parent) {
  const a = path.resolve(child).toLowerCase();
  const b = path.resolve(parent).toLowerCase();
  return a === b || a.startsWith(b.endsWith(path.sep) ? b : b + path.sep);
}

function resolveDshHome(explicit) {
  const candidates = [explicit, process.env.DSH_HOME, path.join(os.homedir(), '.dsh-home')].filter(Boolean);
  for (const dir of candidates) if (fs.existsSync(dir)) return dir;
  return null;
}

function findInstalledPlugin(dshHome) {
  if (!dshHome) return null;
  const profiles = path.join(dshHome, 'profiles');
  let entries = [];
  try { entries = fs.readdirSync(profiles, { withFileTypes: true }); } catch { return null; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(profiles, entry.name, 'node_modules', 'dsh-whale-opening');
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
  }
  return null;
}

function resolvePoster(options) {
  if (options.poster) {
    const file = path.resolve(options.poster);
    if (!fs.existsSync(file)) fail(`poster not found: ${file}`);
    return { source: file, buffer: fs.readFileSync(file) };
  }
  const bundled = new URL('../media/first-frame.jpg', import.meta.url);
  if (fs.existsSync(bundled)) {
    return { source: 'media/first-frame.jpg (this repository)', buffer: fs.readFileSync(bundled) };
  }
  const pluginDir = findInstalledPlugin(resolveDshHome(options.dshHome));
  if (pluginDir) {
    const file = path.join(pluginDir, 'media', 'first-frame.jpg');
    if (fs.existsSync(file)) return { source: file, buffer: fs.readFileSync(file) };
  }
  return { source: 'built-in transparent pixel (curtain keeps its dark background)', buffer: null };
}

function checkSyntax(dir, name, content) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  const result = spawnSync(process.execPath, ['--check', file], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`syntax check failed for ${name}:\n${(result.stderr || result.stdout || '').trim()}`);
  }
}

function findLatestBackup(resourcesDir) {
  let names = [];
  try { names = fs.readdirSync(resourcesDir); } catch { return null; }
  const backups = names.filter(name => /^app\.asar\.bak-\d{8}-\d{6}$/.test(name)).sort();
  return backups.length ? path.join(resourcesDir, backups.at(-1)) : null;
}

function restore(resourcesDir, archivePath) {
  const backup = findLatestBackup(resourcesDir);
  if (!backup) fail(`no backup found (${path.join(resourcesDir, 'app.asar.bak-*')})`);
  const temp = archivePath + '.restore';
  fs.copyFileSync(backup, temp);
  const restored = sha256(fs.readFileSync(temp));
  fs.renameSync(temp, archivePath);
  log(`restored ${path.basename(backup)} -> app.asar`);
  log(`sha256 after restore: ${restored}`);
  log('restart DSH yourself when you want the rollback to take effect.');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    log(USAGE);
    return;
  }
  if (process.platform !== 'win32') fail('the desktop bridge only applies to Windows builds.');

  const installDir = resolveInstallDir(options.install);
  if (!installDir) fail('DSH install directory not found; pass --install <dir> (must contain resources\\app.asar).');
  const resourcesDir = path.join(installDir, 'resources');
  const archivePath = path.join(resourcesDir, 'app.asar');
  log(`install: ${installDir}`);

  const running = runningInstances().filter(exe => isUnder(exe, installDir));
  if (running.length) {
    fail(`DSH from this install is running (${running[0]}). Close it first; this tool never kills or restarts your processes.`);
  }

  if (options.restore) {
    restore(resourcesDir, archivePath);
    return;
  }

  const archive = openArchive(archivePath);
  let mainText;
  let preloadText;
  try {
    mainText = readEntry(archive, MAIN_ENTRY).toString('utf8');
    preloadText = readEntry(archive, PRELOAD_ENTRY).toString('utf8');
  } catch (error) {
    archive.close();
    fail(`expected host files are missing from app.asar: ${error.message}`, 2);
  }
  const originalHash = sha256(fs.readFileSync(archivePath));

  let transformed;
  try {
    transformed = transformDesktop(mainText, preloadText);
  } catch (error) {
    archive.close();
    if (error instanceof UnsupportedBuildError) {
      fail('unsupported DSH build, nothing was written.\n  reason: ' + error.message
        + '\n  the patch anchors have to be re-validated against upstream changes.', 2);
    }
    throw error;
  }

  const poster = resolvePoster(options);
  const patchedPreload = applyPoster(transformed.preload, poster.buffer
    ? 'data:image/jpeg;base64,' + poster.buffer.toString('base64')
    : TRANSPARENT_PIXEL);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-opening-patch-'));
  try {
    checkSyntax(tempDir, 'main.mjs', transformed.main);
    checkSyntax(tempDir, 'preload.cjs', patchedPreload);
    log('syntax check: main.js (ESM) and preload-app.cjs (CJS) both parse');
  } catch (error) {
    archive.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    fail(error.message);
  }

  const dropped = OBSOLETE_ENTRIES.filter(name => {
    try { readEntry(archive, name); return true; } catch { return false; }
  });

  log(`archive: ${archivePath}`);
  log(`archive size: ${(archive.size / 1024 / 1024).toFixed(1)} MB`);
  log(`main: ${MAIN_ENTRY} ${mainText.length} -> ${transformed.main.length} chars`);
  log(`preload: ${PRELOAD_ENTRY} ${preloadText.length} -> ${patchedPreload.length} chars`);
  log(`poster: ${poster.source}`);
  if (dropped.length) log(`will drop leftovers from an older integration: ${dropped.join(', ')}`);

  if (!options.apply) {
    archive.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    log('');
    log('DRY RUN: anchors matched and syntax passed; nothing was written.');
    log('re-run with --apply to write.');
    return;
  }

  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
    + `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const backupName = `app.asar.bak-${stamp}`;
  const backupPath = path.join(resourcesDir, backupName);
  const candidatePath = path.join(resourcesDir, 'app.asar.new');

  fs.copyFileSync(archivePath, backupPath);
  if (sha256(fs.readFileSync(backupPath)) !== originalHash) {
    archive.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    fail(`backup verification failed: ${backupPath}`);
  }
  log(`backup: ${backupName}`);

  try {
    rewriteArchive({
      from: archive,
      header: archive.header,
      replacements: new Map([
        [MAIN_ENTRY, Buffer.from(transformed.main)],
        [PRELOAD_ENTRY, Buffer.from(patchedPreload)],
      ]),
      drop: dropped,
      to: candidatePath,
    });
  } catch (error) {
    archive.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(candidatePath, { force: true });
    fail(`write failed, original archive untouched: ${error.message}`);
  }
  archive.close();
  fs.rmSync(tempDir, { recursive: true, force: true });

  try {
    fs.renameSync(candidatePath, archivePath);
  } catch (error) {
    fs.rmSync(candidatePath, { force: true });
    fail(`could not replace the archive (${error.message}). Original untouched, backup ${backupName}.`);
  }

  log('');
  log('patched.');
  log(`  new sha256: ${sha256(fs.readFileSync(archivePath))}`);
  log(`  rollback:   node patcher/patch.mjs --install "${installDir}" --restore`);
  log('  restart DSH yourself for the desktop integration to load; this tool never restarts it.');
}

main();
