// ─────────────────────────────────────────────────────────────────────────────
// queryBuilder.js
// Builds 3 targeted GNews search query variants for parallel fetching.
//
// Query 1 (Keyword-exact):   top 5 extracted keywords joined
// Query 2 (Entity + year):   proper nouns + current year
// Query 3 (Topic-padded):    top 4 keywords + topic category label
// ─────────────────────────────────────────────────────────────────────────────

const TOPIC_SEARCH_TERMS = {
    SPORTS:   "sports news",
    POLITICS: "politics news",
    CRIME:    "crime news",
    FINANCE:  "finance economy",
    HEALTH:   "health medical",
    SCIENCE:  "science technology",
    DISASTER: "disaster relief",
    GENERAL:  "news",
};

/**
 * Builds up to 3 deduplicated GNews query strings from the input.
 * @param {string}   rawText  - Original user news input
 * @param {string[]} keywords - Extracted keywords (from keywords.js)
 * @param {object}   entities - Extracted entities (from entities.js)
 * @param {object}   topicInfo - Topic detection result (from topicDetect.js)
 * @returns {string[]} Array of 1–3 unique query strings
 */
function buildQueries(rawText, keywords, entities, topicInfo) {
    const currentYear = new Date().getFullYear();
    const queries     = new Set();

    // ── Query 1: top 5 keywords, direct join ─────────────────────────────────
    if (keywords.length > 0) {
        const q1 = keywords.slice(0, 5).join(" ");
        queries.add(q1);
    }

    // ── Query 2: proper nouns + current year ─────────────────────────────────
    const properNouns = (entities.properNouns || []).slice(0, 4);
    if (properNouns.length >= 1) {
        const yearSuffix = entities.years?.length ? "" : ` ${currentYear}`;
        const q2 = properNouns.join(" ") + yearSuffix;
        if (q2.trim().length > 3) queries.add(q2.trim());
    }

    // ── Query 3: top 4 keywords + topic label ────────────────────────────────
    const topicLabel = TOPIC_SEARCH_TERMS[topicInfo?.topic] || "news";
    if (keywords.length > 0 && topicLabel !== "news") {
        const topWords = keywords.slice(0, 4).join(" ");
        const q3 = `${topWords} ${topicLabel}`;
        queries.add(q3);
    } else if (keywords.length > 0) {
        // Fallback: slight variation — first 3 words + "latest"
        const q3 = keywords.slice(0, 3).join(" ") + " latest";
        queries.add(q3);
    }

    const result = [...queries].filter(q => q.trim().length > 0).slice(0, 3);
    return result.length > 0 ? result : [rawText.substring(0, 100)];
}

module.exports = { buildQueries, TOPIC_SEARCH_TERMS };
