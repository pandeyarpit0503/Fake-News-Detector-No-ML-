const express = require("express");
const router = express.Router();
const {
    getRecentSearches,
    getSearchById,
    getOverallStats,
} = require("../db/queries");

// GET /api/history — last N searches
router.get("/", async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const searches = await getRecentSearches(limit);
        res.json({ searches });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// GET /api/history/stats/overview — overall platform stats
// NOTE: must be defined BEFORE /:id to avoid param conflict
router.get("/stats/overview", async (req, res) => {
    try {
        const stats = await getOverallStats();
        res.json(stats || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch stats" });
    }
});

// GET /api/history/:id — full details of one search
router.get("/:id", async (req, res) => {
    try {
        const search = await getSearchById(req.params.id);
        if (!search) {
            return res.status(404).json({ error: "Search not found" });
        }
        res.json(search);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch search" });
    }
});

module.exports = router;
