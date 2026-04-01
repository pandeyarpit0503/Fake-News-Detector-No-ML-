// ─────────────────────────────────────────────────────────────────────────────
// smartQueryBuilder.js  (LAYER 1)
// Builds precise, targeted GNews search queries from user input.
//
// Strategy: proper nouns + action verb first (most specific),
// then proper nouns only, then noun+keywords, then keywords-only fallback.
// This ensures GNews returns articles about the SAME event, not just
// the same broad topic.
// ─────────────────────────────────────────────────────────────────────────────

const { extractKeywords }              = require("./keywords");
const { extractProperNouns, detectAction } = require("./intentParser");

function buildPreciseQuery(userText) {
  const properNouns = extractProperNouns(userText);
  const actions     = detectAction(userText);
  const keywords    = extractKeywords(userText);

  console.log("\n🔧 Building precise queries from:");
  console.log("  Proper nouns:", properNouns);
  console.log("  Actions:", actions.map(a => a.trigger));
  console.log("  Keywords:", keywords);

  const queries = [];

  // ── Query 1: Proper nouns + action (MOST SPECIFIC) ──────────────────────────
  // "Virat Kohli retires" or "Tesla stock sells"
  if (properNouns.length >= 1 && actions.length >= 1) {
    const q = [...properNouns.slice(0, 2), actions[0].trigger].join(" ");
    queries.push({ query: q, priority: 1, label: "proper_noun_action" });
  }

  // ── Query 2: All proper nouns ───────────────────────────────────────────────
  // "Virat Kohli Test cricket"
  if (properNouns.length >= 2) {
    const q = properNouns.slice(0, 3).join(" ");
    queries.push({ query: q, priority: 2, label: "proper_nouns_only" });
  }

  // ── Query 3: First proper noun + top non-noun keywords ──────────────────────
  // "Kohli cricket retirement"
  if (properNouns.length >= 1) {
    const nounSet = new Set(properNouns.map(n => n.toLowerCase()));
    const topKw = keywords
      .filter(k => !nounSet.has(k.toLowerCase()))
      .slice(0, 2);
    if (topKw.length > 0) {
      const q = [properNouns[0], ...topKw].join(" ");
      queries.push({ query: q, priority: 3, label: "noun_keywords" });
    }
  }

  // ── Query 4: Top keywords only (LEAST SPECIFIC — fallback) ──────────────────
  if (keywords.length >= 2) {
    queries.push({
      query:    keywords.slice(0, 4).join(" "),
      priority: 4,
      label:    "keywords_only",
    });
  }

  // Deduplicate
  const seen  = new Set();
  const final = queries.filter(q => {
    const key = q.query.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log("  Final queries:", final.map(q => `[${q.label}] "${q.query}"`));
  return final;
}

// ── Extract REQUIRED TERMS that must appear in any valid article ───────────────
// Used by articleValidator for hard-gate checks
function extractRequiredTerms(userText) {
  const properNouns = extractProperNouns(userText);
  const actions     = detectAction(userText);

  return {
    // At least ONE of these must appear (main subject)
    anyOf_subjects: properNouns.slice(0, 3).map(n => n.toLowerCase()),

    // At least ONE action should appear (what happened)
    anyOf_actions: actions.length > 0 ? [actions[0].trigger] : [],

    // Critical numbers (scores, money amounts, percentages)
    allOf_numbers: extractCriticalNumbers(userText),
  };
}

// ── Extract story-defining numbers ────────────────────────────────────────────
function extractCriticalNumbers(text) {
  const critical = [];

  const scoreMatch = text.match(
    /\b(\d+)\s*(?:runs?|goals?|points?|wickets?)\b/gi
  );
  if (scoreMatch) critical.push(...scoreMatch.map(m => m.toLowerCase()));

  const bigNumMatch = text.match(
    /\$[\d.]+\s*(?:billion|million|crore|lakh)/gi
  );
  if (bigNumMatch) critical.push(...bigNumMatch.map(m => m.toLowerCase()));

  const pctMatch = text.match(/\b\d+(?:\.\d+)?%/g);
  if (pctMatch) critical.push(...pctMatch);

  return critical;
}

module.exports = {
  buildPreciseQuery,
  extractRequiredTerms,
  extractCriticalNumbers,
};
