// lib/crm/chunkBuffer.js
// Shared in-memory buffer for chunked CSV uploads.
// Works because Next.js dev server is a single Node.js process — same module instance
// is shared across /api/etl/upload and /api/etl/upload/finalize via Node module cache.
// NOT suitable for Vercel (stateless, isolated function instances).

const chunkBuffer = new Map();
const BUFFER_TTL_MS = 15 * 60 * 1000; // 15 minutes

function cleanOldBuffers() {
  const now = Date.now();
  for (const [key, entry] of chunkBuffer) {
    if (now - entry.createdAt > BUFFER_TTL_MS) chunkBuffer.delete(key);
  }
}

export function storeChunk({ sessionId, filename, chunkIndex, totalChunks, text, userId }) {
  cleanOldBuffers();
  if (!chunkBuffer.has(sessionId)) {
    chunkBuffer.set(sessionId, { files: new Map(), createdAt: Date.now(), userId });
  }
  const session = chunkBuffer.get(sessionId);
  if (!session.files.has(filename)) {
    session.files.set(filename, { chunks: new Map(), total: totalChunks });
  }
  session.files.get(filename).chunks.set(chunkIndex, text);
}

/**
 * Assembles complete file texts for a session.
 * Returns [{name, content}] or null if any file is missing chunks.
 */
export function assembleFiles(sessionId, filenames) {
  const session = chunkBuffer.get(sessionId);
  if (!session) return null;

  const filesArray = [];
  for (const name of filenames) {
    const entry = session.files.get(name);
    if (!entry) return null;
    if (entry.chunks.size !== entry.total) return null; // not all chunks received
    const content = Array.from({ length: entry.total }, (_, i) => entry.chunks.get(i) ?? "").join("");
    filesArray.push({ name, content });
  }
  return filesArray;
}

export function clearSession(sessionId) {
  chunkBuffer.delete(sessionId);
}
