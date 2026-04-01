// ─────────────────────────────────────────────────────────────────────────────
// articleValidator.js  (LAYER 2 — v2)
// Strict gate — every article MUST pass checks before entering the scorer.
//
//   CHECK 1: Subject presence  (proper noun must appear in article)
//   CHECK 2: Title word overlap (must share 2+ meaningful words with user
//            input; OR if only 1 word overlaps it must NOT be a generic term)
//   CHECK 3: Topic mismatch   (NEW — rejects cross-domain articles)
//   CHECK 4: Embedding similarity (semantic — cosine must exceed threshold)
//   CHECK 5: Contradiction detection
//
// The Kareena Kapoor / India problem is solved by CHECK 2 + 3:
//   India wins cricket ≠ Kareena Kapoor interview
//   "india" is in GENERIC_SUBJECTS → single overlap is not enough
//   Topic of user=SPORTS, topic of article=ENTERTAINMENT → rejected
// ─────────────────────────────────────────────────────────────────────────────

const { extractRequiredTerms } = require("./smartQueryBuilder");
const { cosineSimilarity }     = require("./embeddingEngine");
const { getEmbeddingCached }   = require("./embeddingCache");
const { detectTopic }          = require("./topicDetect");

// Generic terms that are too broad to serve as sole subject match
// e.g. "india", "us", "world" appear in almost every article
const GENERIC_SUBJECTS = new Set([
  "india", "us", "usa", "china", "pakistan", "russia", "world",
  "government", "people", "news", "report", "official", "year",
  "time", "state", "national", "international", "global", "new",
]);

// Topic compatibility matrix — which topics can confirm which
// (cross-domain articles almost never confirm the same news)
const COMPATIBLE_TOPICS = {
  SPORTS:    new Set(["SPORTS", "GENERAL"]),
  POLITICS:  new Set(["POLITICS", "CRIME", "GENERAL"]),
  CRIME:     new Set(["CRIME", "POLITICS", "GENERAL"]),
  FINANCE:   new Set(["FINANCE", "GENERAL"]),
  HEALTH:    new Set(["HEALTH", "SCIENCE", "GENERAL"]),
  SCIENCE:   new Set(["SCIENCE", "HEALTH", "GENERAL"]),
  DISASTER:  new Set(["DISASTER", "GENERAL"]),
  GENERAL:   new Set(["SPORTS", "POLITICS", "CRIME", "FINANCE", "HEALTH", "SCIENCE", "DISASTER", "GENERAL"]),
};

// Per-request cache
let _cachedTerms     = null;
let _cachedTermsText = "";
let _userTopicCache  = null;

function getRequiredTermsCached(userText) {
  const key = userText.trim().toLowerCase().substring(0, 200);
  if (_cachedTermsText === key && _cachedTerms) return _cachedTerms;
  _cachedTerms     = extractRequiredTerms(userText);
  _cachedTermsText = key;
  return _cachedTerms;
}

function getUserTopicCached(userText) {
  if (!_userTopicCache) {
    _userTopicCache = detectTopic(userText);
  }
  return _userTopicCache;
}

function clearRequestCache() {
  _cachedTerms     = null;
  _cachedTermsText = "";
  _userTopicCache  = null;
}

