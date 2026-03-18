import React, { useState } from "react";

export default function InputSection({ onVerify, loading }) {
    const [text, setText] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = () => {
        if (text.trim().length < 10) {
            setError("Please enter at least 10 characters.");
            return;
        }
        setError("");
        onVerify(text.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && e.ctrlKey) handleSubmit();
    };

    return (
        <section className="w-full max-w-3xl mx-auto">
            {/* Hero heading */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-4 py-1.5 rounded-full text-sm text-blue-400 mb-5">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse inline-block" />
                    AI-Free · Algorithmic Logic Only
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold gradient-text leading-tight mb-3">
                    Fake News Detector
                </h1>
                <p className="text-slate-400 text-lg max-w-xl mx-auto">
                    Paste a headline or paragraph. We cross-check against trusted sources
                    and fact-check databases — no AI, pure code.
                </p>
            </div>

            {/* Textarea card */}
            <div className="card p-5 space-y-3">
                <div className="relative">
                    <textarea
                        value={text}
                        onChange={(e) => { setText(e.target.value); setError(""); }}
                        onKeyDown={handleKeyDown}
                        rows={5}
                        placeholder="Paste a news headline or full paragraph..."
                        className="w-full bg-transparent text-slate-200 placeholder-slate-500 text-base resize-none outline-none leading-relaxed"
                    />
                    {/* char counter */}
                    <div className="absolute bottom-2 right-2 text-xs text-slate-500">
                        {text.length} chars
                    </div>
                </div>

                <div className="border-t border-slate-700/50" />

                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    {/* Error */}
                    <p className={`text-sm text-red-400 transition-opacity ${error ? "opacity-100" : "opacity-0 h-0"}`}>
                        ⚠ {error}
                    </p>

                    <div className="flex items-center justify-center gap-3 w-full">
                        {text.length > 0 && (
                            <button
                                onClick={() => { setText(""); setError(""); }}
                                className="text-slate-400 hover:text-slate-200 text-sm transition-colors py-2 px-4 rounded-xl hover:bg-slate-800"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={loading || text.trim().length < 10}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${loading || text.trim().length < 10
                                ? "bg-blue-600/30 text-blue-400/50 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-500 text-white glow-blue hover:scale-105 active:scale-95"
                                }`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Searching sources...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Verify News
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <p className="text-xs text-slate-600 text-center w-full mt-2">Ctrl + Enter to verify</p>
            </div>

            {/* How it works */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { icon: "🔑", label: "Keyword Match", desc: "Jaccard similarity up to 40pts" },
                    { icon: "🏷️", label: "Entity Check", desc: "Names, numbers, dates 20pts" },
                    { icon: "✅", label: "Fact Check API", desc: "Google fact-check database" },
                    { icon: "📰", label: "Source Trust", desc: "Tier-ranked news sources" },
                ].map((item) => (
                    <div key={item.label} className="card p-3 text-center hover:border-blue-500/50 transition-all">
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="text-xs font-semibold text-slate-300">{item.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}
