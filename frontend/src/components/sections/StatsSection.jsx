import { useState, useEffect, useRef } from "react";
import { api } from "../../utils/api";
import ScoreRing from "../shared/ScoreRing";
import LoadingSpinner from "../shared/LoadingSpinner";

/* ─── count-up hook ─── */
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

/* ─── Native SVG donut pie chart ─── */
function DonutPie({ slices }) {
    const total = slices.reduce((s, x) => s + x.value, 0);
    if (total === 0) return null;

    const SIZE = 240;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const R = 95;
    const IR = 58; // inner (donut hole) radius

    let angle = -Math.PI / 2; // start at 12 o'clock

    const paths = slices
        .filter(s => s.value > 0)
        .map((slice) => {
            const sweep = (slice.value / total) * 2 * Math.PI;
            const x1  = CX + R  * Math.cos(angle);
            const y1  = CY + R  * Math.sin(angle);
            const xi1 = CX + IR * Math.cos(angle);
            const yi1 = CY + IR * Math.sin(angle);
            angle += sweep;
            const x2  = CX + R  * Math.cos(angle);
            const y2  = CY + R  * Math.sin(angle);
            const xi2 = CX + IR * Math.cos(angle);
            const yi2 = CY + IR * Math.sin(angle);
            const large = sweep > Math.PI ? 1 : 0;

            const d = [
                `M ${xi1} ${yi1}`,
                `L ${x1} ${y1}`,
                `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
                `L ${xi2} ${yi2}`,
                `A ${IR} ${IR} 0 ${large} 0 ${xi1} ${yi1}`,
                "Z",
            ].join(" ");

            return (
                <path
                    key={slice.name}
                    d={d}
                    fill={slice.color}
                    opacity={0.9}
                    style={{ transition: "opacity 0.2s, transform 0.2s", cursor: "pointer" }}
                    onMouseEnter={e => { e.target.style.opacity = 1; e.target.style.filter = "brightness(1.15)"; }}
                    onMouseLeave={e => { e.target.style.opacity = 0.9; e.target.style.filter = "none"; }}
                >
                    <title>{slice.name}: {slice.value} ({((slice.value / total) * 100).toFixed(1)}%)</title>
                </path>
            );
        });

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {/* SVG chart */}
            <div style={{ position: "relative", width: SIZE, height: SIZE }}>
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <defs>
                        <filter id="donut-shadow">
                            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
                        </filter>
                    </defs>
                    <g filter="url(#donut-shadow)">{paths}</g>
                </svg>
                {/* centre label */}
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                }}>
                    <span style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{total}</span>
                    <span style={{ fontSize: "0.7rem", color: "#6b7280", letterSpacing: "0.1em", marginTop: 4 }}>VERIFIED</span>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", justifyContent: "center" }}>
                {slices.filter(s => s.value > 0).map(s => {
                    const pct = ((s.value / total) * 100).toFixed(1);
                    return (
                        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.82rem", color: "#aaaacc" }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
                            {s.name}
                            <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
                            <span style={{ color: "#555570" }}>({pct}%)</span>
                        </div>
                    );
                })}
            </div>

            {/* Distribution bars */}
            <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                {slices.filter(s => s.value > 0).map(s => {
                    const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
                    return (
                        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 130, fontSize: "0.78rem", color: "#8888aa", flexShrink: 0 }}>{s.name}</div>
                            <div style={{ flex: 1, height: 8, background: "#1e1e2e", borderRadius: 4, overflow: "hidden" }}>
                                <div style={{
                                    width: `${pct}%`,
                                    height: "100%",
                                    background: s.color,
                                    borderRadius: 4,
                                    transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                }} />
                            </div>
                            <div style={{ width: 38, fontSize: "0.75rem", color: "#6b7280", textAlign: "right", fontFamily: "monospace", flexShrink: 0 }}>
                                {pct}%
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
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

    const n = (v) => parseInt(v, 10) || 0; // coerce API strings → numbers

    const total   = useCountUp(n(stats?.totalSearches   ?? stats?.total_searches));
    const real    = useCountUp(n(stats?.realCount        ?? stats?.real_count));
    const fake    = useCountUp(n(stats?.fakeCount        ?? stats?.fake_count));
    const partial = useCountUp(n(stats?.partialCount     ?? stats?.partial_count));

    const avgScore = n(stats?.avgTrustScore ?? stats?.avg_trust_score);

    const chartSlices = [
        { name: "Real",             value: n(stats?.realCount        ?? stats?.real_count),       color: COLORS.real },
        { name: "Partially Correct",value: n(stats?.partialCount     ?? stats?.partial_count),    color: COLORS.partial },
        { name: "Fake",             value: n(stats?.fakeCount        ?? stats?.fake_count),       color: COLORS.fake },
        { name: "Unverified",       value: n(stats?.unverifiedCount  ?? stats?.unverified_count), color: COLORS.unknown },
    ];

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
                    {chartSlices.some(s => s.value > 0) ? (
                        <DonutPie slices={chartSlices} />
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
                                <span className="avg-breakdown-value">{n(stats?.totalSearches ?? stats?.total_searches)}</span>
                            </div>
                            <div className="avg-breakdown-row">
                                <span className="avg-breakdown-label">Real</span>
                                <span className="avg-breakdown-value" style={{ color: COLORS.real }}>{n(stats?.realCount ?? stats?.real_count)}</span>
                            </div>
                            <div className="avg-breakdown-row">
                                <span className="avg-breakdown-label">Fake</span>
                                <span className="avg-breakdown-value" style={{ color: COLORS.fake }}>{n(stats?.fakeCount ?? stats?.fake_count)}</span>
                            </div>
                            <div className="avg-breakdown-row">
                                <span className="avg-breakdown-label">Partial</span>
                                <span className="avg-breakdown-value" style={{ color: COLORS.partial }}>{n(stats?.partialCount ?? stats?.partial_count)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
