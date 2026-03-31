// Smoother recency curve — legitimate stories stay relevant for weeks
function recencyMultiplier(publishedAt) {
    if (!publishedAt) return 0.75;

    const daysDiff = (Date.now() - new Date(publishedAt)) / 86400000;

    if (daysDiff < 0)     return 0.80; // future date = suspicious
    if (daysDiff <= 1)    return 1.00; // today / yesterday
    if (daysDiff <= 3)    return 0.98; // last 3 days
    if (daysDiff <= 7)    return 0.95; // this week
    if (daysDiff <= 14)   return 0.90; // 2 weeks
    if (daysDiff <= 30)   return 0.85; // this month
    if (daysDiff <= 60)   return 0.78; // 2 months
    if (daysDiff <= 180)  return 0.68; // 6 months
    if (daysDiff <= 365)  return 0.55; // 1 year
    return 0.40;                        // older than 1 year
}

module.exports = { recencyMultiplier };