// ── Main validation function ──────────────────────────────────────────────────
async function validateArticle(userText, article) {
  const articleTitle = (article.title       || "").toLowerCase();
  const articleDesc  = (article.description || "").toLowerCase();
  const articleFull  = `${articleTitle} ${articleDesc}`;
  const userLower    = userText.toLowerCase();
  const shortTitle   = (article.title || "").substring(0, 60);

  console.log(`\n  Validating: "${shortTitle}"`);

  // ─── CHECK 1: SUBJECT PRESENCE ────────────────────────────────────────────
  const required = getRequiredTermsCached(userText);

  if (required.anyOf_subjects.length > 0) {
    const subjectFound = required.anyOf_subjects.some(
      subject => articleFull.includes(subject)
    );

    if (!subjectFound) {
      const reason = `None of [${required.anyOf_subjects.join(", ")}] in article`;
      console.log(`  ❌ FAIL (subject): ${reason}`);
      return { pass: false, reason, score: 0 };
    }
    console.log(`  ✅ Subject found`);
  }

  // ─── CHECK 2: TITLE WORD OVERLAP ──────────────────────────────────────────
  // Build user word-set (length > 3, not a stopword)
  const userWords = new Set(
    userLower
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3)
  );

  const titleWords = articleTitle
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3);

  const overlappingWords = titleWords.filter(w => userWords.has(w));
  const titleOverlap     = overlappingWords.length;

  // Count how many overlapping words are NOT generic
  const specificOverlap = overlappingWords.filter(
    w => !GENERIC_SUBJECTS.has(w)
  ).length;

  console.log(
    `  Title overlap: ${titleOverlap} words (${specificOverlap} specific: [${overlappingWords.join(", ")}])`
  );

  if (titleOverlap === 0) {
    // Zero overlap → always reject
    const reason = "Zero word overlap between article title and user input";
    console.log(`  ❌ FAIL (title): ${reason}`);
    return { pass: false, reason, score: 0 };
  }

  if (specificOverlap === 0 && titleOverlap <= 1) {
    // Only generic words overlap (e.g. just "india", "world") → reject
    const reason = `Only generic words overlap: [${overlappingWords.join(", ")}]`;
    console.log(`  ❌ FAIL (generic overlap): ${reason}`);
    return { pass: false, reason, score: 0 };
  }

  // ─── CHECK 3: TOPIC MISMATCH ──────────────────────────────────────────────
  // If both user and article have a strong topic signal, they must be compatible
  const userTopic    = getUserTopicCached(userText);
  const articleTopic = detectTopic(`${article.title || ""} ${article.description || ""}`);

  if (
    userTopic.topic    !== "GENERAL" && userTopic.confidence    >= 2 &&
    articleTopic.topic !== "GENERAL" && articleTopic.confidence >= 2 &&
    userTopic.topic !== articleTopic.topic
  ) {
    const compatible = COMPATIBLE_TOPICS[userTopic.topic];
    if (!compatible || !compatible.has(articleTopic.topic)) {
      const reason = `Topic mismatch: user=${userTopic.topic}, article=${articleTopic.topic}`;
      console.log(`  ❌ FAIL (topic): ${reason}`);
      return { pass: false, reason, score: 0 };
    }
  }

  if (articleTopic.topic !== "GENERAL") {
    console.log(`  ✅ Topic ok: user=${userTopic.topic} / article=${articleTopic.topic}`);
  }

  // ─── CHECK 4: EMBEDDING SIMILARITY ────────────────────────────────────────
  let embeddingScore = 0;
  try {
    const userVec  = await getEmbeddingCached(userText);
    const titleVec = await getEmbeddingCached(article.title || "");
    const fullText = `${article.title || ""} ${article.description || ""}`.substring(0, 500);
    const fullVec  = await getEmbeddingCached(fullText);

    const titleSim = (cosineSimilarity(userVec, titleVec) + 1) / 2;
    const fullSim  = (cosineSimilarity(userVec, fullVec)  + 1) / 2;

    // Weight: average (not max) — both must be somewhat close
    // Using max let marginal articles slip through on title alone
    const weightedSim = titleSim * 0.55 + fullSim * 0.45;
    embeddingScore    = weightedSim;

    console.log(
      `  Embedding: title=${titleSim.toFixed(3)} full=${fullSim.toFixed(3)} weighted=${embeddingScore.toFixed(3)}`
    );

    const minThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD || "0.60");

    if (embeddingScore < minThreshold) {
      const reason = `Weighted embedding ${embeddingScore.toFixed(3)} < threshold ${minThreshold}`;
      console.log(`  ❌ FAIL (embedding): ${reason}`);
      return { pass: false, reason, score: embeddingScore };
    }
    console.log(`  ✅ Embedding passed: ${embeddingScore.toFixed(3)}`);
  } catch (embErr) {
    console.error("  ⚠️ Embedding check failed:", embErr.message);
    if (specificOverlap < 2) {
      return {
        pass: false,
        reason: "Embedding unavailable + insufficient specific title overlap",
        score: 0,
      };
    }
    embeddingScore = specificOverlap * 0.15;
  }

  // ─── CHECK 5: CONTRADICTION DETECTION ─────────────────────────────────────
  const contradiction = detectContradiction(userLower, articleFull);
  if (contradiction.isContradicting) {
    console.log(`  ⚠️ Contradiction: ${contradiction.reason}`);
    return {
      pass:            true,
      reason:          "Contradicting source",
      score:           embeddingScore,
      isContradicting: true,
    };
  }

  console.log(`  ✅ ACCEPTED (score: ${embeddingScore.toFixed(3)})`);
  return {
    pass:            true,
    reason:          "All checks passed",
    score:           embeddingScore,
    isContradicting: false,
  };
}

// ── Contradiction detector ────────────────────────────────────────────────────
function detectContradiction(userText, articleText) {
  const OPPOSING_PAIRS = [
    [["wins", "won", "victory", "beats", "defeats"],
     ["loses", "lost", "defeat", "fails", "beaten"]],
    [["alive", "survives", "recovers", "lives"],
     ["dies", "dead", "killed", "passed away", "deceased"]],
    [["rises", "increases", "gains", "surges", "soars"],
     ["falls", "decreases", "drops", "plunges", "crashes"]],
    [["confirmed", "true", "verified", "accurate"],
     ["denied", "false", "fake", "debunked", "wrong"]],
  ];

  for (const [positiveTerms, negativeTerms] of OPPOSING_PAIRS) {
    const userPos = positiveTerms.some(t => userText.includes(t));
    const userNeg = negativeTerms.some(t => userText.includes(t));
    const artPos  = positiveTerms.some(t => articleText.includes(t));
    const artNeg  = negativeTerms.some(t => articleText.includes(t));

    if (userPos && artNeg && !artPos) {
      return { isContradicting: true, reason: "User positive → article negative" };
    }
    if (userNeg && artPos && !artNeg) {
      return { isContradicting: true, reason: "User negative → article positive" };
    }
  }
  return { isContradicting: false };
}

module.exports = {
  validateArticle,
  clearRequestCache,
  detectContradiction,
};
