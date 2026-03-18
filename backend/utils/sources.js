const SOURCE_WEIGHTS = {
    // Tier 1 — International wire services (most reliable)
    "reuters.com": { weight: 1.00, tier: 1 },
    "apnews.com": { weight: 1.00, tier: 1 },
    "bbc.com": { weight: 0.95, tier: 1 },
    "bbc.co.uk": { weight: 0.95, tier: 1 },
    "npr.org": { weight: 0.90, tier: 1 },

    // Tier 2 — Major national newspapers
    "theguardian.com": { weight: 0.85, tier: 2 },
    "nytimes.com": { weight: 0.85, tier: 2 },
    "washingtonpost.com": { weight: 0.85, tier: 2 },
    "aljazeera.com": { weight: 0.82, tier: 2 },
    "thehindu.com": { weight: 0.82, tier: 2 },
    "bloomberg.com": { weight: 0.82, tier: 2 },
    "economist.com": { weight: 0.80, tier: 2 },
    "ft.com": { weight: 0.80, tier: 2 },

    // Tier 3 — Major news channels + regional
    "ndtv.com": { weight: 0.75, tier: 3 },
    "hindustantimes.com": { weight: 0.75, tier: 3 },
    "timesofindia.com": { weight: 0.72, tier: 3 },
    "indianexpress.com": { weight: 0.72, tier: 3 },
    "cnn.com": { weight: 0.70, tier: 3 },
    "foxnews.com": { weight: 0.65, tier: 3 },
    "abcnews.go.com": { weight: 0.70, tier: 3 },
    "cbsnews.com": { weight: 0.70, tier: 3 },

    // Default for unknown sources
    "default": { weight: 0.50, tier: 4 },
};

function getSourceInfo(url) {
    try {
        const domain = new URL(url).hostname.replace("www.", "");
        return SOURCE_WEIGHTS[domain] || { ...SOURCE_WEIGHTS["default"], domain };
    } catch {
        return SOURCE_WEIGHTS["default"];
    }
}

// Source count boost — more confirmations = more trust
function sourceCountBoost(confirmedSourceCount) {
    if (confirmedSourceCount >= 6) return 15;
    if (confirmedSourceCount >= 4) return 10;
    if (confirmedSourceCount >= 2) return 8;
    if (confirmedSourceCount === 1) return -10; // only 1 source = risky
    return 0;
}

module.exports = { getSourceInfo, sourceCountBoost };
