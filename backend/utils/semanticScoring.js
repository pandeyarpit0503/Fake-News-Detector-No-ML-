const { contradictionPenalty, numberMismatchPenalty } = require("./contradiction");
const { recencyMultiplier } = require("./recency");
const { getSourceInfo } = require("./sources");
const { getEmbeddingCached } = require("./embeddingCache");
const { cosineSimilarity } = require("./embeddingEngine");
const { parseIntent, matchIntent } = require("./intentParser");
const { buildArticleSemanticText, normalizeSimilarity } = require("./semanticSearch");

const CONFIRMING_THRESHOLD = parseFloat(
    process.env.SEMANTIC_CONFIRM_THRESHOLD || "0.58"
);

async function scoreArticle(userText, article, shared = {}) {
    const articleText = buildArticleSemanticText(article);
    const sourceInfo = getSourceInfo(article.url || "");
    const recency = recencyMultiplier(article.publishedAt);
    const userEmbedding = shared.userEmbedding || await getEmbeddingCached(userText);
    const userIntent = shared.userIntent || parseIntent(userText);

    const articleEmbedding = article._semanticEmbedding || await getEmbeddingCached(articleText);
    const titleEmbedding = article._titleEmbedding || await getEmbeddingCached(article.title || articleText);

    const semanticScore = typeof article._semanticSimilarity === "number"
        ? article._semanticSimilarity
        : normalizeSimilarity(cosineSimilarity(userEmbedding, articleEmbedding));

    const titleSemanticScore = typeof article._titleSemanticSimilarity === "number"
        ? article._titleSemanticSimilarity
        : normalizeSimilarity(cosineSimilarity(userEmbedding, titleEmbedding));

    const intentScore = matchIntent(userIntent, articleText).score;

    const semanticConfidence =
        semanticScore * 0.68 +
        titleSemanticScore * 0.17 +
        intentScore * 0.15;

    const titleContra = contradictionPenalty(userText, article.title || "");
    const bodyContra = contradictionPenalty(userText, articleText);

    let contradictionFactor = 0;
    if (titleContra < 0 && bodyContra < 0) {
        contradictionFactor = -0.50;
    } else if (titleContra < 0) {
        contradictionFactor = -0.20;
    }

    const numberFactor = numberMismatchPenalty(userText, articleText) / 100;
    const adjustedConfidence = Math.max(
        0,
        semanticConfidence + contradictionFactor + numberFactor
    );

    const finalConfidence = Math.min(
        adjustedConfidence * recency * (0.45 + sourceInfo.weight * 0.55),
        1
    );

    return {
        article,
        confidence: finalConfidence,
        sourceInfo,
        isConfirming:
            adjustedConfidence >= CONFIRMING_THRESHOLD ||
            semanticScore >= CONFIRMING_THRESHOLD,
        signals: {
            semanticScore: +(semanticScore * 100).toFixed(1),
            titleSemanticScore: +(titleSemanticScore * 100).toFixed(1),
            intentScore: +(intentScore * 100).toFixed(1),
            rawConfidence: +(semanticConfidence * 100).toFixed(1),
            contradictionFactor: +(contradictionFactor * 100).toFixed(1),
            numberFactor: +(numberFactor * 100).toFixed(1),
            recencyMultiplier: recency,
            sourceWeight: sourceInfo.weight,
            finalConfidence: +(finalConfidence * 100).toFixed(1),
            keywordScore: +(semanticScore * 100).toFixed(1),
            entityScore: +(intentScore * 100).toFixed(1),
            contradictionPenalty: titleContra < 0 ? -20 : 0,
            numberPenalty: numberMismatchPenalty(userText, articleText),
        },
    };
}

function getScoreFromSources(confirmedCount, tier1Count, avgConfidence) {
    const tier1Bonus = Math.min(tier1Count * 3, 12);

    const ranges = [
        [0, 25],
        [15, 39],
        [35, 54],
        [48, 68],
        [62, 79],
        [70, 87],
    ];

    const [floor, ceiling] = confirmedCount >= 6
        ? [75, 93]
        : (ranges[confirmedCount] || [0, 25]);

    const adjustedFloor = Math.min(floor + tier1Bonus, 95);
    const adjustedCeiling = Math.min(ceiling + tier1Bonus, 98);

    return {
        score: Math.round((adjustedFloor + (avgConfidence * (adjustedCeiling - adjustedFloor))) * 10) / 10,
        floor: adjustedFloor,
        ceiling: adjustedCeiling,
        tier1Bonus,
    };
}

