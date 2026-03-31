// ─────────────────────────────────────────────────────────────────────────────
// articleFilter.js
// Validation Filter — applied after fetching, before scoring.
//
// An article is KEPT only if:
//   (a) It overlaps with at least MIN_KEYWORD_OVERLAP of the user's keywords, OR
//       it shares a proper noun with the user's input
//   (b) Its detected topic is NOT a high-confidence mismatch with the input topic
//
// This prevents off-topic articles (politics article for a sports query, etc.)
// from diluting the trust score.
// ─────────────────────────────────────────────────────────────────────────────

const { detectTopic, CONFIDENCE_THRESHOLD } = require("./topicDetect");
const { extractKeywords }                   = require("./keywords");

// Minimum overlapping user-keywords an article must contain
const MIN_KEYWORD_OVERLAP = 2;

/**
 * Normalises text to a simple bag of lowercase words.
 */
function tokenise(text) {
    return new Set(
        (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2)
    );
}

/**
 * Counts how many of `userKeywords` appear in `articleTokens`.
 */
function countOverlap(userKeywords, articleTokens) {
    return userKeywords.filter(kw => articleTokens.has(kw)).length;
}

/**
 * Returns true if the article's topic clearly conflicts with the user's topic.
 * Only fires when BOTH sides have high confidence (>=3 matches).
 */
function isTopicMismatch(userTopicInfo, articleText) {
    if (!userTopicInfo || userTopicInfo.topic === "GENERAL") return false;
    if (userTopicInfo.confidence < 3) return false;          // user topic not strong enough

    const articleTopic = detectTopic(articleText);
    if (articleTopic.topic === "GENERAL") return false;      // article topic not strong
    if (articleTopic.confidence < 3) return false;

    return articleTopic.topic !== userTopicInfo.topic;
}

/**
 * Deduplicates articles by URL.
 * @param {object[][]} resultSets - Arrays of articles from each query
 * @returns {object[]} Deduplicated articles, capped at 25
 */
function deduplicateArticles(resultSets) {
    const seen    = new Set();
    const unique  = [];

    for (const articles of resultSets) {
        for (const article of (articles || [])) {
            const key = article.url || article.title || "";
            if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(article);
                if (unique.length >= 25) return unique;
            }
        }
    }

    return unique;
}

/**
 * Filters articles to keep only those relevant to the user's input.
 *
 * @param {object[]} articles     - Raw GNews articles
 * @param {string[]} userKeywords - Keywords from extractKeywords()
 * @param {object|null} userTopicInfo  - Result from detectTopic()
 * @returns {object[]} Filtered articles
 */
function validateArticles(articles, userKeywords, userTopicInfo) {
    if (!articles || articles.length === 0) return [];

    const validArticles  = [];
    const rejectedLog    = [];

    for (const article of articles) {
        const articleText = [
            article.title       || "",
            article.description || "",
        ].join(" ");

        const articleTokens = tokenise(articleText);
        const overlap       = countOverlap(userKeywords, articleTokens);
        const mismatch      = isTopicMismatch(userTopicInfo, articleText);

        // ── REJECT: topic clearly conflicts ──────────────────────────────────
        if (mismatch) {
            rejectedLog.push({
                title:  (article.title || "").substring(0, 60),
                reason: "topic mismatch",
                overlap,
            });
            continue;
        }

        // ── REJECT: too few keyword overlaps ─────────────────────────────────
        if (overlap < MIN_KEYWORD_OVERLAP) {
            // Give a pass if the article mentions a proper noun (name) from input
            const userProperNouns = (userTopicInfo?.matchedKeywords || []);
            const hasProperNoun   = userProperNouns.some(n => articleTokens.has(n.toLowerCase()));

            if (!hasProperNoun) {
                rejectedLog.push({
                    title:  (article.title || "").substring(0, 60),
                    reason: `only ${overlap} keyword overlap`,
                    overlap,
                });
                continue;
            }
        }

        validArticles.push(article);
    }

    // Console summary
    console.log(
        `=== VALIDATION FILTER: kept ${validArticles.length} / ${articles.length} articles ===`
    );
    if (rejectedLog.length > 0) {
        console.log("  Rejected:");
        rejectedLog.forEach(r =>
            console.log(`    ❌ "${r.title}..." → ${r.reason}`)
        );
    }

    return validArticles;
}

module.exports = {
    deduplicateArticles,
    validateArticles,
    MIN_KEYWORD_OVERLAP,
};
