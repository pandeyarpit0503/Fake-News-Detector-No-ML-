const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || "fakenews_db",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test connection on startup
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log("✅ MySQL connected successfully");
        conn.release();
    } catch (err) {
        console.error("❌ MySQL connection failed:", err.message);
        console.warn("⚠️  Running without database — results will not be stored.");
    }
})();

module.exports = pool;
