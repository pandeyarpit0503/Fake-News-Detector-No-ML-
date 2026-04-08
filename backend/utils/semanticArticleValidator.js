const { extractRequiredTerms } = require("./smartQueryBuilder");
const { cosineSimilarity } = require("./embeddingEngine");
const { getEmbeddingCached } = require("./embeddingCache");
const { detectTopic } = require("./topicDetect");

const GENERIC_SUBJECTS = new Set([
    "india", "us", "usa", "china", "pakistan", "russia", "world",
    "government", "people", "news", "report", "official", "year",
    "time", "state", "national", "international", "global", "new",
]);

const COMPATIBLE_TOPICS = {
    SPORTS: new Set(["SPORTS", "GENERAL"]),
    POLITICS: new Set(["POLITICS", "CRIME", "GENERAL"]),
    CRIME: new Set(["CRIME", "POLITICS", "GENERAL"]),
    FINANCE: new Set(["FINANCE", "GENERAL"]),
    HEALTH: new Set(["HEALTH", "SCIENCE", "GENERAL"]),
    SCIENCE: new Set(["SCIENCE", "HEALTH", "GENERAL"]),
    DISASTER: new Set(["DISASTER", "GENERAL"]),
    GENERAL: new Set(["SPORTS", "POLITICS", "CRIME", "FINANCE", "HEALTH", "SCIENCE", "DISASTER", "GENERAL"]),
};

let cachedTerms = null;
let cachedTermsText = "";
let cachedUserTopic = null;

function getRequiredTermsCached(userText) {
    const key = userText.trim().toLowerCase().substring(0, 200);
    if (cachedTermsText === key && cachedTerms) return cachedTerms;

    cachedTerms = extractRequiredTerms(userText);
    cachedTermsText = key;
    return cachedTerms;
}

function getUserTopicCached(userText) {
    if (!cachedUserTopic) {
        cachedUserTopic = detectTopic(userText);
    }
    return cachedUserTopic;
}

function clearRequestCache() {
    cachedTerms = null;
    cachedTermsText = "";
    cachedUserTopic = null;
}

function normalizeSimilarity(rawScore) {
    return (rawScore + 1) / 2;
}

