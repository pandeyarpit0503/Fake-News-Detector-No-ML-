import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";
import LoadingSpinner from "../shared/LoadingSpinner";

export default function HistorySection() {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        api.getHistory()
            .then(res => { if (mounted) setHistory(res.data?.searches || res.data || []); })
            .catch(() => { if (mounted) setHistory([]); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    const getVerdictClass = (v) => {
        if (!v) return "unknown";
        const low = v.toLowerCase();
        if (low.includes("real") && !low.includes("partial")) return "real";
        if (low.includes("partial")) return "partial";
        if (low.includes("fake") || low.includes("misleading")) return "fake";
        return "unknown";
    };

    const scoreColor = (s) => {
        if (s >= 70) return "#00c896";
        if (s >= 40) return "#f59e0b";
        return "#ef4444";
    };

    const snippet = (t, len = 70) =>
        t && t.length > len ? t.slice(0, len) + "..." : t || "";

    const fmtDate = (d) => {
        if (!d) return "—";
        const dt = new Date(d);
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    if (loading) {
        return (
            <div className="history-section" style={{ textAlign: "center", paddingTop: 100 }}>
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="history-section">
            <h2>Analysis History</h2>
            <p>Last 15 news verifications</p>

            {history.length === 0 ? (
                <div className="history-table-wrap">
                    <div className="history-empty">
                        <div className="empty-icon">📭</div>
                        <h3>No analysis history yet</h3>
                        <p>Start by analyzing a news article</p>
                        <button onClick={() => navigate("/dashboard")}>Go to Analyze</button>
                    </div>
                </div>
            ) : (
                <div className="history-table-wrap">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>News Snippet</th>
                                <th>Score</th>
                                <th>Verdict</th>
                                <th>User ID</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((row, i) => (
                                <tr key={row.search_id || i} style={{ animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
                                    <td className="td-index">{i + 1}</td>
                                    <td className="td-snippet" title={row.news_text || row.newsText}>
                                        {snippet(row.news_text || row.newsText)}
                                        {row.cached && <span className="cached-badge">⚡</span>}
                                    </td>
                                    <td className="td-score" style={{ color: scoreColor(Number(row.trust_score ?? row.trustScore ?? 0)) }}>
                                        {Number(row.trust_score ?? row.trustScore ?? 0).toFixed(0)}
                                    </td>
                                    <td>
                                        <span className={`td-verdict-pill verdict-badge ${getVerdictClass(row.verdict)}`}>
                                            {row.verdict || "UNVERIFIED"}
                                        </span>
                                    </td>
                                    <td className="td-date" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.user_id ?? <span style={{ color: '#64748b', fontStyle: 'italic' }}>guest</span>}</td>
                                    <td className="td-date">{fmtDate(row.created_at || row.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