function calculateFactCheckBonus(claims) {
    if (!claims || claims.length === 0) return 0;

    const ratings = {
        "true": +18,
        "correct": +18,
        "accurate": +18,
        "mostly true": +12,
        "mostly correct": +12,
        "half true": +5,
        "mixture": +4,
        "partially": +4,
        "mostly false": -12,
        "false": -20,
        "incorrect": -18,
        "misleading": -12,
        "pants on fire": -25,
        "inaccurate": -15,
        "unverified": 0,
        "unproven": 0,
    };

    let totalBonus = 0;
    let reviewCount = 0;

    claims.forEach((claim) => {
        (claim.claimReview || []).forEach((review) => {
            const rating = (review.textualRating || "").toLowerCase().trim();
            for (const [key, value] of Object.entries(ratings)) {
                if (rating.includes(key)) {
                    totalBonus += value;
                    reviewCount++;
                    break;
                }
            }
        });
    });

    if (reviewCount === 0) return 0;
    return Math.max(-25, Math.min(18, totalBonus / reviewCount));
}

async function getMasterScore(articles, factCheckClaims, userText) {
    if (!articles || articles.length === 0) {
        const factBonus = calculateFactCheckBonus(factCheckClaims);
        const score = factBonus >= 12
            ? Math.min(45 + factBonus, 65)
            : Math.max(0, factBonus + 10);

        return {
            score,
            confirmedCount: 0,
            tier1Count: 0,
            avgConfidence: 0,
            factBonus,
            scoredArticles: [],
            countBoost: 0,
            scoreRange: { floor: 0, ceiling: 25 },
        };
    }

    const shared = {
        userEmbedding: await getEmbeddingCached(userText),
        userIntent: parseIntent(userText),
    };

    const scoredArticles = await Promise.all(
        articles.map((article) => scoreArticle(userText, article, shared))
    );

    console.log("=== ARTICLE SCORES ===");
    scoredArticles.forEach((entry, index) => {
        console.log(
            `  [${index + 1}] "${(entry.article.title || "").substring(0, 55)}"` +
            ` | semantic: ${entry.signals.semanticScore}%` +
            ` | conf: ${(entry.confidence * 100).toFixed(1)}%` +
            ` | confirming: ${entry.isConfirming}` +
            ` | tier: ${entry.sourceInfo.tier} (${entry.sourceInfo.domain})`
        );
    });

    const confirmingArticles = scoredArticles.filter((entry) => entry.isConfirming);
    const confirmedCount = confirmingArticles.length;
    const tier1Count = confirmingArticles.filter((entry) => entry.sourceInfo.tier === 1).length;
    const avgConfidence = confirmedCount > 0
        ? confirmingArticles.reduce((sum, entry) => sum + entry.confidence, 0) / confirmedCount
        : 0;

    const sourceScore = getScoreFromSources(confirmedCount, tier1Count, avgConfidence);
    const factBonus = calculateFactCheckBonus(factCheckClaims);

    let finalScore = sourceScore.score + factBonus;
    if (confirmedCount >= 4 && finalScore < 60) finalScore = 60;
    if (confirmedCount >= 5 && finalScore < 70) finalScore = 70;
    finalScore = Math.max(0, Math.min(97, finalScore));

    return {
        score: +finalScore.toFixed(1),
        confirmedCount,
        tier1Count,
        avgConfidence: +avgConfidence.toFixed(3),
        factBonus: +factBonus.toFixed(1),
        countBoost: sourceScore.tier1Bonus,
        scoreRange: { floor: sourceScore.floor, ceiling: sourceScore.ceiling },
        scoredArticles,
    };
}

function getVerdict(score, confirmedCount = 0) {
    if (score === 0 && confirmedCount === 0) {
        return {
            label: "UNVERIFIED",
            color: "gray",
            icon: "?",
            description: "No semantically matching trusted sources were found.",
            confidence: "very low",
        };
    }
    if (score >= 70) {
        return {
            label: "REAL",
            color: "green",
            icon: "OK",
            description: `Confirmed by ${confirmedCount} trusted source${confirmedCount !== 1 ? "s" : ""}.`,
            confidence: score >= 85 ? "very high" : "high",
        };
    }
    if (score >= 40) {
        return {
            label: "PARTIALLY CORRECT",
            color: "orange",
            icon: "!",
            description: `Some aspects matched semantically across ${confirmedCount} source${confirmedCount !== 1 ? "s" : ""}, but key details may differ.`,
            confidence: "moderate",
        };
    }
    return {
        label: "FAKE / MISLEADING",
        color: "red",
        icon: "X",
        description: "Could not be confirmed by semantically similar trusted sources.",
        confidence: "low",
    };
}

module.exports = {
    getMasterScore,
    getVerdict,
    scoreArticle,
};
