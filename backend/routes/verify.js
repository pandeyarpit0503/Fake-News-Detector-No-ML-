const express = require("express");
const axios = require("axios");
const router = express.Router();

const { extractKeywords } = require("../utils/keywords");
const { extractEntities } = require("../utils/entities");
const { getMasterScore, getVerdict } = require("../utils/scoring");
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

const GNEWS_KEY = process.env.GNEWS_API_KEY;
const FACTCHECK_KEY = process.env.GOOGLE_FACT_CHECK_KEY;

// Optional auth middleware — silently decodes JWT if present, falls back to guest on any error
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return next();
    const token = authHeader.split(' ')[1];
    if (!token) return next();
    try {
        req.user = jwt.verify(token, JWT_SECRET);
    } catch {
        req.user = null; // expired / invalid token → treat as guest
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

        // ── CACHE CHECK ──────────────────────────────────────────────────────────
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
        const keywords = extractKeywords(news);
        const entities = extractEntities(news);
        const query = keywords.join(" ");

        console.log("Keywords:", keywords);
        console.log("Entities (properNouns):", entities.properNouns.slice(0, 5));

        // STEP 2: Fetch from GNews API
        let gnewsArticles = [];
        let gnewsError = null;
        console.log("🔍 GNEWS_KEY present:", !!GNEWS_KEY, "| Key prefix:", GNEWS_KEY?.substring(0, 6));
        try {
            const gnewsRes = await axios.get("https://gnews.io/api/v4/search", {
                params: { q: query, lang: "en", max: 10, token: GNEWS_KEY },
                timeout: 8000,
            });
            gnewsArticles = gnewsRes.data.articles || [];
            console.log(`GNews: ${gnewsArticles.length} articles found`);
        } catch (err) {
            gnewsError = { msg: err.message, status: err.response?.status, data: err.response?.data };
            console.error("GNews API error:", err.message);
            console.error("GNews status:", err.response?.status);
            console.error("GNews response:", JSON.stringify(err.response?.data));
        }

        // STEP 3: Fetch from Google Fact Check API
        let factCheckClaims = [];
        try {
            const factRes = await axios.get(
                "https://factchecktools.googleapis.com/v1alpha1/claims:search",
                {
                    params: { query, key: FACTCHECK_KEY, languageCode: "en" },
                    timeout: 8000,
                }
            );
            factCheckClaims = factRes.data.claims || [];
            console.log(`FactCheck: ${factCheckClaims.length} claims found`);
        } catch (err) {
            console.error("FactCheck API error:", err.message);
        }

        // STEP 4: Calculate master score
        const scoreResult = getMasterScore(gnewsArticles, factCheckClaims, news);
        const trustScore = typeof scoreResult === "number" ? scoreResult : scoreResult.score;

        // DEBUG: show what scoring produced
        console.log(`📊 scoredArticles: ${scoreResult.scoredArticles?.length || 0} total`);
        if (scoreResult.scoredArticles?.length > 0) {
            const scores = scoreResult.scoredArticles.map(a => a.score.toFixed(2));
            console.log(`📊 Article scores: [${scores.join(", ")}]`);
        }

        // STEP 5: Get verdict
        const verdict = getVerdict(trustScore);
        console.log(`Trust Score: ${trustScore} | Verdict: ${verdict.label}`);

        // STEP 6: Map matched articles — includes sourceDomain for DB save
        // Use score >= 0 to keep all articles (even low-scoring ones) so the DB is populated
        const matchedArticles = (scoreResult.scoredArticles || [])
            .filter(a => a.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(a => ({
                title:        a.article.title        || "",
                url:          a.article.url          || "",
                source:       a.article.source?.name || "Unknown",
                sourceDomain: (() => {
                    try { return new URL(a.article.url).hostname.replace("www.", ""); }
                    catch { return "unknown"; }
                })(),
                publishedAt:  a.article.publishedAt  || null,
                matchScore:   +(a.score).toFixed(1),
                tier:         a.sourceInfo?.tier      || 4,
                signals:      a.signals               || {},
            }));

        console.log("Mapped matchedArticles count:", matchedArticles.length);
        if (matchedArticles[0]) console.log("First article sample:", matchedArticles[0]);

        // STEP 7: Map fact check results — handles Google Fact Check API structure
        const factCheckResults = factCheckClaims.slice(0, 5).map(c => ({
            claim:   c.text      || "",
            claimBy: c.claimant  || "Unknown",
            rating:  c.claimReview?.[0]?.textualRating || "Unknown",
            url:     c.claimReview?.[0]?.url           || "",
        }));

        console.log("Mapped factCheckResults:", factCheckResults);

        // ── SAVE TO DATABASE (MUST happen BEFORE res.json) ───────────────────────
        let searchId = null;
        try {
            searchId = await saveSearch({
                userId:          req.user ? req.user.user_id || req.user.id : null,
                newsText:        news,
                keywords,
                trustScore,
                verdict:         verdict.label,
                confirmedSources: scoreResult.confirmedCount || 0,
                totalSources:    gnewsArticles.length,
                factCheckBonus:  scoreResult.factBonus       || 0,
                sourceCountBoost: scoreResult.countBoost     || 0,
            });

            if (searchId) {
                await saveMatchedArticles(searchId, matchedArticles);
                await saveFactCheckResults(searchId, factCheckResults);
                await updateDailyStats(verdict.label, trustScore);
                console.log("All data saved for search_id:", searchId);
            } else {
                console.error("❌ searchId is null — skipping related saves");
            }
        } catch (dbErr) {
            console.error("DB save failed (non-fatal):", dbErr.message);
        }

        // ── RESPOND ONLY AFTER ALL SAVES COMPLETE ────────────────────────────────
        return res.json({
            searchId,
            fromCache:           false,
            trustScore,
            verdict,
            keywords,
            entities,
            matchedArticles,
            factCheckResults,
            totalSourcesChecked: gnewsArticles.length,
            confirmedSources:    scoreResult.confirmedCount || 0,
            scoreBreakdown: {
                sourceCountBoost: scoreResult.countBoost || 0,
                factCheckBonus:   scoreResult.factBonus  || 0,
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
