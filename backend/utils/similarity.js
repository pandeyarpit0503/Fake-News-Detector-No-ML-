const { extractKeywords } = require("./keywords");

function jaccardSimilarity(text1, text2) {
    const set1 = new Set(extractKeywords(text1));
    const set2 = new Set(extractKeywords(text2));

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = [...set1].filter(w => set2.has(w)).length;
    const union = new Set([...set1, ...set2]).size;

    return intersection / union; // 0.0 to 1.0
}

// Returns 0–40 points
function keywordScore(userText, articleText) {
    return jaccardSimilarity(userText, articleText) * 40;
}

module.exports = { jaccardSimilarity, keywordScore };
