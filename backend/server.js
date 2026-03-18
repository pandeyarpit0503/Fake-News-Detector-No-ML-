const express = require("express");
const cors = require("cors");
require("dotenv").config();

const verifyRouter = require("./routes/verify");
const historyRouter = require("./routes/history");
const authRouter = require("./routes/auth");

const app = express();

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
app.use(express.json({ limit: "5mb" }));

app.use("/api/verify", verifyRouter);
app.use("/api/history", historyRouter);
app.use("/api/auth", authRouter);

app.get("/health", (_req, res) => res.json({ status: "OK", time: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Fake News Detector API running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
