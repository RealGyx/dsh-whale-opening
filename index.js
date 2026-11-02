import { open } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

export const name = 'dsh-opening-v2';
export const inject = ['webServer', 'connection'];
export const ROUTE_PREFIX = '/dsh-opening-v2/';

// Request input never becomes a filesystem path. Only these two package assets
// can be served, even when a URL contains encoded slashes or dot segments.
const ASSETS = Object.freeze({
  [`${ROUTE_PREFIX}video.mp4`]: Object.freeze({
    file: 'opening-4k-h264.mp4', type: 'video/mp4',
  }),
  [`${ROUTE_PREFIX}poster.jpg`]: Object.freeze({
    file: 'first-frame.jpg', type: 'image/jpeg',
  }),
});

/**
 * Parse one HTTP byte range without overflowing on untrusted decimal values.
 * Unknown units and multipart ranges are ignored (a full 200 is permitted by
 * HTTP); malformed or unsatisfiable single byte ranges produce 416.
 */
export function parseRange(header, size) {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new TypeError('Media size must be a non-negative safe integer');
  }
  if (header === undefined || header === null) return { kind: 'full' };
  if (typeof header !== 'string') return { kind: 'unsatisfiable' };
  const value = header.trim();
  if (!/^bytes=/i.test(value)) return { kind: 'full' };
  if (value.includes(',')) return { kind: 'full' };
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value);
  if (!match || (!match[1] && !match[2]) || size === 0) {
    return { kind: 'unsatisfiable' };
  }
  const total = BigInt(size);
  if (!match[1]) {
    const suffix = BigInt(match[2]);
    if (suffix === 0n) return { kind: 'unsatisfiable' };
    return {
      kind: 'partial',
      start: Number(suffix >= total ? 0n : total - suffix),
      end: size - 1,
    };
  }
  const start = BigInt(match[1]);
  const requestedEnd = match[2] ? BigInt(match[2]) : total - 1n;
  if (start >= total || requestedEnd < start) return { kind: 'unsatisfiable' };
  return {
    kind: 'partial',
    start: Number(start),
    end: Number(requestedEnd >= total ? total - 1n : requestedEnd),
  };
}

function finish(request, response, status, message, extraHeaders = {}) {
  if (response.destroyed || response.writableEnded) return;
  const body = Buffer.from(message, 'utf8');
  response.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': String(body.length),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

/**
 * Create an authenticated Node HTTP handler and its disposal function.
 * mediaRoot must be a file: directory URL. openFile is injectable for tests.
 * The auth callback is DSH's synchronous connection.requestRejection(request).
 * No CORS headers or standalone listener are installed.
 */
export function createHandler({
  requestRejection,
  mediaRoot = new URL('./media/', import.meta.url),
  openFile = open,
} = {}) {
  if (typeof requestRejection !== 'function') {
    throw new TypeError('An authentication callback is required');
  }
  const root = new URL(mediaRoot);
  if (root.protocol !== 'file:' || !root.pathname.endsWith('/')) {
    throw new TypeError('mediaRoot must be a file: directory URL');
  }
  const active = new Set();
  let disposed = false;

  async function handler(request, response) {
    if (disposed) {
      finish(request, response, 503, 'unavailable\n');
      return;
    }
    try {
      const rejection = requestRejection(request);
      if (rejection !== undefined) {
        const status = rejection === 401 || rejection === 403 ? rejection : 500;
        finish(request, response, status,
          status === 401 ? 'unauthorized\n' : status === 403 ? 'forbidden\n' : 'unavailable\n');
        return;
      }
    } catch {
      // Authentication failures must never fall through into public serving.
      finish(request, response, 500, 'unavailable\n');
      return;
    }

    const rawPath = typeof request.url === 'string' ? request.url.split('?', 1)[0] : '';
    if (!Object.hasOwn(ASSETS, rawPath)) {
      finish(request, response, 404, 'not found\n');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      finish(request, response, 405, 'method not allowed\n', { allow: 'GET, HEAD' });
      return;
    }
    const asset = ASSETS[rawPath];
    const controller = new AbortController();
    let settle;
    const done = new Promise(resolve => { settle = resolve; });
    const operation = { controller, done };
    active.add(operation);
    const abort = () => controller.abort();
    const onResponseClose = () => {
      if (!response.writableFinished) abort();
    };
    request.once('aborted', abort);
    response.once('close', onResponseClose);
    let file;
    try {
      if (request.aborted || response.destroyed) abort();
      controller.signal.throwIfAborted();
      file = await openFile(new URL(asset.file, root), 'r');
      controller.signal.throwIfAborted();
      const metadata = await file.stat();
      controller.signal.throwIfAborted();
      if (!metadata.isFile()) {
        finish(request, response, 404, 'not found\n');
        return;
      }
      const size = metadata.size;
      if (!Number.isSafeInteger(size) || size < 0) {
        throw new Error('Unsupported media size');
      }
      // Range is defined for GET, not HEAD. No validators are emitted, so an
      // If-Range request cannot be validated and receives the full response.
      const range = parseRange(
        request.method === 'GET' && request.headers?.['if-range'] === undefined
          ? request.headers?.range : undefined,
        size,
      );
      if (range.kind === 'unsatisfiable') {
        finish(request, response, 416, 'range not satisfiable\n', {
          'accept-ranges': 'bytes',
          'content-range': `bytes */${size}`,
        });
        return;
      }
      const partial = range.kind === 'partial';
      const length = partial ? range.end - range.start + 1 : size;
      const headers = {
        'content-type': asset.type,
        'content-length': String(length),
        'accept-ranges': 'bytes',
        'cache-control': 'private, max-age=3600',
        'x-content-type-options': 'nosniff',
      };
      if (partial) headers['content-range'] = `bytes ${range.start}-${range.end}/${size}`;
      response.writeHead(partial ? 206 : 200, headers);
      if (request.method === 'HEAD' || size === 0) {
        response.end();
        return;
      }
      const stream = file.createReadStream({
        ...(partial ? { start: range.start, end: range.end } : {}),
        autoClose: true,
      });
      await pipeline(stream, response, { signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        if (!response.destroyed) response.destroy();
      } else if (!response.headersSent) {
        const missing = error?.code === 'ENOENT' || error?.code === 'ENOTDIR';
        finish(request, response, missing ? 404 : 500,
          missing ? 'not found\n' : 'unavailable\n');
      } else if (!response.destroyed) {
        response.destroy();
      }
    } finally {
      request.off('aborted', abort);
      response.off('close', onResponseClose);
      if (file !== undefined) {
        try { await file.close(); } catch { /* already closed by the stream */ }
      }
      active.delete(operation);
      settle();
    }
  }

  handler.dispose = async () => {
    disposed = true;
    const pending = [...active];
    for (const operation of pending) operation.controller.abort();
    await Promise.all(pending.map(operation => operation.done));
  };
  return handler;
}

/** Register only with the existing DSH carrier, owning route and streams. */
export function apply(ctx) {
  ctx.effect(() => {
    const handler = createHandler({
      requestRejection: request => ctx.connection.requestRejection(request),
    });
    let unregister;
    try {
      unregister = ctx.webServer.register({
        kind: 'prefix', path: ROUTE_PREFIX.slice(0, -1), handler,
      });
    } catch (error) {
      void handler.dispose();
      throw error;
    }
    return async () => {
      unregister();
      await handler.dispose();
    };
  }, 'dsh-opening-v2: authenticated media route');
}
