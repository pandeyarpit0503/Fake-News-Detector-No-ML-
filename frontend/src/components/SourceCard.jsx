import React, { useState } from "react";

function timeAgo(dateStr) {
    if (!dateStr) return "Unknown date";
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TIER_COLORS = ["", "bg-emerald-500/20 text-emerald-300", "bg-blue-500/20 text-blue-300", "bg-amber-500/20 text-amber-300", "bg-slate-500/20 text-slate-300"];

export default function SourceCard({ article, index }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const pct = Math.min(Math.max((article.matchScore / 60) * 100, 0), 100);

    const barColor =
        pct >= 60 ? "#10b981" :
            pct >= 35 ? "#f59e0b" : "#ef4444";

    return (
        <div className="card p-4 animate-fade-up hover:border-blue-500/50 transition-all"
            style={{ animationDelay: `${index * 0.07}s`, opacity: 0, animationFillMode: "forwards" }}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-300">{article.source}</span>
                    {article.tier && (
                        <span className={`chip text-xs ${TIER_COLORS[article.tier] || TIER_COLORS[4]}`}>
                            Tier {article.tier}
                        </span>
                    )}
                </div>
                <span className="text-xs text-slate-500 shrink-0">{timeAgo(article.publishedAt)}</span>
            </div>

            <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-200 hover:text-blue-400 transition-colors line-clamp-2 leading-snug block mb-3"
            >
                {article.title}
            </a>

            {/* Match score bar */}
            <div className="flex items-center gap-2">
                <div className="progress-bar flex-1">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${pct}%`, background: barColor }}
                    />
                </div>
                {/* Signals tooltip */}
                <div className="relative"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}>
                    <button className="text-xs text-slate-500 hover:text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded">
                        {article.matchScore}
                    </button>
                    {showTooltip && article.signals && (
                        <div className="absolute bottom-7 right-0 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs z-50 min-w-[200px] shadow-xl">
                            <p className="font-semibold text-slate-200 mb-2">Score Signals</p>
                            {[
                                ["Keyword", article.signals.keywordScore, "+"],
                                ["Entity Match", article.signals.entityScore, "+"],
                                ["Contradiction", article.signals.contradictionPenalty, ""],
                                ["Num Mismatch", article.signals.numberPenalty, ""],
                                ["Recency", `×${article.signals.recencyMultiplier}`, ""],
                                ["Src Weight", `×${article.signals.sourceWeight}`, ""],
                            ].map(([label, val, prefix]) => (
                                <div key={label} className="flex justify-between gap-4 py-0.5">
                                    <span className="text-slate-400">{label}</span>
                                    <span className={`font-mono ${String(val).startsWith("-") ? "text-red-400" : "text-slate-300"}`}>
                                        {prefix}{val}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
