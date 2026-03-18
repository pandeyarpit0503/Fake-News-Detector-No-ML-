const POSITIVE_WORDS = [
    "wins", "won", "victory", "defeats", "confirms",
    "approves", "passes", "survives", "launches", "gains", "rises",
    "increases", "elects", "found", "guilty", "acquitted", "alive",
    "open", "starts", "signs", "agrees", "accepts", "supports",
];

const NEGATIVE_WORDS = [
    "loses", "lost", "defeat", "fails", "denies", "rejects", "dies",
    "dead", "closes", "cancels", "drops", "falls", "decreases",
    "suspended", "banned", "innocent", "stops", "refuses", "opposes",
    "arrested", "removed",
];

function getSentiment(text) {
    const lower = text.toLowerCase();
    const pos = POSITIVE_WORDS.filter(w => lower.includes(w)).length;
    const neg = NEGATIVE_WORDS.filter(w => lower.includes(w)).length;
    if (pos > neg) return "positive";
    if (neg > pos) return "negative";
    return "neutral";
}

// Returns penalty: 0 or -30
function contradictionPenalty(userText, articleText) {
    const userSentiment = getSentiment(userText);
    const articleSentiment = getSentiment(articleText);

    if (userSentiment === "neutral" || articleSentiment === "neutral")
        return 0;

    if (userSentiment !== articleSentiment) return -30;
    return 0;
}

// Returns penalty: 0 to -20
function numberMismatchPenalty(userText, articleText) {
    const userNums = (userText.match(/\b\d+\b/g) || []).filter(
        n => n.length >= 2
    ); // ignore 1-digit numbers
    if (userNums.length === 0) return 0;

    const articleNums = new Set(articleText.match(/\b\d+\b/g) || []);
    const mismatches = userNums.filter(n => !articleNums.has(n)).length;

    return -(Math.min(mismatches, 4) * 5); // max -20
}

module.exports = { contradictionPenalty, numberMismatchPenalty };
