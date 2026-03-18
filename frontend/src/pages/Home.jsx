import React, { useState, useRef } from "react";
import axios from "axios";
import ScoreMeter from "../components/ScoreMeter";
import VerdictBadge from "../components/VerdictBadge";
import ScoreBreakdown from "../components/ScoreBreakdown";
import KeywordTags from "../components/KeywordTags";
import SourceCard from "../components/SourceCard";
import FactCheckResults from "../components/FactCheckResults";
import InputSection from "../components/InputSection";

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const resultsRef = useRef(null);

    const handleVerify = async (newsText) => {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const { data } = await axios.post("/api/verify", { news: newsText });
            setResult(data);
            // Scroll to results
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        } catch (err) {
            if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
                setError("Search timed out. Please try again.");
            } else if (!err.response) {
                setError("Unable to connect. Check your connection and make sure the backend is running.");
            } else {
                setError(err.response?.data?.error || "Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="min-h-[calc(100vh-3.5rem)] px-4 py-12 flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0f1628 50%, #080d18 100%)" }}>
            {/* Ambient glow */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className={`w-full max-w-3xl space-y-8 transition-all duration-500`}>
                {/* Input section (hidden once results are shown) */}
                {!result && (
                    <InputSection onVerify={handleVerify} loading={loading} />
                )}

                {/* Loading overlay */}
                {loading && (
                    <div className="flex flex-col items-center gap-4 py-12 animate-fade-up">
                        <div className="w-14 h-14 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin-slow" />
                        <p className="text-slate-400 font-medium">Searching trusted sources...</p>
                        <p className="text-slate-500 text-sm">Checking GNews + Google Fact Check API</p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="card p-5 border-red-500/30 bg-red-500/10 text-center animate-fade-up">
                        <p className="text-red-400 font-medium mb-3">❌ {error}</p>
                        <button
                            onClick={() => setError("")}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* RESULTS */}
                {result && (
                    <div ref={resultsRef} className="space-y-5">
                        {/* Top row: score + verdict */}
                        <div className="grid md:grid-cols-2 gap-5">
                            <div className="card p-6 flex items-center justify-center">
                                <ScoreMeter score={result.trustScore} color={result.verdict?.color} />
                            </div>
                            <VerdictBadge verdict={result.verdict} fromCache={result.fromCache} />
                        </div>

                        {/* Score breakdown */}
                        <ScoreBreakdown
                            breakdown={result.scoreBreakdown}
                            confirmedSources={result.confirmedSources}
                            totalSourcesChecked={result.totalSourcesChecked}
                        />

                        {/* Keywords + entities */}
                        <KeywordTags keywords={result.keywords} entities={result.entities} />

                        {/* Fact check results */}
                        {result.factCheckResults?.length > 0 && (
                            <FactCheckResults results={result.factCheckResults} />
                        )}

                        {/* Matched sources */}
                        {result.matchedArticles?.length > 0 ? (
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                                    <span>📰</span>
                                    Matched Sources
                                    <span className="bg-slate-700 text-slate-400 rounded-full px-2 py-0.5 text-xs font-mono">
                                        {result.confirmedSources}/{result.totalSourcesChecked}
                                    </span>
                                </h2>
                                {result.matchedArticles.map((article, i) => (
                                    <SourceCard key={i} article={article} index={i} />
                                ))}
                            </div>
                        ) : (
                            <div className="card p-8 text-center border-slate-700/50">
                                <p className="text-slate-400 text-sm">
                                    No matching sources found. This news could not be verified against trusted databases.
                                </p>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="text-xs text-slate-500 text-center leading-relaxed px-4 pb-4 border-t border-slate-800 pt-4">
                            Results are based on keyword matching and public fact-check databases.
                            Always read the full source article before forming an opinion.
                        </div>

                        {/* Verify another */}
                        <div className="text-center pb-8">
                            <button
                                onClick={handleReset}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 glow-blue"
                            >
                                🔄 Verify Another
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
