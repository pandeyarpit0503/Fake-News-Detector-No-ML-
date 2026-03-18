import React, { useEffect, useRef, useState } from "react";

const COLOR_MAP = {
    green: { stroke: "#10b981", glow: "rgba(16,185,129,0.4)", text: "text-emerald-400" },
    orange: { stroke: "#f59e0b", glow: "rgba(245,158,11,0.4)", text: "text-amber-400" },
    red: { stroke: "#ef4444", glow: "rgba(239,68,68,0.4)", text: "text-red-400" },
    gray: { stroke: "#6b7280", glow: "rgba(107,114,128,0.3)", text: "text-slate-400" },
};

export default function ScoreMeter({ score = 0, color = "gray" }) {
    const [displayed, setDisplayed] = useState(0);
    const animRef = useRef(null);

    const radius = 72;
    const circ = 2 * Math.PI * radius;
    const pct = Math.min(Math.max(score, 0), 100) / 100;
    const offset = circ * (1 - pct);
    const c = COLOR_MAP[color] || COLOR_MAP.gray;

    useEffect(() => {
        let start = null;
        const target = score;
        const dur = 1200;

        const step = (ts) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / dur, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setDisplayed(Math.round(eased * target));
            if (progress < 1) animRef.current = requestAnimationFrame(step);
        };

        animRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animRef.current);
    }, [score]);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative" style={{ filter: `drop-shadow(0 0 18px ${c.glow})` }}>
                <svg width="180" height="180" viewBox="0 0 180 180">
                    {/* Background ring */}
                    <circle
                        cx="90" cy="90" r={radius}
                        fill="none" stroke="#1e2d4a" strokeWidth="12"
                    />
                    {/* Progress ring */}
                    <circle
                        cx="90" cy="90" r={radius}
                        fill="none"
                        stroke={c.stroke}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform="rotate(-90 90 90)"
                        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
                    />
                    {/* Score text */}
                    <text
                        x="90" y="85"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={c.stroke}
                        fontSize="36"
                        fontWeight="800"
                        fontFamily="Inter, sans-serif"
                    >
                        {displayed}
                    </text>
                    <text
                        x="90" y="112"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="13"
                        fontFamily="Inter, sans-serif"
                    >
                        / 100
                    </text>
                </svg>
            </div>
            <div className={`text-sm font-medium ${c.text}`}>Trust Score</div>
        </div>
    );
}
