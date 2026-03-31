import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ─── Stat KPI Card ─── */
function StatCard({ icon, label, value, color }) {
    return (
        <div style={{
            background: `${color}11`,
            border: `1px solid ${color}44`,
            borderRadius: 16,
            padding: "20px 24px",
            animation: "fadeInUp 0.4s ease forwards",
            textAlign: "center",
        }}>
            <div style={{ fontSize: "2rem", marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: 2 }}>{value ?? "–"}</div>
            <div style={{ fontSize: "0.8rem", color: "#8888aa" }}>{label}</div>
        </div>
    );
}

/* ─── SVG Pie Chart ─── */
function PieChart({ slices }) {
    const total = slices.reduce((s, x) => s + x.count, 0);
    if (total === 0) return null;

    const SIZE = 220;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const R = 88;
    const INNER_R = 52; // donut hole

    let cumAngle = -Math.PI / 2; // start at top

    const paths = slices.map((slice) => {
        if (slice.count === 0) return null;
        const angle = (slice.count / total) * 2 * Math.PI;
        const x1 = CX + R * Math.cos(cumAngle);
        const y1 = CY + R * Math.sin(cumAngle);
        const x1i = CX + INNER_R * Math.cos(cumAngle);
        const y1i = CY + INNER_R * Math.sin(cumAngle);
        cumAngle += angle;
        const x2 = CX + R * Math.cos(cumAngle);
        const y2 = CY + R * Math.sin(cumAngle);
        const x2i = CX + INNER_R * Math.cos(cumAngle);
        const y2i = CY + INNER_R * Math.sin(cumAngle);
        const large = angle > Math.PI ? 1 : 0;

        const d = [
            `M ${x1i} ${y1i}`,
            `L ${x1} ${y1}`,
            `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
            `L ${x2i} ${y2i}`,
            `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${x1i} ${y1i}`,
            "Z",
        ].join(" ");

        return (
            <path
                key={slice.label}
                d={d}
                fill={slice.color}
                opacity={0.92}
                style={{ transition: "opacity 0.2s" }}
                onMouseEnter={e => (e.target.style.opacity = 1)}
                onMouseLeave={e => (e.target.style.opacity = 0.92)}
            />
        );
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                <defs>
                    <filter id="pie-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
                    </filter>
                </defs>
                <g filter="url(#pie-shadow)">{paths}</g>
                {/* centre text */}
                <text x={CX} y={CY - 6} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800" fontFamily="Inter, sans-serif">
                    {total}
                </text>
                <text x={CX} y={CY + 14} textAnchor="middle" fill="#8888aa" fontSize="11" fontFamily="Inter, sans-serif">
                    verified
                </text>
            </svg>

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", justifyContent: "center" }}>
                {slices.map(s => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.82rem", color: "#aaaacc" }}>
                        <span style={{ width: 11, height: 11, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
                        {s.label} <span style={{ color: s.color, fontWeight: 700 }}>({s.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Distribution Bar ─── */
function DistBar({ label, count, total, color }) {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 140, fontSize: "0.82rem", color: "#8888aa", flexShrink: 0 }}>{label}</div>
            <div style={{
                flex: 1,
                height: 10,
                background: "#1e1e2e",
                borderRadius: 6,
                overflow: "hidden",
            }}>
                <div style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: color,
                    borderRadius: 6,
                    transition: "width 1s ease",
                    animation: "progressFill 1s ease forwards",
                }} />
            </div>
            <div style={{ width: 42, fontSize: "0.8rem", color: "#8888aa", fontFamily: "monospace", textAlign: "right", flexShrink: 0 }}>
                {pct}%
            </div>
        </div>
    );
}

/* ─── Main Stats Page ─── */
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

    const fmt = v => v != null ? Number(v).toLocaleString() : "–";

    const VERDICTS = stats ? [
        { label: "Real",             count: Number(stats.real_count)       || 0, color: "#00c896" },
        { label: "Partially Correct",count: Number(stats.partial_count)    || 0, color: "#f59e0b" },
        { label: "Fake / Misleading",count: Number(stats.fake_count)       || 0, color: "#ef4444" },
        { label: "Unverified",       count: Number(stats.unverified_count) || 0, color: "#6b7280" },
    ] : [];

    const total = stats ? (Number(stats.total_searches) || 0) : 0;

    /* shared card style */
    const card = {
        background: "#16161f",
        border: "1px solid #2a2a3a",
        borderRadius: 18,
        padding: "24px 28px",
    };

    return (
        <div style={{
            minHeight: "calc(100vh - 64px)",
            paddingTop: 64,
            background: "linear-gradient(135deg, #0a0a0f 0%, #0f1020 100%)",
            padding: "80px 20px 48px",
        }}>
            <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

                {/* Header */}
                <div style={{ textAlign: "center" }}>
                    <h1 className="gradient-text" style={{ fontSize: "2rem", fontWeight: 800 }}>Platform Stats</h1>
                    <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: 6 }}>Aggregated verification statistics</p>
                    <button
                        onClick={() => navigate("/")}
                        style={{
                            marginTop: 18,
                            padding: "8px 22px",
                            background: "linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 10,
                            fontFamily: "Inter, sans-serif",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        ← Verify News
                    </button>
                </div>

                {loading && <div style={{ textAlign: "center", color: "#6b7280", padding: "60px 0" }}>Loading stats…</div>}
                {error   && <div style={{ ...card, color: "#ef4444", textAlign: "center" }}>{error}</div>}

                {!loading && !error && stats && (
                    <>
                        {/* KPI Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 16 }}>
                            <StatCard icon="✅" label="Real"              value={fmt(stats.real_count)}       color="#00c896" />
                            <StatCard icon="⚠️" label="Partially Correct" value={fmt(stats.partial_count)}    color="#f59e0b" />
                            <StatCard icon="❌" label="Fake / Misleading"  value={fmt(stats.fake_count)}       color="#ef4444" />
                            <StatCard icon="❓" label="Unverified"         value={fmt(stats.unverified_count)} color="#6b7280" />
                        </div>

                        {/* Summary row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div style={{ ...card, textAlign: "center" }}>
                                <div className="gradient-text" style={{ fontSize: "2.4rem", fontWeight: 900 }}>{fmt(stats.total_searches)}</div>
                                <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 4 }}>Total Searches</div>
                            </div>
                            <div style={{ ...card, textAlign: "center" }}>
                                <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#00d4ff" }}>{stats.avg_trust_score ?? "–"}</div>
                                <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 4 }}>Avg Trust Score</div>
                            </div>
                        </div>

                        {total > 0 && (
                            <>
                                {/* Pie Chart */}
                                <div style={{ ...card, textAlign: "center" }}>
                                    <h3 style={{ color: "#aaaacc", fontSize: "0.9rem", fontWeight: 600, marginBottom: 24, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                        Verdict Distribution
                                    </h3>
                                    <PieChart slices={VERDICTS} />
                                </div>

                                {/* Distribution Bars */}
                                <div style={{ ...card }}>
                                    <h3 style={{ color: "#aaaacc", fontSize: "0.9rem", fontWeight: 600, marginBottom: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                        Breakdown
                                    </h3>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                        {VERDICTS.map(v => (
                                            <DistBar key={v.label} label={v.label} count={v.count} total={total} color={v.color} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {total === 0 && (
                            <div style={{ ...card, textAlign: "center", color: "#555570", padding: "48px 0" }}>
                                No data yet. Start verifying news to see stats here!
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
