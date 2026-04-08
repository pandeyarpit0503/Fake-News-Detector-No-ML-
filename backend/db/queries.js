const crypto = require("crypto");
const pool = require("./connection");

function md5(value) {
    return crypto.createHash("md5").update(String(value || "")).digest("hex");
}

function toNumberOr(defaultValue, value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
}

// ── USERS ─────────────────────────────────────────────────────────────────────

async function createUser(email, passwordHash) {
    try {
        const [result] = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            [email, passwordHash]
        );
        return result.insertId;
    } catch (err) {
        console.error("createUser error:", err.message);
        throw err;
    }
}

async function getUserByEmail(email) {
    try {
        const [[user]] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        return user || null;
    } catch (err) {
        console.error("getUserByEmail error:", err.message);
        return null;
    }
}

async function getUserById(id) {
    try {
        const [[user]] = await pool.query("SELECT * FROM users WHERE user_id = ?", [id]);
        return user || null;
    } catch (err) {
        console.error("getUserById error:", err.message);
        return null;
    }
}

// ── SEARCHES ──────────────────────────────────────────────────────────────────

async function saveSearch({
    userId, newsText, keywords, trustScore, verdict,
    confirmedSources, totalSources, factCheckBonus, sourceCountBoost,
}) {
    const SQL = `INSERT INTO searches
         (user_id, news_text, keywords, trust_score, verdict,
          confirmed_sources, total_sources,
          fact_check_bonus, source_count_boost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = (uid) => [
        uid,
        newsText,
        JSON.stringify(keywords || []),
        trustScore    || 0,
        verdict       || 'UNVERIFIED',
        confirmedSources || 0,
        totalSources     || 0,
        factCheckBonus   || 0,
        sourceCountBoost || 0,
    ];

    try {
        const [result] = await pool.query(SQL, params(userId || null));
        console.log("✅ Search saved with search_id:", result.insertId);
        return result.insertId;
    } catch (err) {
        // If user_id FK fails (stale JWT / DB was reset) → retry as guest so articles still get saved
        if (userId && err.code === 'ER_NO_REFERENCED_ROW_2') {
            console.warn("saveSearch: user_id FK failed — retrying as guest");
            try {
                const [result] = await pool.query(SQL, params(null));
                console.log("✅ Search saved (as guest) with search_id:", result.insertId);
                return result.insertId;
            } catch (e2) {
                console.error("❌ saveSearch retry error:", e2.message, e2.sqlMessage);
                return null;
            }
        }
        console.error("❌ saveSearch error:", err.message, err.sqlMessage);
        return null;
    }
}

async function getSearchById(id) {
    try {
        const [[search]] = await pool.query(
            "SELECT * FROM searches WHERE search_id = ?",
            [id]
        );
        if (!search) return null;

        const [articles] = await pool.query(
            "SELECT * FROM matched_articles WHERE search_id = ? ORDER BY match_score DESC",
            [id]
        );
        const [factChecks] = await pool.query(
            "SELECT * FROM fact_check_results WHERE search_id = ?",
            [id]
        );

        search.keywords = JSON.parse(search.keywords || "[]");
        console.log(`📖 getSearchById(${id}): ${articles.length} articles, ${factChecks.length} fact checks`);
        return { ...search, matchedArticles: articles, factCheckResults: factChecks };
    } catch (err) {
        console.error("❌ getSearchById error:", err.message);
        return null;
    }
}

async function getRecentSearches(limit = 15) {
    try {
        const [rows] = await pool.query(
            `SELECT search_id, user_id, news_text, trust_score, verdict,
              confirmed_sources, total_sources, created_at
       FROM searches
       ORDER BY created_at DESC
       LIMIT ?`,
            [limit]
        );
        return rows;
    } catch (err) {
        console.error("❌ getRecentSearches error:", err.message);
        return [];
    }
}

async function findCachedSearch(newsText) {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM searches
       WHERE news_text = ?
         AND created_at > NOW() - INTERVAL 30 MINUTE
       ORDER BY created_at DESC
       LIMIT 1`,
            [newsText.trim()]
        );
        if (rows[0]) {
            console.log("⚡ Cache hit for search_id:", rows[0].search_id);
        }
        return rows[0] || null;
    } catch (err) {
        console.error("❌ findCachedSearch error:", err.message);
        return null;
    }
}

