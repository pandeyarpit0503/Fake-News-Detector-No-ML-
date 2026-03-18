import { useState, useEffect, useRef } from "react";
import { api } from "../../utils/api";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ScoreRing from "../shared/ScoreRing";
import LoadingSpinner from "../shared/LoadingSpinner";

function useCountUp(target, duration = 1500) {
    const [value, setValue] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        if (target == null || target === 0) { setValue(0); return; }
        const start = Date.now();
        const step = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            setValue(Math.round(progress * target));
            if (progress < 1) ref.current = requestAnimationFrame(step);
        };
        ref.current = requestAnimationFrame(step);
        return () => { if (ref.current) cancelAnimationFrame(ref.current); };
    }, [target, duration]);

    return value;
}

const COLORS = { real: "#00c896", partial: "#f59e0b", fake: "#ef4444", unknown: "#6b7280" };

export default function StatsSection() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        api.getStats()
            .then(res => { if (mounted) setStats(res.data); })
            .catch(() => { })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    const total = useCountUp(stats?.totalSearches ?? stats?.total_searches ?? 0);
    const real = useCountUp(stats?.realCount ?? stats?.real_count ?? 0);
    const fake = useCountUp(stats?.fakeCount ?? stats?.fake_count ?? 0);
    const partial = useCountUp(stats?.partialCount ?? stats?.partial_count ?? 0);

    const avgScore = stats?.avgTrustScore ?? stats?.avg_trust_score ?? 0;

    const chartData = [
        { name: "Real", value: stats?.realCount ?? stats?.real_count ?? 0, color: COLORS.real },
        { name: "Partially Correct", value: stats?.partialCount ?? stats?.partial_count ?? 0, color: COLORS.partial },
        { name: "Fake", value: stats?.fakeCount ?? stats?.fake_count ?? 0, color: COLORS.fake },
        { name: "Unverified", value: stats?.unverifiedCount ?? stats?.unverified_count ?? 0, color: COLORS.unknown },
    ].filter(d => d.value > 0);

    if (loading) {
        return (
            <div className="stats-section" style={{ textAlign: "center", paddingTop: 100 }}>
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="stats-section">
            <h2>Platform Statistics</h2>
            <p>Overview of all verified news</p>

            <div className="stat-cards-row">
                <div className="stat-card" style={{ background: "rgba(0,100,100,0.35)", borderColor: "rgba(0,180,180,0.2)" }}>
                    <div className="stat-label">Total Analyzed</div>
                    <div className="stat-value" style={{ color: "#fff" }}>{total}</div>
                </div>
                <div className="stat-card" style={{ background: "rgba(0,80,50,0.35)", borderColor: "rgba(0,200,100,0.2)" }}>
                    <div className="stat-label">Real News</div>
                    <div className="stat-value" style={{ color: COLORS.real }}>{real}</div>
                </div>
                <div className="stat-card" style={{ background: "rgba(100,20,20,0.35)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <div className="stat-label">Fake News</div>
                    <div className="stat-value" style={{ color: COLORS.fake }}>{fake}</div>
                </div>
                <div className="stat-card" style={{ background: "rgba(80,60,0,0.35)", borderColor: "rgba(245,158,11,0.2)" }}>
                    <div className="stat-label">Partially Correct</div>
                    <div className="stat-value" style={{ color: COLORS.partial }}>{partial}</div>
                </div>
            </div>

            <div className="stats-bottom-row">
                <div className="stats-chart-card">
                    <h3>Classification Distribution</h3>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={120}
                                    paddingAngle={3}
                                    dataKey="value"
                                    animationBegin={200}
                                    animationDuration={1000}
                                    animationEasing="ease-out"
                                >
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "#1a1a24",
                                        border: "1px solid #2a2a3a",
                                        borderRadius: "10px",
                                        color: "white",
                                        fontFamily: "Inter",
                                    }}
                                />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value) => (
                                        <span style={{ color: "#8888aa", fontFamily: "Inter" }}>{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
                            No data available
                        </p>
                    )}
                </div>

                <div className="stats-avg-card">
                    <h3>Average Trust Score</h3>
                    <div className="avg-score-display">
                        <ScoreRing score={avgScore} verdict={avgScore >= 70 ? "real" : avgScore >= 40 ? "partial" : "fake"} />
                        <div className="avg-breakdown">
                            <div className="avg-breakdown-row">
                                <span className="avg-breakdown-label">Total Searches</span>
                                <span className="avg-breakdown-value">{stats?.totalSearches ?? stats?.total_searches ?? 0}</span>
                            </div>
                            <div className="avg-breakdown-row">
                                <span className="avg-breakdown-label">Real</span>
                                <span className="avg-breakdown-value" style={{ color: COLORS.real }}>{stats?.realCount ?? stats?.real_count ?? 0}</span>
                            </div>
                            <div className="avg-breakdown-row">
                                <span className="avg-breakdown-label">Fake</span>
                                <span className="avg-breakdown-value" style={{ color: COLORS.fake }}>{stats?.fakeCount ?? stats?.fake_count ?? 0}</span>
                            </div>
                            <div className="avg-breakdown-row">
                                <span className="avg-breakdown-label">Partial</span>
                                <span className="avg-breakdown-value" style={{ color: COLORS.partial }}>{stats?.partialCount ?? stats?.partial_count ?? 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
