// lib/crm/chunkBuffer.js
// File-based buffer for chunked CSV uploads.
// Uses /tmp so chunks survive Turbopack hot reloads (in-memory Map was wiped on reload).

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const TMP_DIR = '/tmp';
const CHUNK_TTL_MS = 30 * 60 * 1000; // 30 minutes

fs.mkdirSync(TMP_DIR, { recursive: true });

function chunkPath(sessionId, filename, chunkIndex) {
  return path.join(TMP_DIR, `etl_chunks_${sessionId}_${filename}_${chunkIndex}.txt`);
}

function metaPath(sessionId, filename) {
  return path.join(TMP_DIR, `etl_chunks_${sessionId}_${filename}_meta.json`);
}

async function cleanOldFiles() {
  try {
    const files = await fsPromises.readdir(TMP_DIR);
    const now = Date.now();
    await Promise.all(
      files
        .filter(f => f.startsWith('etl_chunks_'))
        .map(async f => {
          const fullPath = path.join(TMP_DIR, f);
          try {
            const stat = await fsPromises.stat(fullPath);
            if (now - stat.mtimeMs > CHUNK_TTL_MS) await fsPromises.unlink(fullPath);
          } catch {
            // ignore if already deleted
          }
        })
    );
  } catch {
    // ignore cleanup errors
  }
}

export async function storeChunk({ sessionId, filename, chunkIndex, totalChunks, text }) {
  // Fire-and-forget cleanup
  cleanOldFiles();

  // Write chunk content
  await fsPromises.writeFile(chunkPath(sessionId, filename, chunkIndex), text, 'utf8');

  // Update metadata atomically
  const mp = metaPath(sessionId, filename);
  let meta;
  try {
    meta = JSON.parse(await fsPromises.readFile(mp, 'utf8'));
  } catch {
    meta = { totalChunks, receivedChunks: [], createdAt: Date.now() };
  }
  if (!meta.receivedChunks.includes(chunkIndex)) {
    meta.receivedChunks.push(chunkIndex);
  }
  meta.totalChunks = totalChunks;
  await fsPromises.writeFile(mp, JSON.stringify(meta), 'utf8');

  return { buffered: true, received: meta.receivedChunks.length, total: totalChunks };
}

/**
 * Assembles complete file texts for a session.
 * Returns [{name, content}] or null if any file is missing chunks.
 */
export async function assembleFiles(sessionId, filenames) {
  const filesArray = [];

  for (const name of filenames) {
    const mp = metaPath(sessionId, name);
    let meta;
    try {
      meta = JSON.parse(await fsPromises.readFile(mp, 'utf8'));
    } catch {
      return null; // no metadata → chunks never arrived
    }

    if (meta.receivedChunks.length !== meta.totalChunks) return null;

    const parts = await Promise.all(
      Array.from({ length: meta.totalChunks }, (_, i) =>
        fsPromises.readFile(chunkPath(sessionId, name, i), 'utf8')
      )
    );
    filesArray.push({ name, content: parts.join('') });
  }

  // Cleanup all tmp files for this session
  await clearSession(sessionId, filenames);

  return filesArray;
}

export async function clearSession(sessionId, filenames = []) {
  // If no filenames given, scan for all files matching this session
  if (filenames.length === 0) {
    try {
      const all = await fsPromises.readdir(TMP_DIR);
      filenames = all
        .filter(f => f.startsWith(`etl_chunks_${sessionId}_`) && f.endsWith('_meta.json'))
        .map(f => {
          // extract filename between sessionId_ and _meta.json
          const inner = f.slice(`etl_chunks_${sessionId}_`.length, -'_meta.json'.length);
          return inner;
        });
    } catch {
      return;
    }
  }

  await Promise.all(
    filenames.flatMap(name => {
      const files = [metaPath(sessionId, name)];
      // We don't know totalChunks here, so glob-style delete by listing
      return files.map(f => fsPromises.unlink(f).catch(() => {}));
    })
  );

  // Also delete chunk files for known filenames
  try {
    const all = await fsPromises.readdir(TMP_DIR);
    await Promise.all(
      all
        .filter(f => filenames.some(name => f.startsWith(`etl_chunks_${sessionId}_${name}_`) && f.endsWith('.txt')))
        .map(f => fsPromises.unlink(path.join(TMP_DIR, f)).catch(() => {}))
    );
  } catch {
    // ignore
  }
}
