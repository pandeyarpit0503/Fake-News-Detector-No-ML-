const { extractKeywords } = require("./keywords");

// Basic stemmer — strips common suffixes so word variations match
// e.g. "running" → "run", "killed" → "kill", "increases" → "increas"
function stem(word) {
    return word
        .replace(/tion$/,  "")
        .replace(/ing$/,   "")
        .replace(/ness$/,  "")
        .replace(/ment$/,  "")
        .replace(/ity$/,   "")
        .replace(/able$/,  "")
        .replace(/ible$/,  "")
        .replace(/ical$/,  "")
        .replace(/ful$/,   "")
        .replace(/less$/,  "")
        .replace(/ized$/,  "")
        .replace(/ised$/,  "")
        .replace(/ed$/,    "")
        .replace(/ly$/,    "")
        .replace(/er$/,    "")
        .replace(/est$/,   "")
        .replace(/s$/,     "");
}

function extractStemmedKeywords(text) {
    return new Set(extractKeywords(text).map(w => stem(w)));
}

// Jaccard similarity using stemmed keywords
function jaccardSimilarity(text1, text2) {
    const set1 = extractStemmedKeywords(text1);
    const set2 = extractStemmedKeywords(text2);

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = [...set1].filter(w => set2.has(w)).length;
    const union        = new Set([...set1, ...set2]).size;

    return intersection / union;
}

// Returns 0–40 points (matches old interface expected by scoring.js)
function keywordScore(text1, text2) {
    return jaccardSimilarity(text1, text2) * 40;
}

module.exports = { jaccardSimilarity, keywordScore, stem };
