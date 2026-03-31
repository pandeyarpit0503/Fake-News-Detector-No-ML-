// ─────────────────────────────────────────────────────────────────────────────
// topicDetect.js
// Detects the dominant topic category of a news input using keyword dictionaries.
// Returns: { topic, confidence, matchedKeywords }
// ─────────────────────────────────────────────────────────────────────────────

const TOPIC_KEYWORDS = {
    SPORTS: [
        "cricket", "football", "soccer", "tennis", "basketball", "hockey",
        "match", "tournament", "league", "championship", "player", "team",
        "goal", "score", "century", "wicket", "innings", "batsman", "bowler",
        "striker", "midfielder", "goalkeeper", "referee", "umpire", "coach",
        "squad", "fixture", "stadium", "ipl", "bcci", "fifa", "nba", "nfl",
        "icc", "test", "odi", "t20", "grand", "slam", "olympic", "medal",
        "athlete", "sprint", "race", "marathon", "swimming", "boxing",
        "wrestling", "badminton", "volleyball", "rugby", "formula", "racing",
        "kohli", "dhoni", "rohit", "sachin", "messi", "ronaldo", "federer",
        "djokovic", "nadal", "wins", "defeat", "victory", "loss", "draw",
        "transfer", "signed", "contract", "trophy", "cup", "series",
    ],

    POLITICS: [
        "government", "parliament", "minister", "president", "prime",
        "election", "vote", "party", "congress", "senate", "policy",
        "legislation", "bill", "act", "law", "constitution", "ruling",
        "opposition", "coalition", "cabinet", "diplomat", "ambassador",
        "treaty", "sanction", "democracy", "republic", "federal", "state",
        "governor", "mayor", "councillor", "referendum", "campaign",
        "political", "politics", "bjp", "aap", "congress", "nda", "upa",
        "modi", "rahul", "kejriwal", "biden", "trump", "putin", "xi",
        "protest", "rally", "demonstration", "activist", "petition",
        "corruption", "scandal", "resign", "tenure", "mandate",
    ],

    CRIME: [
        "murder", "killed", "arrested", "police", "crime", "criminal",
        "robbery", "theft", "fraud", "scam", "accused", "suspect", "convicted",
        "sentenced", "jail", "prison", "custody", "fir", "chargesheet",
        "investigation", "cbi", "enforcement", "court", "judge", "verdict",
        "bail", "acquitted", "witness", "evidence", "drug", "trafficking",
        "smuggling", "rape", "assault", "violence", "shooting", "explosion",
        "bomb", "terror", "terrorist", "kidnap", "ransom", "heist",
    ],

    FINANCE: [
        "stock", "market", "economy", "gdp", "inflation", "interest",
        "rate", "rbi", "fed", "bank", "investment", "profit", "loss",
        "revenue", "earnings", "shares", "equity", "bond", "forex",
        "currency", "rupee", "dollar", "euro", "bitcoin", "crypto",
        "ipo", "merger", "acquisition", "startup", "unicorn", "funding",
        "venture", "capital", "budget", "fiscal", "trade", "export",
        "import", "tariff", "tax", "gst", "recession", "growth", "sensex",
        "nifty", "nasdaq", "dow", "jones", "quarterly", "financial",
    ],

    HEALTH: [
        "disease", "virus", "vaccine", "hospital", "doctor", "patient",
        "treatment", "medicine", "drug", "clinical", "trial", "surgery",
        "cancer", "diabetes", "heart", "pandemic", "outbreak", "who",
        "covid", "infection", "immunity", "antibody", "health", "medical",
        "symptom", "diagnosis", "therapy", "mental", "wellbeing", "nutrition",
        "diet", "exercise", "fitness", "pharmaceutical", "fda", "cdc",
        "epidemic", "quarantine", "mutation", "variant", "research",
    ],

    SCIENCE: [
        "research", "discovery", "scientist", "nasa", "isro", "space",
        "satellite", "rocket", "launch", "mission", "planet", "star",
        "galaxy", "universe", "physics", "chemistry", "biology", "climate",
        "environment", "energy", "nuclear", "quantum", "artificial",
        "intelligence", "ai", "machine", "learning", "robotics", "genome",
        "dna", "experiment", "laboratory", "innovation", "technology",
        "invention", "patent", "engineering", "software", "hardware",
        "internet", "data", "algorithm", "cloud", "cyber",
    ],

    DISASTER: [
        "earthquake", "flood", "cyclone", "tsunami", "hurricane", "tornado",
        "wildfire", "drought", "landslide", "accident", "crash", "collision",
        "explosion", "fire", "deaths", "casualties", "rescue", "relief",
        "evacuate", "disaster", "natural", "calamity", "storm", "rain",
        "heatwave", "snowstorm", "blizzard", "avalanche",
    ],
};

// Minimum keyword matches to declare a non-GENERAL topic
const CONFIDENCE_THRESHOLD = 2;

/**
 * Detects the dominant topic category of a text string.
 * @param {string} text - The user's news input
 * @returns {{ topic: string, confidence: number, matchedKeywords: string[] }}
 */
function detectTopic(text) {
    const normalised = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const words = new Set(normalised.split(/\s+/).filter(w => w.length > 2));

    let bestTopic    = "GENERAL";
    let bestCount    = 0;
    let bestMatched  = [];

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        const matched = keywords.filter(kw => {
            // Support multi-word phrases like "prime minister"
            const kwWords = kw.split(" ");
            if (kwWords.length > 1) return normalised.includes(kw);
            return words.has(kw);
        });

        if (matched.length > bestCount) {
            bestCount   = matched.length;
            bestTopic   = topic;
            bestMatched = matched;
        }
    }

    if (bestCount < CONFIDENCE_THRESHOLD) {
        bestTopic   = "GENERAL";
        bestMatched = [];
    }

    return {
        topic:           bestTopic,
        confidence:      bestCount,
        matchedKeywords: bestMatched,
    };
}

module.exports = { detectTopic, TOPIC_KEYWORDS, CONFIDENCE_THRESHOLD };
