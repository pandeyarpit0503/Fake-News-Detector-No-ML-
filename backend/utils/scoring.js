const { keywordScore }          = require("./similarity");
const { scoreEntityMatch }      = require("./entities");
const { contradictionPenalty,
        numberMismatchPenalty } = require("./contradiction");
const { recencyMultiplier }     = require("./recency");
const { getSourceInfo }         = require("./sources");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Score a single article vs. the user's news claim
// Returns confidence 0.0 → 1.0 plus full signal breakdown
// ─────────────────────────────────────────────────────────────────────────────
function scoreArticle(userText, article) {
    const articleText = [
        article.title       || "",
        article.description || "",
        article.content     || "",
    ].join(" ");

    const sourceInfo = getSourceInfo(article.url);

    // Signal A: body keyword similarity (Jaccard, 0–40 raw → 0–1.0)
    // News articles rarely share >30% words, so we boost with a 2.8x curve:
    //   10% overlap → 0.28, 15% → 0.42, 20% → 0.56, 25% → 0.70, 30% → 0.84
    const rawJaccard     = keywordScore(userText, articleText) / 40;
    const boostedJaccard = Math.min(rawJaccard * 2.8, 1.0);

    // Signal B: title-only quick match (worth more — title IS the core claim)
    const titleText    = article.title || "";
    const titleJaccard = keywordScore(userText, titleText) / 40;
    const titleBoosted = Math.min(titleJaccard * 3.5, 1.0);

    // Signal C: named entity match — returns 0–20, normalize to 0–1
    const entityNorm = Math.min(scoreEntityMatch(userText, articleText) / 20, 1.0);

    // Combine: title 40%, body 35%, entity 25%
    const rawConfidence =
        (titleBoosted   * 0.40) +
        (boostedJaccard * 0.35) +
        (entityNorm     * 0.25);

    // Signal D: contradiction — only fires when BOTH title AND body contradict
    const titleContra = contradictionPenalty(userText, titleText);
    const bodyContra  = contradictionPenalty(userText, articleText);
    let contradictionFactor = 0;
    if (titleContra < 0 && bodyContra < 0) {
        contradictionFactor = -0.50; // both contradict → strong flip
    } else if (titleContra < 0) {
        contradictionFactor = -0.20; // title-only → mild
    }

    // Signal E: number mismatch (0 to −20 points → normalize to 0 to −0.20)
    const numFactor = numberMismatchPenalty(userText, articleText) / 100;

    const adjustedConfidence = Math.max(0,
        rawConfidence + contradictionFactor + numFactor
    );

    // Signal F: recency multiplier
    const recency = recencyMultiplier(article.publishedAt);

    // Signal G: source tier weight
    // Applied at 60% so a bad source doesn't completely kill a keyword match
    const tierWeight = sourceInfo.weight;
    const finalConfidence = Math.min(
        adjustedConfidence * recency * (0.40 + tierWeight * 0.60),
        1.0
    );

    return {
        article,
        confidence: finalConfidence,
        sourceInfo,
        // Threshold to count as "confirming" — 20% confidence means real coverage
        isConfirming: adjustedConfidence >= 0.20,
        signals: {
            titleMatch:          +(titleBoosted   * 100).toFixed(1),
            bodyMatch:           +(boostedJaccard * 100).toFixed(1),
            entityMatch:         +(entityNorm     * 100).toFixed(1),
            rawConfidence:       +(rawConfidence  * 100).toFixed(1),
            contradictionFactor: +(contradictionFactor * 100).toFixed(1),
            numberFactor:        +(numFactor      * 100).toFixed(1),
            recency,
            tierWeight,
            finalConfidence:     +(finalConfidence * 100).toFixed(1),
            // legacy aliases used by frontend SourceCard
            keywordScore:        +(boostedJaccard * 100).toFixed(1),
            entityScore:         +(entityNorm     * 100).toFixed(1),
            contradictionPenalty: titleContra < 0 ? -20 : 0,
            numberPenalty:        numberMismatchPenalty(userText, articleText),
            recencyMultiplier:    recency,
            sourceWeight:         tierWeight,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Source-count-based score RANGE system
//
// The number of confirming sources SETS the score range;
// average confidence FILLS within that range.
//
//  0 sources  →  0 – 25
//  1 source   → 15 – 39
//  2 sources  → 35 – 54
//  3 sources  → 48 – 68
//  4 sources  → 62 – 79
//  5 sources  → 70 – 87
//  6+ sources → 75 – 93
// Each Tier-1 source adds +3 to both floor and ceiling (max +12).
// ─────────────────────────────────────────────────────────────────────────────
function getScoreFromSources(confirmedCount, tier1Count, avgConfidence) {
    const tier1Bonus = Math.min(tier1Count * 3, 12);

    const RANGES = [
        [0,  25],   // 0 sources
        [15, 39],   // 1 source
        [35, 54],   // 2 sources
        [48, 68],   // 3 sources
        [62, 79],   // 4 sources
        [70, 87],   // 5 sources
    ];

    const [floor, ceiling] = confirmedCount >= 6
        ? [75, 93]
        : (RANGES[confirmedCount] || [0, 25]);

    const adjFloor   = Math.min(floor   + tier1Bonus, 95);
    const adjCeiling = Math.min(ceiling + tier1Bonus, 98);

    const rangeScore = adjFloor + (avgConfidence * (adjCeiling - adjFloor));

    return {
        score: Math.round(rangeScore * 10) / 10,
        floor: adjFloor,
        ceiling: adjCeiling,
        tier1Bonus,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Fact Check bonus/penalty (-25 → +18)
// ─────────────────────────────────────────────────────────────────────────────
function calculateFactCheckBonus(claims) {
    if (!claims || claims.length === 0) return 0;

    const RATINGS = {
        "true":           +18,
        "correct":        +18,
        "accurate":       +18,
        "mostly true":    +12,
        "mostly correct": +12,
        "half true":      +5,
        "mixture":        +4,
        "partially":      +4,
        "mostly false":   -12,
        "false":          -20,
        "incorrect":      -18,
        "misleading":     -12,
        "pants on fire":  -25,
        "inaccurate":     -15,
        "unverified":     0,
        "unproven":       0,
    };

    let totalBonus = 0;
    let claimCount = 0;

    claims.forEach(claim => {
        (claim.claimReview || []).forEach(review => {
            const rating = (review.textualRating || "").toLowerCase().trim();
            for (const [key, val] of Object.entries(RATINGS)) {
                if (rating.includes(key)) {
                    totalBonus += val;
                    claimCount++;
                    break;
                }
            }
        });
    });

    if (claimCount === 0) return 0;
    return Math.max(-25, Math.min(18, totalBonus / claimCount));
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: MASTER SCORE FUNCTION — called from routes/verify.js
// ─────────────────────────────────────────────────────────────────────────────
function getMasterScore(articles, factCheckClaims, userText) {
    // Case: no articles at all
    if (!articles || articles.length === 0) {
        const factBonus = calculateFactCheckBonus(factCheckClaims);
        console.log("No articles found. Fact bonus:", factBonus);

        const score = factBonus >= 12
            ? Math.min(45 + factBonus, 65)
            : Math.max(0, factBonus + 10);

        return {
            score,
            confirmedCount: 0, tier1Count: 0,
            avgConfidence: 0,  factBonus,
            scoredArticles: [], countBoost: 0,
            scoreRange: { floor: 0, ceiling: 25 },
        };
    }

    // Score every article
    const scoredArticles = articles.map(a => scoreArticle(userText, a));

    // Debug log
    console.log("=== ARTICLE SCORES ===");
    scoredArticles.forEach((a, i) => {
        console.log(
            `  [${i + 1}] "${(a.article.title || "").substring(0, 55)}"` +
            ` | conf: ${(a.confidence * 100).toFixed(1)}%` +
            ` | confirming: ${a.isConfirming}` +
            ` | tier: ${a.sourceInfo.tier} (${a.sourceInfo.domain})`
        );
    });

    // Count confirming sources
    const confirmingArticles = scoredArticles.filter(a => a.isConfirming);
    const confirmedCount     = confirmingArticles.length;
    const tier1Count         = confirmingArticles.filter(a => a.sourceInfo.tier === 1).length;

    console.log(
        `=== SOURCES: ${confirmedCount} confirming` +
        ` (${tier1Count} Tier-1) out of ${articles.length} total ===`
    );

    // Average confidence of confirming articles only
    const avgConfidence = confirmedCount > 0
        ? confirmingArticles.reduce((s, a) => s + a.confidence, 0) / confirmedCount
        : 0;

    console.log(`Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    // Get source-count-based score range
    const sourceScore = getScoreFromSources(confirmedCount, tier1Count, avgConfidence);
    console.log(`Score range: ${sourceScore.floor} – ${sourceScore.ceiling}, base: ${sourceScore.score}`);

    // Fact check bonus
    const factBonus = calculateFactCheckBonus(factCheckClaims);
    console.log("Fact check bonus:", factBonus);

    // Final score
    let finalScore = sourceScore.score + factBonus;

    // Safety floors
    if (confirmedCount >= 4 && finalScore < 60) {
        finalScore = 60;
        console.log("Safety floor: 4+ sources → min 60");
    }
    if (confirmedCount >= 5 && finalScore < 70) {
        finalScore = 70;
        console.log("Safety floor: 5+ sources → min 70");
    }

    finalScore = Math.max(0, Math.min(97, finalScore));
    console.log(`=== FINAL TRUST SCORE: ${finalScore} ===`);

    return {
        score:          +finalScore.toFixed(1),
        confirmedCount,
        tier1Count,
        avgConfidence:  +avgConfidence.toFixed(3),
        factBonus:      +factBonus.toFixed(1),
        countBoost:     sourceScore.tier1Bonus,
        scoreRange:     { floor: sourceScore.floor, ceiling: sourceScore.ceiling },
        scoredArticles,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: VERDICT ENGINE  — now receives confirmedCount for descriptions
// ─────────────────────────────────────────────────────────────────────────────
function getVerdict(score, confirmedCount = 0) {
    if (score === 0 && confirmedCount === 0) return {
        label:       "UNVERIFIED",
        color:       "gray",
        icon:        "❓",
        description: "No matching sources found. Cannot verify this news.",
        confidence:  "very low",
    };
    if (score >= 70) return {
        label:       "REAL",
        color:       "green",
        icon:        "✅",
        description: `Confirmed by ${confirmedCount} trusted source${confirmedCount !== 1 ? "s" : ""}.`,
        confidence:  score >= 85 ? "very high" : "high",
    };
    if (score >= 40) return {
        label:       "PARTIALLY CORRECT",
        color:       "orange",
        icon:        "⚠️",
        description: `Some aspects confirmed by ${confirmedCount} source${confirmedCount !== 1 ? "s" : ""}, but key details may differ.`,
        confidence:  "moderate",
    };
    return {
        label:       "FAKE / MISLEADING",
        color:       "red",
        icon:        "❌",
        description: "Could not be confirmed by trusted news sources.",
        confidence:  "low",
    };
}

module.exports = { getMasterScore, getVerdict, scoreArticle };
