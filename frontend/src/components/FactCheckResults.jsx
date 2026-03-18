import React from "react";

function ratingStyle(rating = "") {
    const r = rating.toLowerCase();
    if (r.includes("true") || r.includes("accurate") || r.includes("correct"))
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (r.includes("partial") || r.includes("mixture") || r.includes("half"))
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (r.includes("false") || r.includes("mislead") || r.includes("incorrect") || r.includes("pants"))
        return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

export default function FactCheckResults({ results = [] }) {
    if (!results || results.length === 0) return null;

    return (
        <div className="card p-5 space-y-4 animate-fade-up">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span>🔎</span> Fact Check Results
            </h3>

            {results.map((item, i) => (
                <div key={i} className="border-t border-slate-700/50 pt-3 first:border-none first:pt-0">
                    <p className="text-sm text-slate-200 leading-relaxed mb-2">
                        {item.claim || "No claim text"}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {item.claimBy && (
                            <span className="text-xs text-slate-500">by <span className="text-slate-400">{item.claimBy}</span></span>
                        )}
                        <span className={`chip text-xs border ${ratingStyle(item.rating)}`}>
                            {item.rating}
                        </span>
                        {item.url && (
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                View source ↗
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
