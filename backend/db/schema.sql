-- Run this file to initialise the fakenews_db schema
-- Usage: mysql -u root -p < db/schema.sql

DROP DATABASE IF EXISTS fakenews_db;
CREATE DATABASE fakenews_db;
USE fakenews_db;

-- TABLE 1: users
CREATE TABLE IF NOT EXISTS users (
    user_id      INT AUTO_INCREMENT PRIMARY KEY,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: searches
CREATE TABLE IF NOT EXISTS searches (
  search_id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT,                         -- FK → users.user_id (NULL = guest)
  news_text           TEXT NOT NULL,
  keywords            JSON,
  trust_score         DECIMAL(5,2),
  verdict             VARCHAR(30),
  confirmed_sources   INT DEFAULT 0,
  total_sources       INT DEFAULT 0,
  fact_check_bonus    DECIMAL(5,2) DEFAULT 0,
  source_count_boost  DECIMAL(5,2) DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_verdict    (verdict),
  INDEX idx_user_id    (user_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- TABLE 3: matched_articles
CREATE TABLE IF NOT EXISTS matched_articles (
  article_id            INT AUTO_INCREMENT PRIMARY KEY,
  search_id             INT NOT NULL,              -- FK → searches.search_id
  title                 TEXT,
  url                   TEXT,
  source_name           VARCHAR(100),
  source_domain         VARCHAR(100),
  source_tier           INT,
  source_weight         DECIMAL(3,2),
  match_score           DECIMAL(5,2),
  semantic_score        DECIMAL(5,2),
  title_semantic_score  DECIMAL(5,2),
  intent_score          DECIMAL(5,2),
  published_at          TIMESTAMP NULL,
  keyword_score         DECIMAL(5,2),
  entity_score          DECIMAL(5,2),
  contradiction_penalty DECIMAL(5,2),
  number_penalty        DECIMAL(5,2),
  recency_multiplier    DECIMAL(3,2),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (search_id) REFERENCES searches(search_id) ON DELETE CASCADE,
  INDEX idx_search_id (search_id)
);

-- TABLE 4: semantic_articles
CREATE TABLE IF NOT EXISTS semantic_articles (
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
);

-- TABLE 5: fact_check_results
CREATE TABLE IF NOT EXISTS fact_check_results (
  fact_check_id INT AUTO_INCREMENT PRIMARY KEY,
  search_id     INT NOT NULL,                      -- FK → searches.search_id
  claim_text    TEXT,
  claim_by      VARCHAR(200),
  rating        VARCHAR(100),
  rating_url    TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (search_id) REFERENCES searches(search_id) ON DELETE CASCADE,
  INDEX idx_search_id (search_id)
);

-- TABLE 6: search_stats (daily aggregates)
CREATE TABLE IF NOT EXISTS search_stats (
  stat_id          INT AUTO_INCREMENT PRIMARY KEY,
  stat_date        DATE UNIQUE DEFAULT (CURRENT_DATE),
  total_searches   INT DEFAULT 0,
  real_count       INT DEFAULT 0,
  partial_count    INT DEFAULT 0,
  fake_count       INT DEFAULT 0,
  unverified_count INT DEFAULT 0,
  avg_trust_score  DECIMAL(5,2) DEFAULT 0,
  INDEX idx_stat_date (stat_date)
);
