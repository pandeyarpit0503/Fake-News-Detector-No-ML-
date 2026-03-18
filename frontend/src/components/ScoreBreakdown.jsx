import React, { useState } from "react";

export default function ScoreBreakdown({ breakdown = {}, confirmedSources = 0, totalSourcesChecked = 0 }) {
    const [open, setOpen] = useState(false);

    const items = [
        {
            label: "Source Count Boost",
            value: breakdown.sourceCountBoost || 0,
            desc: `${confirmedSources} confirmed out of ${totalSourcesChecked} checked`,
        },
        {
            label: "Fact Check Bonus",
            value: breakdown.factCheckBonus || 0,
            desc: "From Google Fact Check database",
        },
    ];

    return (
        <div className="card overflow-hidden animate-fade-up">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
                <span className="flex items-center gap-2">
                    <span>📊</span> Score Breakdown
                </span>
                <svg
                    className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="border-t border-slate-700/50 p-4 space-y-3">
                    {items.map(item => (
                        <div key={item.label} className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm text-slate-300">{item.label}</p>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                            </div>
                            <span className={`font-mono font-bold text-sm shrink-0 ${item.value > 0 ? "text-emerald-400" :
                                    item.value < 0 ? "text-red-400" : "text-slate-400"
                                }`}>
                                {item.value > 0 ? `+${item.value}` : item.value}
                            </span>
                        </div>
                    ))}
                    <div className="border-t border-slate-700/50 pt-3 text-xs text-slate-400">
                        Each article is also scored by keyword similarity (0-40), entity matching (0-20),
                        contradiction penalty (-30), number mismatch (-20), and recency (×0.4–1.0).
                    </div>
                </div>
            )}
        </div>
    );
}
