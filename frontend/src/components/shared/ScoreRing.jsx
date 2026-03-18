import { useState, useEffect } from "react";

export default function ScoreRing({ score = 0, verdict = "unknown", size = 160 }) {
    const [offset, setOffset] = useState(377);
    const radius = 60;
    const circumference = 2 * Math.PI * radius; // ~377

    const colorMap = {
        real: "#00c896",
        "partially correct": "#f59e0b",
        partial: "#f59e0b",
        fake: "#ef4444",
        unverified: "#6b7280",
        unknown: "#6b7280",
    };
    const strokeColor = colorMap[verdict?.toLowerCase()] || "#00d4ff";

    useEffect(() => {
        const timer = setTimeout(() => {
            const val = Math.max(0, Math.min(score, 100));
            setOffset(circumference - (val / 100) * circumference);
        }, 100);
        return () => clearTimeout(timer);
    }, [score, circumference]);

    return (
        <div className="score-ring-wrap" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 160 160">
                <circle className="score-ring-track" cx="80" cy="80" r={radius} />
                <circle
                    className="score-ring-progress"
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke={strokeColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="score-ring-text">
                <span className="score-num">{Math.round(score)}</span>
                <span className="score-max">/ 100</span>
            </div>
        </div>
    );
}
