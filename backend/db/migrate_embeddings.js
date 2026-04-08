// One-shot migration script — run with: node db/migrate_embeddings.js
require("dotenv").config();
const pool = require("./connection");

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS embedding_cache (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    text_hash        VARCHAR(32) UNIQUE NOT NULL,
    text_preview     VARCHAR(100),
    embedding_vector MEDIUMTEXT NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_text_hash (text_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS semantic_articles (
    semantic_article_id INT AUTO_INCREMENT PRIMARY KEY,
    url_hash            VARCHAR(32) UNIQUE NOT NULL,
    url                 VARCHAR(1000) NOT NULL,
    title               VARCHAR(500),
    description         TEXT,
    content_excerpt     MEDIUMTEXT,
    source_name         VARCHAR(100),
    source_domain       VARCHAR(100),
    published_at        TIMESTAMP NULL,
    article_text        MEDIUMTEXT NOT NULL,
    embedding_vector    MEDIUMTEXT NOT NULL,
    first_seen_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_source_domain (source_domain),
    INDEX idx_published_at (published_at),
    INDEX idx_last_seen_at (last_seen_at)
  )`,
  `CREATE TABLE IF NOT EXISTS article_similarity_log (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    search_id      INT,
    article_url    VARCHAR(500),
    article_title  VARCHAR(500),
    semantic_score DECIMAL(5,4),
    keyword_score  DECIMAL(5,4),
    final_score    DECIMAL(5,4),
    is_accepted    TINYINT(1) DEFAULT 0,
    reject_reason  VARCHAR(200),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (search_id)
      REFERENCES searches(search_id)
      ON DELETE CASCADE,
    INDEX idx_search_id (search_id)
  )`,
  `ALTER TABLE matched_articles
    ADD COLUMN IF NOT EXISTS semantic_score DECIMAL(5,2) NULL AFTER match_score`,
  `ALTER TABLE matched_articles
    ADD COLUMN IF NOT EXISTS title_semantic_score DECIMAL(5,2) NULL AFTER semantic_score`,
  `ALTER TABLE matched_articles
    ADD COLUMN IF NOT EXISTS intent_score DECIMAL(5,2) NULL AFTER title_semantic_score`,
];

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log("Running embedding table migration...");

    for (const stmt of STATEMENTS) {
      await conn.query(stmt);
      const createMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      const alterMatch = stmt.match(/ALTER TABLE (\w+)/i);
      const match = createMatch;
      if (createMatch) {
      if (match) console.log(`  ✅ Table "${match[1]}" ready`);
      } else if (alterMatch) {
        console.log(`  Updated "${alterMatch[1]}"`);
      }
    }

    // Verify
    const [tables] = await conn.query("SHOW TABLES");
    console.log("\nAll tables in fakenews_db:");
    tables.forEach(r => console.log(" •", Object.values(r)[0]));
    console.log("\n✅ Migration complete");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