async function validateArticle(userText, article) {
    const articleTitle = (article.title || "").toLowerCase();
    const articleDesc = (article.description || "").toLowerCase();
    const articleFull = `${articleTitle} ${articleDesc}`.trim();
    const userLower = userText.toLowerCase();
    const shortTitle = (article.title || "").substring(0, 60);

    console.log(`\n  Validating: "${shortTitle}"`);

    const required = getRequiredTermsCached(userText);
    if (required.anyOf_subjects.length > 0) {
        const subjectFound = required.anyOf_subjects.some((subject) => articleFull.includes(subject));
        if (!subjectFound) {
            const reason = `None of [${required.anyOf_subjects.join(", ")}] in article`;
            console.log(`  FAIL (subject): ${reason}`);
            return { pass: false, reason, score: 0 };
        }
        console.log("  Subject found");
    }

    const userWords = new Set(
        userLower
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length > 3)
    );

    const titleWords = articleTitle
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3);

    const overlappingWords = titleWords.filter((word) => userWords.has(word));
    const titleOverlap = overlappingWords.length;
    const specificOverlap = overlappingWords.filter((word) => !GENERIC_SUBJECTS.has(word)).length;

    console.log(
        `  Title overlap: ${titleOverlap} words (${specificOverlap} specific: [${overlappingWords.join(", ")}])`
    );

    if (titleOverlap === 0) {
        console.log("  No direct title overlap - semantic similarity will decide");
    } else if (specificOverlap === 0 && titleOverlap <= 1) {
        console.log("  Only broad lexical overlap detected - semantic score must carry this article");
    }

    const userTopic = getUserTopicCached(userText);
    const articleTopic = detectTopic(`${article.title || ""} ${article.description || ""}`);

    if (
        userTopic.topic !== "GENERAL" && userTopic.confidence >= 2 &&
        articleTopic.topic !== "GENERAL" && articleTopic.confidence >= 2 &&
        userTopic.topic !== articleTopic.topic
    ) {
        const compatible = COMPATIBLE_TOPICS[userTopic.topic];
        if (!compatible || !compatible.has(articleTopic.topic)) {
            const reason = `Topic mismatch: user=${userTopic.topic}, article=${articleTopic.topic}`;
            console.log(`  FAIL (topic): ${reason}`);
            return { pass: false, reason, score: 0 };
        }
    }

    if (articleTopic.topic !== "GENERAL") {
        console.log(`  Topic ok: user=${userTopic.topic} / article=${articleTopic.topic}`);
    }

    let embeddingScore = 0;
    try {
        const userVec = await getEmbeddingCached(userText);
        const titleSim = typeof article._titleSemanticSimilarity === "number"
            ? article._titleSemanticSimilarity
            : normalizeSimilarity(
                cosineSimilarity(userVec, await getEmbeddingCached(article.title || ""))
            );

        const fullSim = typeof article._semanticSimilarity === "number"
            ? article._semanticSimilarity
            : normalizeSimilarity(
                cosineSimilarity(
                    userVec,
                    await getEmbeddingCached(`${article.title || ""} ${article.description || ""}`.substring(0, 500))
                )
            );

        embeddingScore = titleSim * 0.40 + fullSim * 0.60;

        console.log(
            `  Embedding: title=${titleSim.toFixed(3)} full=${fullSim.toFixed(3)} weighted=${embeddingScore.toFixed(3)}`
        );

        const lexicalSlack = titleOverlap === 0 ? 0.02 : 0;
        const minThreshold = Math.max(
            0.45,
            parseFloat(process.env.SIMILARITY_THRESHOLD || "0.60") - lexicalSlack
        );

        if (embeddingScore < minThreshold) {
            const reason = `Weighted embedding ${embeddingScore.toFixed(3)} < threshold ${minThreshold}`;
            console.log(`  FAIL (embedding): ${reason}`);
            return { pass: false, reason, score: embeddingScore };
        }

        console.log(`  Embedding passed: ${embeddingScore.toFixed(3)}`);
    } catch (error) {
        console.error("  Embedding check failed:", error.message);
        if (specificOverlap < 1 && titleOverlap === 0) {
            return {
                pass: false,
                reason: "Embedding unavailable + no lexical support",
                score: 0,
            };
        }
        embeddingScore = Math.max(specificOverlap * 0.15, titleOverlap * 0.08);
    }

    const contradiction = detectContradiction(userLower, articleFull);
    if (contradiction.isContradicting) {
        console.log(`  Contradiction: ${contradiction.reason}`);
        return {
            pass: true,
            reason: "Contradicting source",
            score: embeddingScore,
            isContradicting: true,
        };
    }

    console.log(`  ACCEPTED (score: ${embeddingScore.toFixed(3)})`);
    return {
        pass: true,
        reason: "All checks passed",
        score: embeddingScore,
        isContradicting: false,
    };
}

function detectContradiction(userText, articleText) {
    const OPPOSING_PAIRS = [
        [["wins", "won", "victory", "beats", "defeats"], ["loses", "lost", "defeat", "fails", "beaten"]],
        [["alive", "survives", "recovers", "lives"], ["dies", "dead", "killed", "passed away", "deceased"]],
        [["rises", "increases", "gains", "surges", "soars"], ["falls", "decreases", "drops", "plunges", "crashes"]],
        [["confirmed", "true", "verified", "accurate"], ["denied", "false", "fake", "debunked", "wrong"]],
    ];

    for (const [positiveTerms, negativeTerms] of OPPOSING_PAIRS) {
        const userPos = positiveTerms.some((term) => userText.includes(term));
        const userNeg = negativeTerms.some((term) => userText.includes(term));
        const articlePos = positiveTerms.some((term) => articleText.includes(term));
        const articleNeg = negativeTerms.some((term) => articleText.includes(term));

        if (userPos && articleNeg && !articlePos) {
            return { isContradicting: true, reason: "User positive -> article negative" };
        }
        if (userNeg && articlePos && !articleNeg) {
            return { isContradicting: true, reason: "User negative -> article positive" };
        }
    }

    return { isContradicting: false };
}

module.exports = {
    validateArticle,
    clearRequestCache,
    detectContradiction,
};