// ── MATCHED ARTICLES ──────────────────────────────────────────────────────────

async function upsertSemanticArticles(articles) {
    const values = (articles || [])
        .filter(a => a?.url && Array.isArray(a.embeddingVector) && a.embeddingVector.length > 0)
        .map(a => [
            md5(a.url),
            (a.url || "").substring(0, 1000),
            (a.title || "").substring(0, 500),
            a.description || "",
            a.contentExcerpt || "",
            (a.sourceName || a.source?.name || "Unknown").substring(0, 100),
            (a.sourceDomain || getDomain(a.url || "")).substring(0, 100),
            a.publishedAt || null,
            a.articleText || "",
            JSON.stringify(a.embeddingVector),
        ]);

    if (values.length === 0) {
        return 0;
    }

    try {
        await pool.query(
            `INSERT INTO semantic_articles
         (url_hash, url, title, description, content_excerpt,
          source_name, source_domain, published_at, article_text, embedding_vector)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         title            = VALUES(title),
         description      = VALUES(description),
         content_excerpt  = VALUES(content_excerpt),
         source_name      = VALUES(source_name),
         source_domain    = VALUES(source_domain),
         published_at     = VALUES(published_at),
         article_text     = VALUES(article_text),
         embedding_vector = VALUES(embedding_vector),
         last_seen_at     = CURRENT_TIMESTAMP`,
            [values]
        );

        return values.length;
    } catch (err) {
        console.warn("upsertSemanticArticles skipped:", err.message);
        return 0;
    }
}

