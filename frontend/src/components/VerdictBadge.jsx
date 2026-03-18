import React from "react";

const STYLE_MAP = {
    green: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
    orange: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
    red: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", badge: "bg-red-500/20 text-red-300" },
    gray: { bg: "bg-slate-500/15", border: "border-slate-500/40", text: "text-slate-400", badge: "bg-slate-500/20 text-slate-300" },
};

export default function VerdictBadge({ verdict, fromCache }) {
    if (!verdict) return null;
    const s = STYLE_MAP[verdict.color] || STYLE_MAP.gray;

    return (
        <div className={`card p-6 text-center ${s.bg} border ${s.border} animate-fade-up`}>
            {fromCache && (
                <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full mb-3">
                    ⚡ Cached result
                </span>
            )}
            <div className="text-5xl mb-3">{verdict.icon}</div>
            <h2 className={`text-2xl font-black tracking-wide mb-2 ${s.text}`}>
                {verdict.label}
            </h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">{verdict.description}</p>
        </div>
    );
}
