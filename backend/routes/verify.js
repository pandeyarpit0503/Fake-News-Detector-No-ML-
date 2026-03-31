const express = require("express");
const axios = require("axios");
const router = express.Router();

const { extractKeywords }                    = require("../utils/keywords");
const { extractEntities }                    = require("../utils/entities");
const { getMasterScore, getVerdict }         = require("../utils/scoring");
const { detectTopic }                        = require("../utils/topicDetect");
const { buildQueries }                       = require("../utils/queryBuilder");
const { deduplicateArticles, validateArticles } = require("../utils/articleFilter");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'fake-news-detector-super-secret-key-123';
const {
    saveSearch,
    getSearchById,
    findCachedSearch,
    saveMatchedArticles,
    saveFactCheckResults,
    updateDailyStats,
} = require("../db/queries");

const GNEWS_KEY    = process.env.GNEWS_API_KEY;
const FACTCHECK_KEY = process.env.GOOGLE_FACT_CHECK_KEY;

// Optional auth — silently decodes JWT, falls back to guest on any error
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return next();
    const token = authHeader.split(' ')[1];
    if (!token) return next();
    try {
        req.user = jwt.verify(token, JWT_SECRET);
    } catch {
        req.user = null;
    }
    next();
}

router.post("/", optionalAuth, async (req, res) => {
    try {
        const { news } = req.body;

        if (!news || news.trim().length < 10) {
            return res.status(400).json({
                error: "Please enter at least 10 characters of news text.",
            });
        }

        console.log("\n=== NEW VERIFY REQUEST ===");
        console.log("Input:", news.substring(0, 100), "...");

        // ── CACHE CHECK ──────────────────────────────────────────────────────
        try {
            const cached = await findCachedSearch(news);
            if (cached) {
                const fullCached = await getSearchById(cached.search_id);
                if (fullCached) return res.json({ ...fullCached, fromCache: true });
            }
        } catch (cacheErr) {
            console.warn("Cache check skipped:", cacheErr.message);
        }

        // STEP 1: Extract keywords and entities
        const keywords   = extractKeywords(news);
        const entities   = extractEntities(news);
        const topicInfo  = detectTopic(news);

        console.log("Keywords:", keywords);
        console.log("Entities:", entities.properNouns.slice(0, 5));
        console.log(`Topic detected: ${topicInfo.topic} (${topicInfo.confidence} keywords: [${topicInfo.matchedKeywords.slice(0, 4).join(", ")}])`);

        // STEP 2: Build 3 query variants and fetch from GNews in parallel
        const queries = buildQueries(news, keywords, entities, topicInfo);
        console.log("Built queries:", queries);

        let gnewsArticles = [];
        try {
            const gnewsFetches = queries.map(q =>
                axios.get("https://gnews.io/api/v4/search", {
                    params: { q, lang: "en", max: 10, token: GNEWS_KEY },
                    timeout: 8000,
                }).catch(err => {
                    console.warn(`GNews query "${q}" failed:`, err.message);
                    return { data: { articles: [] } };
                })
            );

            const gnewsResults = await Promise.all(gnewsFetches);
            const resultSets   = gnewsResults.map(r => r.data?.articles || []);
            const rawArticles  = deduplicateArticles(resultSets);

            console.log(`GNews: ${resultSets.reduce((s, a) => s + a.length, 0)} total → ${rawArticles.length} unique after dedup`);

            // STEP 2b: Validation filter — discard off-topic / low-overlap articles
            gnewsArticles = validateArticles(rawArticles, keywords, topicInfo);
        } catch (err) {
            console.error("GNews pipeline error:", err.message);
        }

        // STEP 3: Fetch from Google Fact Check API (use primary query)
        const primaryQuery = queries[0] || keywords.join(" ");
        let factCheckClaims = [];
        try {
            const factRes = await axios.get(
                "https://factchecktools.googleapis.com/v1alpha1/claims:search",
                {
                    params: { query: primaryQuery, key: FACTCHECK_KEY, languageCode: "en" },
                    timeout: 8000,
                }
            );
            factCheckClaims = factRes.data.claims || [];
            console.log(`FactCheck: ${factCheckClaims.length} claims found`);
        } catch (err) {
            console.error("FactCheck API error:", err.message);
        }

        // STEP 4: Calculate master score (new engine)
        const scoreResult = getMasterScore(gnewsArticles, factCheckClaims, news);
        const trustScore  = scoreResult.score;

        // STEP 5: Get verdict — pass confirmedCount for richer descriptions
        const verdict = getVerdict(trustScore, scoreResult.confirmedCount || 0);
        console.log(`Trust Score: ${trustScore} | Verdict: ${verdict.label}`);

        // STEP 6: Map matched articles (score >= 0 → keep all, sorted by confidence)
        const matchedArticles = (scoreResult.scoredArticles || [])
            .filter(a => a.confidence >= 0)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 6)
            .map(a => ({
                title:        a.article.title        || "",
                url:          a.article.url          || "",
                source:       a.article.source?.name || a.sourceInfo?.name || "Unknown",
                sourceDomain: a.sourceInfo?.domain || (() => {
                    try { return new URL(a.article.url).hostname.replace("www.", ""); }
                    catch { return "unknown"; }
                })(),
                publishedAt:  a.article.publishedAt  || null,
                matchScore:   +(a.confidence * 100).toFixed(1),
                isConfirming: a.isConfirming,
                tier:         a.sourceInfo?.tier      || 4,
                signals:      a.signals               || {},
            }));

        console.log("matchedArticles to save:", matchedArticles.length);

        // STEP 7: Map fact check results (Google Fact Check API structure)
        const factCheckResults = factCheckClaims.slice(0, 5).map(c => ({
            claim:   c.text      || "",
            claimBy: c.claimant  || "Unknown",
            rating:  c.claimReview?.[0]?.textualRating || "Unknown",
            url:     c.claimReview?.[0]?.url           || "",
        }));

        console.log("factCheckResults to save:", factCheckResults.length);

        // ── SAVE TO DATABASE (BEFORE res.json) ───────────────────────────────
        let searchId = null;
        try {
            searchId = await saveSearch({
                userId:           req.user ? req.user.user_id || req.user.id : null,
                newsText:         news,
                keywords,
                trustScore,
                verdict:          verdict.label,
                confirmedSources: scoreResult.confirmedCount || 0,
                totalSources:     gnewsArticles.length,
                factCheckBonus:   scoreResult.factBonus      || 0,
                sourceCountBoost: scoreResult.countBoost     || 0,
            });

            if (searchId) {
                await saveMatchedArticles(searchId, matchedArticles);
                await saveFactCheckResults(searchId, factCheckResults);
                await updateDailyStats(verdict.label, trustScore);
                console.log("✅ All data saved for search_id:", searchId);
            } else {
                console.error("❌ searchId is null — skipping related saves");
            }
        } catch (dbErr) {
            console.error("DB save failed (non-fatal):", dbErr.message);
        }

        // ── RESPOND ──────────────────────────────────────────────────────────
        return res.json({
            searchId,
            fromCache:           false,
            trustScore,
            verdict,
            keywords,
            entities,
            topicInfo,
            matchedArticles,
            factCheckResults,
            totalSourcesChecked: gnewsArticles.length,
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
        });

    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({
            error: "Something went wrong. Please try again.",
        });
    }
});

module.exports = router;