async function getRecentSemanticArticles(limit = 250) {
    try {
        const [rows] = await pool.query(
            `SELECT
          url, title, description, content_excerpt, source_name,
          source_domain, published_at, article_text, embedding_vector
       FROM semantic_articles
       ORDER BY COALESCE(published_at, last_seen_at) DESC, last_seen_at DESC
       LIMIT ?`,
            [limit]
        );

        return rows
            .map(row => {
                try {
                    return {
                        url: row.url,
                        title: row.title,
                        description: row.description,
                        content: row.content_excerpt,
                        source: row.source_name ? { name: row.source_name } : null,
                        sourceDomain: row.source_domain,
                        publishedAt: row.published_at,
                        articleText: row.article_text,
                        embeddingVector: JSON.parse(row.embedding_vector || "[]"),
                    };
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
    } catch (err) {
        console.warn("getRecentSemanticArticles skipped:", err.message);
        return [];
    }
}

function getDomain(url) {
    try { return new URL(url).hostname.replace("www.", ""); }
    catch { return "unknown"; }
}

async function saveMatchedArticles(searchId, articles) {
    if (!articles || articles.length === 0) {
        console.log("⚠️ saveMatchedArticles: no articles to save");
        return;
    }

    console.log(`💾 Saving ${articles.length} articles for search_id: ${searchId}`);

    try {
        const values = articles.map(a => [
            searchId,                                                        // search_id
            (a.title        || "").substring(0, 500),                        // title
            (a.url          || "").substring(0, 1000),                       // url
            (a.source       || "Unknown").substring(0, 100),                 // source_name
            (a.sourceDomain || getDomain(a.url || "")).substring(0, 100),    // source_domain
            a.tier                           || 4,                           // source_tier
            toNumberOr(0.50, a.signals?.sourceWeight),                       // source_weight
            toNumberOr(0, a.matchScore),                                     // match_score
            toNumberOr(0, a.signals?.semanticScore),                         // semantic_score
            toNumberOr(0, a.signals?.titleSemanticScore),                    // title_semantic_score
            toNumberOr(0, a.signals?.intentScore),                           // intent_score
            a.publishedAt                    || null,                        // published_at
            toNumberOr(0, a.signals?.keywordScore),                          // keyword_score
            toNumberOr(0, a.signals?.entityScore),                           // entity_score
            toNumberOr(0, a.signals?.contradictionPenalty),                  // contradiction_penalty
            toNumberOr(0, a.signals?.numberPenalty),                         // number_penalty
            toNumberOr(0.7, a.signals?.recencyMultiplier),                   // recency_multiplier
        ]);

        console.log("📋 First article row sample:", values[0]);

        try {
            await pool.query(
                `INSERT INTO matched_articles
           (search_id, title, url, source_name, source_domain,
            source_tier, source_weight, match_score, semantic_score,
            title_semantic_score, intent_score, published_at,
            keyword_score, entity_score, contradiction_penalty,
            number_penalty, recency_multiplier)
         VALUES ?`,
                [values]
            );
        } catch (err) {
            if (!String(err.message).includes("Unknown column")) throw err;

            const legacyValues = values.map(([
                rowSearchId, title, url, sourceName, sourceDomain,
                sourceTier, sourceWeight, matchScore, _semanticScore,
                _titleSemanticScore, _intentScore, publishedAt,
                keywordScore, entityScore, contradictionPenalty,
                numberPenalty, recencyMultiplier,
            ]) => [
                rowSearchId, title, url, sourceName, sourceDomain,
                sourceTier, sourceWeight, matchScore, publishedAt,
                keywordScore, entityScore, contradictionPenalty,
                numberPenalty, recencyMultiplier,
            ]);

            await pool.query(
                `INSERT INTO matched_articles
           (search_id, title, url, source_name, source_domain,
            source_tier, source_weight, match_score, published_at,
            keyword_score, entity_score, contradiction_penalty,
            number_penalty, recency_multiplier)
         VALUES ?`,
                [legacyValues]
            );
        }

        console.log(`✅ ${articles.length} articles saved successfully`);
    } catch (err) {
        console.error("❌ saveMatchedArticles error:", err.message, err.sqlMessage);
    }
}

// ── FACT CHECK RESULTS ────────────────────────────────────────────────────────

async function saveFactCheckResults(searchId, claims) {
    if (!claims || claims.length === 0) {
        console.log("⚠️ saveFactCheckResults: no claims to save");
        return;
    }

    console.log(`💾 Saving ${claims.length} fact check claims for search_id: ${searchId}`);

    try {
        const values = claims.map(c => [
            searchId,
            (c.claim   || c.claimText || c.text || "").substring(0, 2000),          // claim_text
            (c.claimBy || c.claimant  || "Unknown").substring(0, 200),              // claim_by
            (c.rating  || c.textualRating || "Unknown").substring(0, 100),          // rating
            (c.url     || c.ratingUrl || "").substring(0, 1000),                    // rating_url
        ]);

        console.log("📋 First claim row sample:", values[0]);

        await pool.query(
            `INSERT INTO fact_check_results
         (search_id, claim_text, claim_by, rating, rating_url)
       VALUES ?`,
            [values]
        );

        console.log(`✅ ${claims.length} fact check results saved`);
    } catch (err) {
        console.error("❌ saveFactCheckResults error:", err.message, err.sqlMessage);
    }
}

// ── STATS ─────────────────────────────────────────────────────────────────────

async function updateDailyStats(verdict, trustScore) {
    const verdictColumn = {
        REAL: "real_count",
        "PARTIALLY CORRECT": "partial_count",
        "FAKE / MISLEADING": "fake_count",
        UNVERIFIED: "unverified_count",
    }[verdict] || "unverified_count";

    try {
        await pool.query(
            `INSERT INTO search_stats
         (stat_date, total_searches, ${verdictColumn}, avg_trust_score)
       VALUES (CURRENT_DATE, 1, 1, ?)
       ON DUPLICATE KEY UPDATE
         total_searches    = total_searches + 1,
         ${verdictColumn}  = ${verdictColumn} + 1,
         avg_trust_score   = ((avg_trust_score * (total_searches - 1)) + ?) / total_searches`,
            [trustScore, trustScore]
        );
    } catch (err) {
        console.error("updateDailyStats error:", err.message);
    }
}

async function getOverallStats() {
    try {
        const [[stats]] = await pool.query(`
      SELECT
        SUM(total_searches)   AS total_searches,
        SUM(real_count)       AS real_count,
        SUM(partial_count)    AS partial_count,
        SUM(fake_count)       AS fake_count,
        SUM(unverified_count) AS unverified_count,
        ROUND(AVG(avg_trust_score), 1) AS avg_trust_score
      FROM search_stats
    `);
        return stats;
    } catch (err) {
        console.error("getOverallStats error:", err.message);
        return null;
    }
}

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    saveSearch,
    getSearchById,
    getRecentSearches,
    findCachedSearch,
    upsertSemanticArticles,
    getRecentSemanticArticles,
    saveMatchedArticles,
    saveFactCheckResults,
    updateDailyStats,
    getOverallStats,
};
