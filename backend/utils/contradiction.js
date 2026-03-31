// Contradiction detection — only fires when STRONG opposing sentiment is found
// in both title AND body (body-only contradictions are ignored — too many
// false positives from loosely related articles).

const POSITIVE_CONTEXTS = [
    ["win",     ["wins", "won", "victory", "defeats", "champion", "triumph"]],
    ["alive",   ["survives", "alive", "lives", "recovers", "survived"]],
    ["approve", ["approves", "passes", "signs", "confirms", "accepts", "enacts"]],
    ["rise",    ["rises", "increases", "gains", "grows", "surges", "up", "higher"]],
    ["found",   ["found", "confirmed", "proven", "verified", "established"]],
    ["open",    ["opens", "launched", "starts", "begins", "inaugurated"]],
];

const NEGATIVE_CONTEXTS = [
    ["lose",    ["loses", "lost", "defeat", "fails", "eliminated", "surrenders"]],
    ["dead",    ["dies", "dead", "killed", "passed away", "deceased", "death"]],
    ["reject",  ["rejects", "vetoes", "denies", "refuses", "blocks", "dismisses"]],
    ["fall",    ["falls", "decreases", "dropped", "declines", "crashes", "lower"]],
    ["denied",  ["denied", "debunked", "disproven", "false", "fake", "fabricated"]],
    ["closed",  ["closes", "shuts", "shut down", "suspended", "cancelled"]],
];

function hasContext(text, contextGroups) {
    const lower = text.toLowerCase();
    for (const [, words] of contextGroups) {
        if (words.some(w => lower.includes(w))) return true;
    }
    return false;
}

function getSentiment(text) {
    const pos = hasContext(text, POSITIVE_CONTEXTS);
    const neg = hasContext(text, NEGATIVE_CONTEXTS);
    if (pos && !neg) return "pos";
    if (neg && !pos) return "neg";
    return "neutral";
}

// Returns 0 or -30 (same scale as old system for compatibility).
// -30 only when BOTH title AND body have opposing sentiment.
// Called with (userText, articleTitle) for title check,
// and (userText, fullArticleText) for body check in scoring.js.
function contradictionPenalty(userText, articleText) {
    const userSentiment    = getSentiment(userText);
    const articleSentiment = getSentiment(articleText);

    if (userSentiment === "neutral" || articleSentiment === "neutral") return 0;
    if (userSentiment !== articleSentiment) return -30; // clear contradiction
    return 0;
}

// Number mismatch — only checks 3+ digit numbers to avoid false positives
// from page numbers, ages, small stats. Max penalty: -10 (halved from before).
function numberMismatchPenalty(userText, articleText) {
    const userNums = userText.match(/\b\d{3,}\b/g) || [];
    if (userNums.length === 0) return 0;

    const articleNums = new Set(articleText.match(/\b\d{3,}\b/g) || []);
    const mismatches  = userNums.filter(n => !articleNums.has(n)).length;

    // Max -10 (2 mismatches × 5)
    return -(Math.min(mismatches, 2) * 5);
}

module.exports = { contradictionPenalty, numberMismatchPenalty };
