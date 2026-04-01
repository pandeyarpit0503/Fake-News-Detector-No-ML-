const express = require("express");
const axios   = require("axios");
const router  = express.Router();
const jwt     = require("jsonwebtoken");

const { extractKeywords }             = require("../utils/keywords");
const { extractEntities }             = require("../utils/entities");
const { detectTopic }                 = require("../utils/topicDetect");
const { buildPreciseQuery }           = require("../utils/smartQueryBuilder");
const { validateArticle,
        clearRequestCache }           = require("../utils/articleValidator");
const { getMasterScore, getVerdict }  = require("../utils/scoring");
const { getSourceInfo }              = require("../utils/sources");
const {
  saveSearch,
  getSearchById,
  findCachedSearch,
  saveMatchedArticles,
  saveFactCheckResults,
  updateDailyStats,
} = require("../db/queries");

const GNEWS_KEY     = process.env.GNEWS_API_KEY;
const FACTCHECK_KEY = process.env.GOOGLE_FACT_CHECK_KEY;
const JWT_SECRET    = process.env.JWT_SECRET || "fake-news-detector-super-secret-key-123";

// ── Optional auth — silently decodes JWT, falls back to guest on error ──────
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return next();
  const token = authHeader.split(" ")[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}

// ── POST /api/verify ──────────────────────────────────────────────────────────
router.post("/", optionalAuth, async (req, res) => {
  // Clear per-request caches from articleValidator
  clearRequestCache();

  const startTime = Date.now();

  try {
    const { news } = req.body;

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║  NEW VERIFICATION REQUEST                ║");
    console.log(`║  "${(news || "").substring(0, 38)}"  ║`);
    console.log("╚══════════════════════════════════════════╝");

    // ── INPUT VALIDATION ────────────────────────────────────────────────────
    if (!news || news.trim().length < 10) {
      return res.status(400).json({
        error: "Please enter at least 10 characters of news text.",
      });
    }

    // ── CACHE CHECK ──────────────────────────────────────────────────────────
    try {
      const cached = await findCachedSearch(news);
      if (cached) {
        const fullCached = await getSearchById(cached.search_id);
        if (fullCached) {
          console.log("⚡ Cache hit:", cached.search_id);
          return res.json({ ...fullCached, fromCache: true });
        }
      }
    } catch (cacheErr) {
      console.warn("Cache check skipped:", cacheErr.message);
    }

    // ── STEP 1: Extract info from user input ─────────────────────────────────
    const keywords  = extractKeywords(news);
    const entities  = extractEntities(news);
    const topicInfo = detectTopic(news);  // { topic, confidence, matchedKeywords }

    console.log("\n📋 EXTRACTION:");
    console.log("  Keywords:", keywords);
    console.log("  Topic:", topicInfo.topic, `(${topicInfo.confidence} matches)`);
    console.log("  Proper nouns:", entities.properNouns?.slice(0, 5));

    // ── STEP 2: Build precise search queries (Layer 1) ───────────────────────
    // buildPreciseQuery uses proper nouns + action verbs for targeted queries
    const searchQueries = buildPreciseQuery(news);

    console.log("\n🔍 SEARCH QUERIES:");
    searchQueries.forEach(q => {
      console.log(`  [${q.priority}] "${q.query}"`);
    });

    // ── STEP 3: Fetch articles from GNews ────────────────────────────────────
    const allArticles = [];
    const seenUrls    = new Set();

    // Use top 2 queries to avoid burning GNews quota
    const queriesToRun = searchQueries.filter(q => q.priority <= 2);

    for (const { query, label, priority } of queriesToRun) {
      try {
        const gnewsRes = await axios.get("https://gnews.io/api/v4/search", {
          params: {
            q:      query,
            lang:   "en",
            max:    10,
            token:  GNEWS_KEY,
            sortby: "relevance",   // ← relevance not date
          },
          timeout: 8000,
        });

        const articles = gnewsRes.data?.articles || [];
        console.log(`\n  GNews [${label}] "${query}": ${articles.length} results`);

        articles.forEach((a, i) => {
          console.log(`    [${i + 1}] "${(a.title || "").substring(0, 55)}"`);
          if (!seenUrls.has(a.url)) {
            seenUrls.add(a.url);
            allArticles.push(a);
          }
        });
      } catch (err) {
        console.error(`  GNews error [${label}]:`, err.message);
      }
    }

    // Fallback: if both targeted queries returned nothing, try keywords
    if (allArticles.length === 0 && searchQueries.length > 2) {
      const fallback = searchQueries.find(q => q.priority > 2);
      if (fallback) {
        try {
          console.log(`\n  GNews FALLBACK "${fallback.query}"`);
          const res = await axios.get("https://gnews.io/api/v4/search", {
            params: {
              q:      fallback.query,
              lang:   "en",
              max:    10,
              token:  GNEWS_KEY,
              sortby: "relevance",
            },
            timeout: 8000,
          });
          (res.data?.articles || []).forEach(a => {
            if (!seenUrls.has(a.url)) {
              seenUrls.add(a.url);
              allArticles.push(a);
            }
          });
        } catch (err) {
          console.error("  GNews fallback error:", err.message);
        }
      }
    }

    console.log(`\n📦 Total unique articles fetched: ${allArticles.length}`);
    console.log("\n--- RAW GNEWS RESULTS ---");
    allArticles.forEach((a, i) => {
      console.log(`[${i + 1}] "${a.title}"`);
      console.log(`     Source: ${a.source?.name}`);
      console.log(`     URL: ${a.url}`);
    });

    // ── STEP 4: STRICT ARTICLE VALIDATION (Layer 2) ──────────────────────────
    // Every article goes through 5 checks:
    // 1. Subject presence  (hard gate — proper noun must appear)
    // 2. Title word overlap (sanity check)
    // 3. Topic mismatch    (cross-domain rejection)
    // 4. Embedding similarity (semantic gate, threshold from .env)
    // 5. Contradiction detection

    console.log("\n🔬 VALIDATING ARTICLES...");

    const validArticles          = [];
    const contradictingArticles  = [];
    const rejectedArticles       = [];

    // Run all validations in parallel for speed
    const validationResults = await Promise.all(
      allArticles.map(async article => ({
        article,
        validation: await validateArticle(news, article),
      }))
    );

    validationResults.forEach(({ article, validation }) => {
      if (!validation.pass) {
        rejectedArticles.push({
          title:  (article.title || "").substring(0, 55),
          reason: validation.reason,
        });
      } else if (validation.isContradicting) {
        contradictingArticles.push({
          ...article,
          _validationScore: validation.score,
          _isContradicting: true,
        });
        console.log(`  ⚠️  Contradicting: "${(article.title || "").substring(0, 45)}"`);
      } else {
        validArticles.push({
          ...article,
          _validationScore: validation.score,
          _isContradicting: false,
        });
        console.log(`  ✅ Accepted: "${(article.title || "").substring(0, 45)}" (${validation.score.toFixed(3)})`);
      }
    });

    console.log("\n📊 VALIDATION SUMMARY:");
    console.log(`  ✅ Accepted:       ${validArticles.length}`);
    console.log(`  ⚠️  Contradicting:  ${contradictingArticles.length}`);
    console.log(`  ❌ Rejected:       ${rejectedArticles.length}`);
    if (rejectedArticles.length > 0) {
      console.log("\n  Rejection reasons:");
      rejectedArticles.forEach(r => {
        console.log(`    "${r.title}" → ${r.reason}`);
      });
    }

    console.log("\n--- AFTER FILTERING ---");
    validArticles.forEach((a, i) => {
      console.log(`[${i + 1}] "${a.title}"`);
    });
    console.log("Total after filter:", validArticles.length);

    // ── STEP 5: Google Fact Check ─────────────────────────────────────────────
    let factCheckClaims = [];
    try {
      const fcQuery = keywords.slice(0, 4).join(" ");
      const fcRes   = await axios.get(
        "https://factchecktools.googleapis.com/v1alpha1/claims:search",
        {
          params: { query: fcQuery, key: FACTCHECK_KEY, languageCode: "en" },
          timeout: 8000,
        }
      );
      const rawClaims = fcRes.data?.claims || [];
      console.log(`\n🔍 Fact Check: ${rawClaims.length} raw claims`);

      // Validate fact-check claims through the same gate
      const fcValidations = await Promise.all(
        rawClaims.map(async claim => ({
          claim,
          validation: await validateArticle(news, {
            title:       claim.text     || "",
            description: claim.claimant || "",
          }),
        }))
      );

      factCheckClaims = fcValidations
        .filter(r => r.validation.pass)
        .map(r => r.claim);

      console.log(`   After validation: ${factCheckClaims.length} claims`);
    } catch (err) {
      console.error("Fact check error:", err.message);
    }

    // ── STEP 6: Score valid articles ──────────────────────────────────────────
    // getMasterScore is synchronous — runs the keyword+entity+recency scorer
    const scoreResult = getMasterScore(validArticles, factCheckClaims, news);

    // Apply contradiction penalty (-8 pts per contradicting source)
    if (contradictingArticles.length > 0) {
      const penalty = contradictingArticles.length * 8;
      scoreResult.score = Math.max(0, scoreResult.score - penalty);
      console.log(`\n⚠️  Contradiction penalty: -${penalty} points`);
    }

    const trustScore = scoreResult.score;
    const verdict    = getVerdict(trustScore, scoreResult.confirmedCount || 0);

    console.log("\n🎯 FINAL RESULT:");
    console.log(`  Trust Score: ${trustScore}`);
    console.log(`  Verdict: ${verdict.label}`);
    console.log(`  Duration: ${Date.now() - startTime}ms`);

    // ── STEP 7: Format matched articles for response ──────────────────────────
    const matchedArticles = (scoreResult.scoredArticles || [])
      .filter(a => a.confidence > 0.01)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8)
      .map(a => {
        let sourceDomain = "unknown";
        try {
          sourceDomain = new URL(a.article.url).hostname.replace("www.", "");
        } catch {}

        return {
          title:        a.article.title        || "No title",
          url:          a.article.url          || "",
          source:       a.article.source?.name || a.sourceInfo?.name || sourceDomain,
          sourceDomain,
          publishedAt:  a.article.publishedAt  || null,
          matchScore:   +(a.confidence * 100).toFixed(1),
          tier:         a.sourceInfo?.tier      || 4,
          isConfirming: a.isConfirming,
          signals:      a.signals               || {},
        };
      });

    console.log("\n--- FINAL MATCHED ARTICLES ---");
    matchedArticles.forEach((a, i) => {
      console.log(`[${i + 1}] "${a.title}"`);
      console.log(`     Score: ${a.matchScore}%`);
      console.log(`     Confirming: ${a.isConfirming}`);
    });
    console.log("==========================================\n");

    // ── STEP 8: Format fact-check results ────────────────────────────────────
    const factCheckResults = factCheckClaims.slice(0, 5).map(c => ({
      claim:   c.text                            || "",
      claimBy: c.claimant                        || "Unknown",
      rating:  c.claimReview?.[0]?.textualRating || "Unknown",
      url:     c.claimReview?.[0]?.url           || "",
    }));

    // ── STEP 9: Save to database ──────────────────────────────────────────────
    let searchId = null;
    try {
      searchId = await saveSearch({
        userId:           req.user ? req.user.user_id || req.user.id : null,
        newsText:         news,
        keywords,
        trustScore,
        verdict:          verdict.label,
        confirmedSources: scoreResult.confirmedCount || 0,
        totalSources:     validArticles.length,
        factCheckBonus:   scoreResult.factBonus      || 0,
        sourceCountBoost: scoreResult.countBoost     || 0,
      });

      if (searchId) {
        await saveMatchedArticles(searchId, matchedArticles);
        await saveFactCheckResults(searchId, factCheckResults);
        await updateDailyStats(verdict.label, trustScore);
        console.log("✅ All data saved for search_id:", searchId);
      }
    } catch (dbErr) {
      console.error("DB save error (non-fatal):", dbErr.message);
    }

    // ── STEP 10: Respond ──────────────────────────────────────────────────────
    return res.json({
      searchId,
      fromCache:    false,
      trustScore,
      verdict,
      keywords,
      entities,
      topicInfo,
      matchedArticles,
      factCheckResults,
      totalSourcesChecked: validArticles.length,
      confirmedSources:    scoreResult.confirmedCount || 0,
      tier1Sources:        scoreResult.tier1Count     || 0,
      scoreBreakdown: {
        confirmedSources: scoreResult.confirmedCount || 0,
        tier1Sources:     scoreResult.tier1Count     || 0,
        avgConfidence:    +((scoreResult.avgConfidence || 0) * 100).toFixed(1),
        factCheckBonus:   scoreResult.factBonus      || 0,
        tier1Bonus:       scoreResult.countBoost     || 0,
        scoreRange: {
          floor:   scoreResult.scoreRange?.floor,
          ceiling: scoreResult.scoreRange?.ceiling,
        },
      },
      pipeline: {
        fetched:          allArticles.length,
        accepted:         validArticles.length,
        contradicting:    contradictingArticles.length,
        rejected:         rejectedArticles.length,
        confirmedSources: scoreResult.confirmedCount || 0,
        tier1Sources:     scoreResult.tier1Count     || 0,
        durationMs:       Date.now() - startTime,
      },
    });

  } catch (err) {
    console.error("❌ VERIFY ROUTE ERROR:", err);
    return res.status(500).json({
      error: "Verification failed. Please try again.",
    });
  }
});

module.exports = router;
