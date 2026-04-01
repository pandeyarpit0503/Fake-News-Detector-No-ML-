const path = require("path");
require("dotenv").config();

// Configure cache dir BEFORE importing pipeline
// (env must be set before the module initialises)
let pipelineImport = null;

async function getPipeline() {
  if (!pipelineImport) {
    // Dynamic import — @xenova/transformers is an ESM-only package
    // We load it lazily so the require() at the top of server.js still works
    const mod = await import("@xenova/transformers");
    mod.env.cacheDir =
      process.env.EMBEDDING_CACHE_DIR ||
      path.join(__dirname, "../.model_cache");
    pipelineImport = mod;
  }
  return pipelineImport;
}

// Singleton pipeline — load model ONCE at startup, reuse for all requests
let embedder         = null;
let modelLoadPromise = null;
let modelLoaded      = false;

async function loadModel() {
  if (modelLoaded && embedder) return embedder;

  // Prevent multiple simultaneous loads
  if (modelLoadPromise) return modelLoadPromise;

  const modelName =
    process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

  console.log("\nLoading embedding model...");
  console.log("Model:", modelName);
  console.log(
    "(First run downloads ~90MB — subsequent runs use local cache)\n"
  );

  modelLoadPromise = getPipeline()
    .then(({ pipeline, env }) => {
      console.log("Cache dir:", env.cacheDir);
      return pipeline("feature-extraction", modelName, {
        quantized: true, // 4× faster, ~25 MB on disk
        progress_callback: (p) => {
          if (p.status === "downloading") {
            const pct = p.total
              ? Math.round((p.loaded / p.total) * 100)
              : "?";
            process.stdout.write(`\rDownloading model: ${pct}%   `);
          }
          if (p.status === "done") process.stdout.write("\n");
        },
      });
    })
    .then((pipe) => {
      embedder    = pipe;
      modelLoaded = true;
      console.log("✅ Embedding model loaded and ready\n");
      return embedder;
    })
    .catch((err) => {
      console.error("❌ Model load failed:", err.message);
      modelLoadPromise = null; // allow retry
      throw err;
    });

  return modelLoadPromise;
}

// ── Generate a single embedding vector ────────────────────────────────────────
// Returns a plain Array of 384 numbers (Float32Array → Array for JSON safety)
async function getEmbedding(text) {
  const pipe = await loadModel();

  const clean = text
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 512); // character limit (model processes ~256 tokens)

  const output = await pipe(clean, {
    pooling:   "mean", // mean-pool over token embeddings
    normalize: true,   // L2-normalise → dot product ≡ cosine similarity
  });

  return Array.from(output.data);
}

// ── Batch embeddings (more efficient than sequential loop) ────────────────────
async function getEmbeddingsBatch(texts) {
  const pipe = await loadModel();

  return Promise.all(
    texts.map(async (text) => {
      const clean = text.replace(/\s+/g, " ").trim().substring(0, 512);
      const out   = await pipe(clean, { pooling: "mean", normalize: true });
      return Array.from(out.data);
    })
  );
}

// ── Cosine similarity between two 384-dim vectors ─────────────────────────────
// Returns -1.0 … +1.0  (higher = more semantically similar)
// When vectors are already L2-normalised, dot product == cosine similarity,
// but we compute the full formula for safety against non-normalised inputs.
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot  = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── High-level similarity between two raw text strings ────────────────────────
// Returns 0.0 … 1.0 (cosine -1..1 normalised to 0..1)
async function semanticSimilarity(text1, text2) {
  try {
    const [v1, v2] = await getEmbeddingsBatch([text1, text2]);
    const raw      = cosineSimilarity(v1, v2);  // -1 … 1
    return (raw + 1) / 2;                        // → 0 … 1
  } catch (err) {
    console.error("semanticSimilarity error:", err.message);
    return 0;
  }
}

// ── Preload at server startup ─────────────────────────────────────────────────
async function preloadModel() {
  try {
    await loadModel();
    return true;
  } catch (err) {
    console.error("Model preload failed:", err.message);
    return false;
  }
}

module.exports = {
  getEmbedding,
  getEmbeddingsBatch,
  cosineSimilarity,
  semanticSimilarity,
  preloadModel,
  loadModel,
};
