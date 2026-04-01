// ─────────────────────────────────────────────────────────────────────────────
// hybridScorer.js
// Per-article async scoring based on semantic embeddings.
//
// Pipeline per article:
//   1. Hard gate — main subject (proper noun) must appear in article text
//   2. Embedding similarity — user text vs full article (60% weight)
//   3. Title similarity    — user text vs title only   (25% weight)
//   4. Intent score        — WHO + WHAT alignment      (15% weight)
//
// Usage:
//   const result = await scoreArticleWithEmbeddings(userText, article);
//   result.isMatch     → boolean
//   result.finalScore  → 0.0 – 1.0
//   result.signals     → breakdown object for frontend
// ─────────────────────────────────────────────────────────────────────────────

const { getEmbeddingCached } = require("./embeddingCache");
const { cosineSimilarity }   = require("./embeddingEngine");
const { extractProperNouns, parseIntent, matchIntent } = require("./intentParser");

// ── Configurable thresholds ────────────────────────────────────────────────────
const THRESHOLDS = {
  // Minimum article-body embedding similarity to pass gate 2
  minEmbeddingSimilarity: parseFloat(
    process.env.SIMILARITY_THRESHOLD || "0.55"
  ),
  // Title similarity alone can pass gate 2 if above this value
  minTitleSimilarity: 0.60,
  // Enable subject-presence hard gate
  requireSubjectMatch: true,
};

// ── Main scoring function ──────────────────────────────────────────────────────
async function scoreArticleWithEmbeddings(userText, article) {
  const articleTitle   = article.title       || "";
  const articleDesc    = article.description || "";
  const articleContent = article.content     || "";

  // Build article corpus — title repeated for emphasis
  const articleFull = [
    articleTitle,
    articleTitle,   // 2× weighting on the title (core claim)
    articleDesc,
    articleContent,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .substring(0, 1000);

  const shortTitle = articleTitle.substring(0, 55);
  console.log(`\n  Scoring: "${shortTitle}"`);

  // ──────────────────────────────────────────────────────────────────────────
  // HARD GATE 1 — Subject must be present in article (cheap string search,
  // no embedding needed — rejects obviously wrong articles instantly)
  // ──────────────────────────────────────────────────────────────────────────
  const userProperNouns = extractProperNouns(userText);

  if (THRESHOLDS.requireSubjectMatch && userProperNouns.length >= 1) {
    const mainSubject  = userProperNouns[0].toLowerCase();
    const articleLower = articleFull.toLowerCase();

    if (!articleLower.includes(mainSubject)) {
      console.log(`  ❌ Hard reject: "${mainSubject}" not in article`);
      return {
        isMatch:      false,
        finalScore:   0,
        rejectReason: `Subject "${mainSubject}" missing from article`,
        signals: {
          embeddingSimilarity: 0,
          titleSimilarity:     0,
          intentScore:         0,
          subject:             false,
        },
      };
    }
    console.log(`  ✅ Subject "${mainSubject}" found`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EMBEDDING SIMILARITY
  // Compute three embeddings in parallel for speed
  // ──────────────────────────────────────────────────────────────────────────
  let userEmbedding, articleEmbedding, titleEmbedding;

  try {
    [userEmbedding, articleEmbedding, titleEmbedding] = await Promise.all([
      getEmbeddingCached(userText),
      getEmbeddingCached(articleFull),
      getEmbeddingCached(articleTitle),
    ]);
  } catch (err) {
    console.error("  Embedding error:", err.message);
    return {
      isMatch:      false,
      finalScore:   0,
      rejectReason: "Embedding computation failed",
      signals: { embeddingSimilarity: 0, titleSimilarity: 0, intentScore: 0 },
    };
  }

  // Raw cosine: -1 … +1   →   normalised: 0 … 1
  const rawEmbed   = cosineSimilarity(userEmbedding, articleEmbedding);
  const rawTitle   = cosineSimilarity(userEmbedding, titleEmbedding);
  const embeddingSim = (rawEmbed  + 1) / 2;
  const titleSim     = (rawTitle  + 1) / 2;

  console.log(`  Embedding sim: ${embeddingSim.toFixed(4)}`);
  console.log(`  Title sim:     ${titleSim.toFixed(4)}`);

  // ──────────────────────────────────────────────────────────────────────────
  // HARD GATE 2 — Reject if both main and title similarity are below thresholds
  // (passing either threshold is enough — a strongly matching title alone is
  //  sufficient to accept the article)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    embeddingSim < THRESHOLDS.minEmbeddingSimilarity &&
    titleSim     < THRESHOLDS.minTitleSimilarity
  ) {
    console.log(
      `  ❌ Below threshold — embed=${embeddingSim.toFixed(3)} title=${titleSim.toFixed(3)}`
    );
    return {
      isMatch:      false,
      finalScore:   0,
      rejectReason: `Similarity ${embeddingSim.toFixed(2)} below threshold ${THRESHOLDS.minEmbeddingSimilarity}`,
      signals: {
        embeddingSimilarity: +(embeddingSim * 100).toFixed(1),
        titleSimilarity:     +(titleSim     * 100).toFixed(1),
        intentScore:         0,
        subject:             true,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTENT SCORE (supporting signal — WHO + WHAT overlap)
  // ──────────────────────────────────────────────────────────────────────────
  const userIntent  = parseIntent(userText);
  const intentMatch = matchIntent(userIntent, articleFull);
  const intentScore = intentMatch.score;

  console.log(`  Intent score:  ${intentScore.toFixed(4)}`);

  // ──────────────────────────────────────────────────────────────────────────
  // COMBINED FINAL SCORE
  //   Embedding  60%  — core semantic meaning
  //   Title      25%  — concentrated headline claim
  //   Intent     15%  — WHO + WHAT alignment
  // ──────────────────────────────────────────────────────────────────────────
  const finalScore = Math.min(
    embeddingSim * 0.60 +
    titleSim     * 0.25 +
    intentScore  * 0.15,
    1.0
  );

  console.log(`  Final score:   ${finalScore.toFixed(4)} ✅ ACCEPTED`);

  return {
    isMatch:    true,
    finalScore,
    rejectReason: null,
    signals: {
      embeddingSimilarity: +(embeddingSim * 100).toFixed(1),
      titleSimilarity:     +(titleSim     * 100).toFixed(1),
      intentScore:         +(intentScore  * 100).toFixed(1),
      finalScore:          +(finalScore   * 100).toFixed(1),
      subject:             true,
    },
  };
}

module.exports = {
  scoreArticleWithEmbeddings,
  THRESHOLDS,
};
