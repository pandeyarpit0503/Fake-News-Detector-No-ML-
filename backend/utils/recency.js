// Returns multiplier: 0.4 to 1.0
function recencyMultiplier(publishedAt) {
    if (!publishedAt) return 0.7; // unknown date = moderate penalty

    const daysDiff = (Date.now() - new Date(publishedAt)) / 86400000;

    if (daysDiff <= 3) return 1.00; // very fresh
    if (daysDiff <= 7) return 0.95; // this week
    if (daysDiff <= 30) return 0.85; // this month
    if (daysDiff <= 90) return 0.75; // last 3 months
    if (daysDiff <= 365) return 0.60; // last year
    return 0.40;                       // old — possible recycled news
}

module.exports = { recencyMultiplier };
