import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function timeAgo(dateStr) {
    if (!dateStr) return "–";
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const VERDICT_STYLES = {
    "REAL": "bg-emerald-500/20 text-emerald-300",
    "PARTIALLY CORRECT": "bg-amber-500/20 text-amber-300",
    "FAKE / MISLEADING": "bg-red-500/20 text-red-300",
    "UNVERIFIED": "bg-slate-500/20 text-slate-400",
};

export default function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        axios.get("/api/history?limit=20")
            .then(r => setHistory(r.data.searches || []))
            .catch(() => setError("Could not load history. Is the backend running?"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-[calc(100vh-3.5rem)] px-4 py-12 flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0f1628 100%)" }}>
            <div className="w-full max-w-5xl space-y-6">
                <div className="flex flex-col items-center justify-center text-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold gradient-text">Search History</h1>
                        <p className="text-slate-500 text-sm mt-1">Last 20 verifications</p>
                    </div>
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all"
                    >
                        ← Verify News
                    </button>
                </div>

                {loading && (
                    <div className="text-center py-16 text-slate-400">Loading history...</div>
                )}
                {error && (
                    <div className="card p-6 border-red-500/30 text-red-400 text-center">{error}</div>
                )}

                {!loading && !error && (
                    <div className="card overflow-hidden">
                        {history.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">No searches yet. Go verify some news!</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            {["#", "News", "Score", "Verdict", "Sources", "User ID", "Date"].map(h => (
                                                <th key={h} className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((row, i) => (
                                            <tr
                                                key={row.search_id}
                                                onClick={() => navigate(`/history/${row.search_id}`)}
                                                className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors text-center"
                                            >
                                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                                                <td className="px-4 py-3 max-w-xs text-center">
                                                    <p className="text-slate-200 truncate inline-block text-center" title={row.news_text}>
                                                        {row.news_text?.substring(0, 70)}{row.news_text?.length > 70 ? "…" : ""}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono font-bold text-slate-300">{row.trust_score}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`chip text-xs ${VERDICT_STYLES[row.verdict] || VERDICT_STYLES["UNVERIFIED"]}`}>
                                                        {row.verdict}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 font-mono">{row.confirmed_sources}</td>
                                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.user_id ?? <span className="text-slate-600 italic">guest</span>}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(row.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
