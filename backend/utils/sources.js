const SOURCE_WEIGHTS = {
    // ── TIER 1: International wire services ──
    "reuters.com":        { weight: 1.00, tier: 1, name: "Reuters" },
    "apnews.com":         { weight: 1.00, tier: 1, name: "AP News" },
    "bbc.com":            { weight: 0.97, tier: 1, name: "BBC" },
    "bbc.co.uk":          { weight: 0.97, tier: 1, name: "BBC" },
    "npr.org":            { weight: 0.95, tier: 1, name: "NPR" },
    "pbs.org":            { weight: 0.93, tier: 1, name: "PBS" },

    // ── TIER 2: Major newspapers & broadcasters ──
    "theguardian.com":    { weight: 0.88, tier: 2, name: "The Guardian" },
    "nytimes.com":        { weight: 0.88, tier: 2, name: "NY Times" },
    "washingtonpost.com": { weight: 0.87, tier: 2, name: "Washington Post" },
    "bloomberg.com":      { weight: 0.87, tier: 2, name: "Bloomberg" },
    "economist.com":      { weight: 0.86, tier: 2, name: "The Economist" },
    "ft.com":             { weight: 0.86, tier: 2, name: "Financial Times" },
    "aljazeera.com":      { weight: 0.84, tier: 2, name: "Al Jazeera" },
    "thehindu.com":       { weight: 0.84, tier: 2, name: "The Hindu" },
    "wsj.com":            { weight: 0.85, tier: 2, name: "Wall Street Journal" },
    "forbes.com":         { weight: 0.80, tier: 2, name: "Forbes" },
    "time.com":           { weight: 0.82, tier: 2, name: "TIME" },
    "usatoday.com":       { weight: 0.80, tier: 2, name: "USA Today" },

    // ── TIER 3: Major regional / TV news ──
    "ndtv.com":           { weight: 0.76, tier: 3, name: "NDTV" },
    "hindustantimes.com": { weight: 0.75, tier: 3, name: "Hindustan Times" },
    "timesofindia.com":   { weight: 0.74, tier: 3, name: "Times of India" },
    "indianexpress.com":  { weight: 0.75, tier: 3, name: "Indian Express" },
    "cnn.com":            { weight: 0.74, tier: 3, name: "CNN" },
    "cbsnews.com":        { weight: 0.74, tier: 3, name: "CBS News" },
    "abcnews.go.com":     { weight: 0.73, tier: 3, name: "ABC News" },
    "nbcnews.com":        { weight: 0.73, tier: 3, name: "NBC News" },
    "foxnews.com":        { weight: 0.65, tier: 3, name: "Fox News" },
    "sky.com":            { weight: 0.74, tier: 3, name: "Sky News" },
    "deccanherald.com":   { weight: 0.72, tier: 3, name: "Deccan Herald" },
    "theprint.in":        { weight: 0.73, tier: 3, name: "The Print" },
    "scroll.in":          { weight: 0.72, tier: 3, name: "Scroll" },
    "thewire.in":         { weight: 0.71, tier: 3, name: "The Wire" },

    // ── DEFAULT ──
    "default":            { weight: 0.45, tier: 4, name: "Unknown Source" },
};

function getSourceInfo(url) {
    try {
        const domain = new URL(url).hostname.replace("www.", "");
        const info   = SOURCE_WEIGHTS[domain];
        return info
            ? { ...info, domain }
            : { ...SOURCE_WEIGHTS["default"], domain };
    } catch {
        return { ...SOURCE_WEIGHTS["default"], domain: "unknown" };
    }
}

// Legacy export kept for any existing callers
function sourceCountBoost(confirmedCount) {
    if (confirmedCount >= 6) return 20;
    if (confirmedCount >= 4) return 15;
    if (confirmedCount >= 2) return 10;
    if (confirmedCount >= 1) return 5;
    return 0;
}

module.exports = { SOURCE_WEIGHTS, getSourceInfo, sourceCountBoost };
