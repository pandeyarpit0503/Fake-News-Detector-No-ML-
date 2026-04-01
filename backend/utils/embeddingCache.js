// ─────────────────────────────────────────────────────────────────────────────
// embeddingCache.js
// Two-level embedding cache:
//   Level 1 — in-memory Map  (current process lifetime, ~instant)
//   Level 2 — MySQL table    (persists across restarts,  ~1-2 ms)
//
// This avoids recomputing embeddings for the same text multiple times.
// Embedding the same article title in 10 different requests costs nothing
// after the first computation.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const pool   = require("../db/connection");

// Level-1: in-process Map (cleared on restart)
const memoryCache = new Map();

// ── Key derivation ─────────────────────────────────────────────────────────────
function getCacheKey(text) {
  return crypto
    .createHash("md5")
    .update(text.trim().toLowerCase())
    .digest("hex");
}

// ── Read: memory → DB → null ──────────────────────────────────────────────────
async function getCachedEmbedding(text) {
  const key = getCacheKey(text);

  // Level-1 hit
  if (memoryCache.has(key)) return memoryCache.get(key);

  // Level-2 hit
  try {
    const [rows] = await pool.query(
      "SELECT embedding_vector FROM embedding_cache WHERE text_hash = ?",
      [key]
    );
    if (rows[0]?.embedding_vector) {
      const vector = JSON.parse(rows[0].embedding_vector);
      memoryCache.set(key, vector); // promote to level-1
      return vector;
    }
  } catch {
    // Table might not exist yet — silently ignore
  }

  return null;
}

// ── Write: both levels ────────────────────────────────────────────────────────
async function setCachedEmbedding(text, vector) {
  const key = getCacheKey(text);

  // Always write level-1
  memoryCache.set(key, vector);

  // Best-effort level-2 write (silently skip on any DB error)
  try {
    await pool.query(
      `INSERT INTO embedding_cache
         (text_hash, text_preview, embedding_vector)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         embedding_vector = VALUES(embedding_vector),
         updated_at       = CURRENT_TIMESTAMP`,
      [key, text.substring(0, 100), JSON.stringify(vector)]
    );
  } catch {
    // Ignore — cache is a best-effort optimisation
  }
}

// ── Get-or-compute ────────────────────────────────────────────────────────────
// Main entry point called by hybridScorer
async function getEmbeddingCached(text) {
  const hit = await getCachedEmbedding(text);
  if (hit) return hit;

  // Compute fresh embedding
  const { getEmbedding } = require("./embeddingEngine");
  const vector = await getEmbedding(text);

  // Persist asynchronously — don't await to keep the hot path fast
  setCachedEmbedding(text, vector).catch(() => {});

  return vector;
}

module.exports = {
  getCachedEmbedding,
  setCachedEmbedding,
  getEmbeddingCached,
  getCacheKey,
};
