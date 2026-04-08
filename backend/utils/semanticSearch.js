const { getEmbeddingCached } = require("./embeddingCache");
const { cosineSimilarity } = require("./embeddingEngine");
const { getSourceInfo } = require("./sources");
const { recencyMultiplier } = require("./recency");
const {
    upsertSemanticArticles,
    getRecentSemanticArticles,
} = require("../db/queries");

function normalizeSimilarity(rawScore) {
    return Math.max(0, Math.min((rawScore + 1) / 2, 1));
}

function buildArticleSemanticText(article = {}) {
    return [
        article.title || "",
        article.title || "",
        article.description || "",
        article.content || "",
        article.articleText || "",
    ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 1200);
}

function getArticleKey(article = {}) {
    if (article.url) return article.url.trim().toLowerCase();

    return [
        article.title || "",
        article.sourceDomain || article.source?.name || "",
        article.publishedAt || "",
    ]
        .join("|")
        .trim()
        .toLowerCase();
}

async function indexArticlesForSemanticSearch(articles = []) {
    const unique = [];
    const seen = new Set();

    for (const article of articles) {
        const key = getArticleKey(article);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(article);
    }

    const indexed = (await Promise.all(
        unique.map(async (article) => {
            const articleText = buildArticleSemanticText(article);
            if (!articleText) return null;

            const embeddingVector =
                article._semanticEmbedding || await getEmbeddingCached(articleText);

            return {
                ...article,
                articleText,
                _semanticEmbedding: embeddingVector,
            };
        })
    )).filter(Boolean);

    await upsertSemanticArticles(
        indexed.map((article) => ({
            url: article.url,
            title: article.title,
            description: article.description,
            contentExcerpt: (article.content || "").substring(0, 5000),
            sourceName: article.source?.name || article.sourceName || article.source,
            sourceDomain: article.sourceDomain,
            publishedAt: article.publishedAt,
            articleText: article.articleText,
            embeddingVector: article._semanticEmbedding,
        }))
    );

    return indexed;
}

async function findSemanticMatches(userText, liveArticles = [], options = {}) {
    const limit = Math.max(1, options.limit || 20);
    const corpusLimit = Math.max(limit, options.corpusLimit || 250);
    const minSimilarity = parseFloat(
        process.env.SEMANTIC_MATCH_THRESHOLD ||
        process.env.SIMILARITY_THRESHOLD ||
        "0.58"
    );

    const userEmbedding = await getEmbeddingCached(userText);
    const indexedLiveArticles = await indexArticlesForSemanticSearch(liveArticles);
    const storedArticles = await getRecentSemanticArticles(corpusLimit);

    const merged = new Map();

    const addArticle = (article, source) => {
        const key = getArticleKey(article);
        if (!key) return;

        const semanticText = article.articleText || buildArticleSemanticText(article);
        if (!semanticText) return;

        const normalized = {
            ...article,
            articleText: semanticText,
            _semanticEmbedding: article._semanticEmbedding || article.embeddingVector,
            _semanticSource: source,
        };

        const existing = merged.get(key);
        if (!existing || source === "live") {
            merged.set(key, normalized);
        }
    };

    indexedLiveArticles.forEach((article) => addArticle(article, "live"));
    storedArticles.forEach((article) => addArticle(article, "store"));

    const roughMatches = Array.from(merged.values())
        .filter((article) => Array.isArray(article._semanticEmbedding))
        .map((article) => {
            const sourceInfo = getSourceInfo(article.url || "");
            const semanticSimilarity = normalizeSimilarity(
                cosineSimilarity(userEmbedding, article._semanticEmbedding)
            );

            return {
                ...article,
                _semanticSimilarity: semanticSimilarity,
                _sourceInfo: sourceInfo,
                _recencyBoost: recencyMultiplier(article.publishedAt),
            };
        })
        .filter((article) => article._semanticSimilarity >= Math.max(0.35, minSimilarity - 0.18))
        .sort((a, b) => b._semanticSimilarity - a._semanticSimilarity)
        .slice(0, Math.max(limit * 2, 20));

    const refinedMatches = await Promise.all(
        roughMatches.map(async (article) => {
            const titleEmbedding = await getEmbeddingCached(article.title || article.articleText);
            const titleSimilarity = normalizeSimilarity(
                cosineSimilarity(userEmbedding, titleEmbedding)
            );

            const semanticRankScore = Math.min(
                article._semanticSimilarity * 0.80 +
                titleSimilarity * 0.15 +
                article._sourceInfo.weight * 0.03 +
                article._recencyBoost * 0.02,
                1
            );

            return {
                ...article,
                _titleSemanticSimilarity: titleSimilarity,
                _semanticRankScore: semanticRankScore,
            };
        })
    );

    const filtered = refinedMatches.filter(
        (article) =>
            article._semanticSimilarity >= minSimilarity ||
            article._titleSemanticSimilarity >= minSimilarity ||
            article._semanticRankScore >= minSimilarity
    );

    return (filtered.length > 0 ? filtered : refinedMatches)
        .sort((a, b) => b._semanticRankScore - a._semanticRankScore)
        .slice(0, limit);
}

module.exports = {
    buildArticleSemanticText,
    findSemanticMatches,
    indexArticlesForSemanticSearch,
    normalizeSimilarity,
};
