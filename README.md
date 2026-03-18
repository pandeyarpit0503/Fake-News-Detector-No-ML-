# 🔍 Fake News Detector

A full-stack web application that verifies news headlines and paragraphs using **pure algorithmic logic** — no AI APIs.

## 🏗️ Tech Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | React + Vite + Tailwind CSS v4 |
| Backend  | Node.js + Express             |
| Database | MySQL (via mysql2)            |
| APIs     | GNews API + Google Fact Check |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+
- GNews API key: [gnews.io](https://gnews.io)
- Google Fact Check key: [Google Cloud Console](https://console.cloud.google.com/)

### 1. Database Setup

```bash
# Create the database and tables
mysql -u root -p < backend/db/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
```

Edit `backend/.env`:
```env
PORT=5000
GNEWS_API_KEY=your_key_here
GOOGLE_FACT_CHECK_KEY=your_key_here

DB_HOST=localhost
DB_PORT=3306
DB_NAME=fakenews_db
DB_USER=root
DB_PASSWORD=your_password
```

```bash
npm run dev       # starts with nodemon hot-reload
# or
npm start         # production start
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # starts Vite dev server on http://localhost:5173
```

---

## 📊 Scoring Engine

| Signal                   | Max Points | Description                        |
|--------------------------|------------|-------------------------------------|
| Keyword Similarity       | +40        | Jaccard similarity of keywords      |
| Named Entity Match       | +20        | Proper nouns, numbers, years, %     |
| Google Fact Check Bonus  | ±25        | From public fact-check database     |
| Source Count Boost       | +15        | More confirmations = more trust     |
| Contradiction Penalty    | −30        | Sentiment mismatch with article     |
| Number Mismatch Penalty  | −20        | Key numbers don't match sources     |
| Recency Multiplier       | ×0.4–1.0   | Older articles trusted less         |

### Verdict Thresholds

| Score Range | Verdict             |
|-------------|---------------------|
| ≥ 70        | ✅ REAL              |
| 40 – 69     | ⚠️ PARTIALLY CORRECT |
| 1 – 39      | ❌ FAKE / MISLEADING |
| 0           | ❓ UNVERIFIED        |

---

## 📁 Folder Structure

```
project/
├── backend/
│   ├── server.js           ← Express app
│   ├── .env                ← API keys + DB creds
│   ├── routes/
│   │   ├── verify.js       ← POST /api/verify
│   │   └── history.js      ← GET /api/history, /stats
│   ├── utils/
│   │   ├── keywords.js     ← Keyword extractor + stopwords
│   │   ├── entities.js     ← Named entity extractor + scorer
│   │   ├── similarity.js   ← Jaccard similarity
│   │   ├── contradiction.js← Sentiment + number mismatch
│   │   ├── recency.js      ← Recency multiplier
│   │   ├── sources.js      ← Source trust tiers
│   │   └── scoring.js      ← Master scoring engine
│   └── db/
│       ├── connection.js   ← MySQL pool
│       ├── schema.sql      ← Table definitions
│       └── queries.js      ← SQL helpers
└── frontend/
    └── src/
        ├── App.jsx         ← Router + navbar
        ├── pages/
        │   ├── Home.jsx
        │   ├── History.jsx
        │   ├── HistoryDetail.jsx
        │   └── Stats.jsx
        └── components/
            ├── InputSection.jsx
            ├── ScoreMeter.jsx       ← Circular SVG ring
            ├── VerdictBadge.jsx
            ├── SourceCard.jsx       ← Signals hover tooltip
            ├── KeywordTags.jsx
            ├── FactCheckResults.jsx
            └── ScoreBreakdown.jsx
```

---

## 🛡️ Important Notes

1. **No AI APIs** — all scoring is pure code-based logic
2. Results are always returned even if one API fails
3. Same news within 30 minutes returns a cached DB result (⚡ badge)
4. All external article links open in a new tab
5. Mobile-responsive design

---

## 📄 License

MIT
