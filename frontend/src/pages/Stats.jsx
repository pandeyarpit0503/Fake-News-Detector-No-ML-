import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function StatCard({ icon, label, value, color }) {
    return (
        <div className={`card p-5 border-${color}-500/30 bg-${color}-500/5 animate-fade-up`}>
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-3xl font-extrabold text-white mb-0.5">{value ?? "–"}</div>
            <div className="text-sm text-slate-400">{label}</div>
        </div>
    );
}

export default function Stats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        axios.get("/api/history/stats/overview")
            .then(r => setStats(r.data))
            .catch(() => setError("Could not load stats. Is the backend running?"))
            .finally(() => setLoading(false));
    }, []);

    const formatNum = v => v != null ? Number(v).toLocaleString() : "–";

    return (
        <div className="min-h-[calc(100vh-3.5rem)] px-4 py-12 flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0f1628 100%)" }}>
            <div className="w-full max-w-4xl space-y-8">
                <div className="flex flex-col items-center justify-center text-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold gradient-text">Platform Stats</h1>
                        <p className="text-slate-500 text-sm mt-1">Aggregated verification statistics</p>
                    </div>
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all"
                    >
                        ← Verify News
                    </button>
                </div>

                {loading && <div className="text-center py-16 text-slate-400">Loading stats...</div>}
                {error && <div className="card p-6 border-red-500/30 text-red-400 text-center">{error}</div>}

                {!loading && !error && stats && (
                    <>
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard icon="✅" label="Total Real" value={formatNum(stats.real_count)} color="emerald" />
                            <StatCard icon="⚠️" label="Partially Correct" value={formatNum(stats.partial_count)} color="amber" />
                            <StatCard icon="❌" label="Fake / Misleading" value={formatNum(stats.fake_count)} color="red" />
                            <StatCard icon="❓" label="Unverified" value={formatNum(stats.unverified_count)} color="slate" />
                        </div>

                        {/* Summary row */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="card p-6 text-center">
                                <div className="text-4xl font-black gradient-text mb-1">
                                    {formatNum(stats.total_searches)}
                                </div>
                                <div className="text-slate-400 text-sm">Total Searches</div>
                            </div>
                            <div className="card p-6 text-center">
                                <div className="text-4xl font-black text-blue-400 mb-1">
                                    {stats.avg_trust_score ?? "–"}
                                </div>
                                <div className="text-slate-400 text-sm">Avg Trust Score</div>
                            </div>
                        </div>

                        {/* Distribution bar */}
                        {stats.total_searches > 0 && (
                            <div className="card p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-300 text-center">Verdict Distribution</h3>
                                <div className="space-y-4 max-w-lg mx-auto">
                                    {[
                                        { label: "Real", count: stats.real_count, color: "#10b981" },
                                        { label: "Partially Correct", count: stats.partial_count, color: "#f59e0b" },
                                        { label: "Fake/Misleading", count: stats.fake_count, color: "#ef4444" },
                                        { label: "Unverified", count: stats.unverified_count, color: "#6b7280" },
                                    ].map(item => {
                                        const pct = stats.total_searches ? ((item.count / stats.total_searches) * 100).toFixed(1) : 0;
                                        return (
                                            <div key={item.label} className="flex items-center gap-3">
                                                <div className="text-xs text-slate-400 w-36 shrink-0">{item.label}</div>
                                                <div className="progress-bar flex-1">
                                                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: item.color }} />
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono w-10 text-right">{pct}%</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {stats.total_searches === 0 && (
                            <div className="card p-10 text-center text-slate-500">
                                No data yet. Start verifying news to see stats here!
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
