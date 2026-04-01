// ─────────────────────────────────────────────────────────────────────────────
// intentParser.js
// Extracts structured intent (WHO + WHAT) from a news headline and scores
// how well an article matches that intent.
//
// This is a lightweight supporting signal alongside the embedding similarity
// — it catches cases where embeddings are close but the subject is wrong
// (e.g. "Kohli retires" vs "Dhoni retires" — similar meaning, wrong person).
// ─────────────────────────────────────────────────────────────────────────────

const { extractEntities } = require("./entities");
const { extractKeywords } = require("./keywords");

// Common action verbs/nouns that signal the "WHAT" of news
const ACTION_VERBS = new Set([
  "retires", "retirement", "resigns", "resignation", "arrested",
  "wins", "won", "victory", "loses", "lost", "defeat", "defeats",
  "scores", "scored", "launches", "launched", "announces", "announced",
  "signs", "signed", "joins", "joined", "leaves", "left",
  "transfers", "transferred", "banned", "ban",
  "elected", "appointed", "fired", "sacked", "dies", "death", "killed",
  "crashes", "crashed", "floods", "flooded",
  "earthquake", "explosion", "attack", "attacked", "invasion",
  "sanctions", "sanctioned", "treaty", "merger", "acquisition",
  "ipo", "listed", "vaccine", "approved", "discovered", "invented",
  "released", "sells", "sold", "buys", "bought", "acquires",
  "visits", "travels", "meets", "summit", "confirms", "denies",
]);

// ── Extract proper nouns from text ─────────────────────────────────────────────
function extractProperNouns(text) {
  const entities = extractEntities(text);
  return entities.properNouns || [];
}

// ── Detect action verbs/events in the text ─────────────────────────────────────
// Returns array of { trigger, category } objects
function detectAction(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const actions = [];
  const seen = new Set();

  for (const word of words) {
    if (ACTION_VERBS.has(word) && !seen.has(word)) {
      seen.add(word);
      actions.push({ trigger: word, category: "action" });
    }
  }

  return actions;
}

// ── Parse intent: WHO did WHAT ────────────────────────────────────────────────
function parseIntent(text) {
  const properNouns = extractProperNouns(text);
  const actions     = detectAction(text);
  const keywords    = extractKeywords(text);

  return {
    who:      properNouns.slice(0, 3),
    what:     actions.map(a => a.trigger).slice(0, 3),
    keywords: keywords.slice(0, 8),
  };
}

// ── Score how well an article matches the parsed intent ───────────────────────
function matchIntent(intent, articleText) {
  const articleLower = articleText.toLowerCase();

  let score = 0;
  let parts = 0;

  // ── WHO match ──
  if (intent.who.length > 0) {
    parts++;
    const matched = intent.who.filter((n) =>
      articleLower.includes(n.toLowerCase())
    ).length;
    score += matched / intent.who.length;
  }

  // ── WHAT match ──
  if (intent.what.length > 0) {
    parts++;
    const matched = intent.what.filter((v) => articleLower.includes(v)).length;
    score += matched / intent.what.length;
  }

  // ── Keyword overlap (lightweight fallback when WHO/WHAT are empty) ──
  if (parts === 0 && intent.keywords.length > 0) {
    parts++;
    const matched = intent.keywords.filter((kw) => articleLower.includes(kw)).length;
    score += matched / intent.keywords.length;
  }

  return { score: parts > 0 ? score / parts : 0 };
}

module.exports = {
  extractProperNouns,
  detectAction,
  parseIntent,
  matchIntent,
};
