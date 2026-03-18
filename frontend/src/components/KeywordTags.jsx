import React from "react";

export default function KeywordTags({ keywords = [], entities = {} }) {
    const properNouns = entities.properNouns || [];
    const numbers = entities.numbers || [];
    const years = entities.years || [];

    const allEmpty = !keywords.length && !properNouns.length && !numbers.length && !years.length;
    if (allEmpty) return null;

    return (
        <div className="card p-5 space-y-3 animate-fade-up">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span>🔍</span> Extracted Keywords &amp; Entities
            </h3>

            {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {keywords.map(kw => (
                        <span key={kw} className="chip bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {kw}
                        </span>
                    ))}
                </div>
            )}

            {properNouns.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {properNouns.map(n => (
                        <span key={n} className="chip bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            👤 {n}
                        </span>
                    ))}
                </div>
            )}

            {(numbers.length > 0 || years.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                    {[...new Set([...numbers, ...years])].map(n => (
                        <span key={n} className="chip bg-orange-500/15 text-orange-300 border border-orange-500/30">
                            # {n}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />Keywords</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1" />Proper Nouns</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />Numbers</span>
            </div>
        </div>
    );
}
