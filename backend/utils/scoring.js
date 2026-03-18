const { keywordScore } = require("./similarity");
const { getSourceInfo, sourceCountBoost } = require("./sources");
const { contradictionPenalty, numberMismatchPenalty } = require("./contradiction");
const { recencyMultiplier } = require("./recency");

/**
 * Score a single article against the user's claim.
 * Returns a score object with the total and individual signal values.
 */
function scoreArticle(article, userText) {
    const articleText = `${article.title || ""} ${article.description || ""}`;
    const sourceInfo = getSourceInfo(article.url || "");

    const kwScore        = keywordScore(userText, articleText);           // 0–40
    const srcWeight      = sourceInfo.weight;                             // 0.0–1.0
    const contrPenalty   = contradictionPenalty(userText, articleText);   // 0 or -30
    const numPenalty     = numberMismatchPenalty(userText, articleText);  // 0 to -20
    const recencyMult    = recencyMultiplier(article.publishedAt);        // 0.4–1.0

    // Raw article score (0 to ~40, pre-source weighting)
    const rawScore = (kwScore + contrPenalty + numPenalty) * recencyMult;
    const articleScore = rawScore * srcWeight;

    return {
        article,
        score: articleScore,
        sourceInfo,
        signals: {
            keywordScore: +kwScore.toFixed(2),
            sourceWeight: srcWeight,
            contradictionPenalty: contrPenalty,
            numberPenalty: numPenalty,
            recencyMultiplier: recencyMult,
            entityScore: 0,
        },
    };
}

/**
 * Calculate a bonus from Google Fact Check results.
 * Returns a value between -20 and +20.
 */
function factCheckBonus(claims) {
    if (!claims || claims.length === 0) return 0;

    const POSITIVE_RATINGS = ["true", "correct", "accurate", "mostly true", "confirmed"];
    const NEGATIVE_RATINGS = ["false", "incorrect", "misleading", "fake", "debunked", "pants on fire", "mostly false"];

    let bonus = 0;
    for (const claim of claims.slice(0, 3)) {
        const rating = (claim.claimReview?.[0]?.textualRating || "").toLowerCase();
        if (POSITIVE_RATINGS.some(r => rating.includes(r))) bonus += 7;
        else if (NEGATIVE_RATINGS.some(r => rating.includes(r))) bonus -= 10;
    }

    return Math.max(-20, Math.min(20, bonus));
}

/**
 * Master scoring function.
 * @param {Array} gnewsArticles - Articles from GNews API
 * @param {Array} factCheckClaims - Claims from Google Fact Check API
 * @param {string} userText - The user's news headline
 * @returns {{ score, scoredArticles, confirmedCount, countBoost, factBonus }}
 */
function getMasterScore(gnewsArticles, factCheckClaims, userText) {
    if (!gnewsArticles || gnewsArticles.length === 0) {
        const fBonus = factCheckBonus(factCheckClaims);
        const base = 30; // no corroborating sources found — assume low trust
        const score = Math.max(0, Math.min(100, base + fBonus));
        return { score, scoredArticles: [], confirmedCount: 0, countBoost: 0, factBonus: fBonus };
    }

    // Score each article
    const scoredArticles = gnewsArticles.map(a => scoreArticle(a, userText));

    // A "confirmed" article is one with a positive score above threshold
    const confirmedArticles = scoredArticles.filter(a => a.score > 5);
    const confirmedCount = confirmedArticles.length;

    // Average score of top confirmed articles (0–40 range)
    const topScores = scoredArticles
        .map(a => a.score)
        .sort((a, b) => b - a)
        .slice(0, 5);

    const avgScore = topScores.length > 0
        ? topScores.reduce((s, v) => s + v, 0) / topScores.length
        : 0;

    // Normalise to 0–70 base trust range
    const baseTrust = Math.min(70, (avgScore / 40) * 70);

    // Apply boosts
    const countBoost = sourceCountBoost(confirmedCount);
    const fBonus = factCheckBonus(factCheckClaims);

    const finalScore = Math.max(0, Math.min(100, baseTrust + countBoost + fBonus));

    return {
        score: +finalScore.toFixed(1),
        scoredArticles,
        confirmedCount,
        countBoost,
        factBonus: fBonus,
    };
}

/**
 * Convert numeric trust score to a human-readable verdict object.
 * @param {number} score - 0 to 100
 * @returns {{ label, color }}
 */
function getVerdict(score) {
    if (score >= 70) return { label: "REAL",                color: "#22c55e" };
    if (score >= 45) return { label: "PARTIALLY CORRECT",   color: "#f59e0b" };
    if (score >= 20) return { label: "FAKE / MISLEADING",   color: "#ef4444" };
    return              { label: "UNVERIFIED",              color: "#94a3b8" };
}

module.exports = { getMasterScore, getVerdict };
