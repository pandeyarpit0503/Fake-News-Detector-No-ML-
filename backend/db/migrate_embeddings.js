// One-shot migration script — run with: node db/migrate_embeddings.js
require("dotenv").config();
const pool = require("./connection");

const SQL = `
CREATE TABLE IF NOT EXISTS embedding_cache (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  text_hash        VARCHAR(32) UNIQUE NOT NULL,
  text_preview     VARCHAR(100),
  embedding_vector MEDIUMTEXT NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_text_hash (text_hash)
);

CREATE TABLE IF NOT EXISTS article_similarity_log (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  search_id         INT,
  article_url       VARCHAR(500),
  article_title     VARCHAR(500),
  semantic_score    DECIMAL(5,4),
  keyword_score     DECIMAL(5,4),
  final_score       DECIMAL(5,4),
  is_accepted       TINYINT(1) DEFAULT 0,
  reject_reason     VARCHAR(200),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (search_id)
    REFERENCES searches(search_id)
    ON DELETE CASCADE,
  INDEX idx_search_id (search_id)
);
`;

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log("Running embedding table migration...");

    // Execute each statement separately (pool doesn't support multi-statement by default)
    const statements = SQL.split(";").map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await conn.query(stmt);
      // Print just the table name from CREATE TABLE
      const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) console.log(`  ✅ Table "${match[1]}" ready`);
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
