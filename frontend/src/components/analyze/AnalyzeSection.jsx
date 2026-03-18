import { useState, useEffect } from "react";
import { api } from "../../utils/api";
import LoadingSpinner from "../shared/LoadingSpinner";
import ErrorMessage from "../shared/ErrorMessage";
import ScoreMeter from "./ScoreMeter";
import VerdictBadge from "./VerdictBadge";
import KeywordTags from "./KeywordTags";
import SourceCard from "./SourceCard";

export default function AnalyzeSection() {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    const charCount = text.length;
    const isTooLong = charCount > 1800;
    const isDisabled = charCount < 10 || isTooLong || loading;

    const handleAnalyze = async () => {
        if (isDisabled) return;
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const { data } = await api.verify(text);
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to analyze the news text. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setText("");
        setError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="max-w-[760px] mx-auto px-4 py-12">
            <div className="mb-8 text-center fade-in-up">
                <h2 className="font-playfair text-3xl font-bold text-[var(--brown)] mb-3">Verify News</h2>
                <p className="font-lato text-[var(--brown-light)]">Paste a news headline or article below</p>
            </div>

            <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(92,61,46,0.06)] p-6 mb-8 fade-in-up">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. Scientists discover water on Mars..."
                    className="w-full min-h-[160px] resize-y bg-[var(--beige-100)] border-2 border-[var(--beige-200)] rounded-xl p-4 font-lato text-base text-[var(--brown)] outline-none transition-all placeholder:text-[var(--brown-light)]/50 focus:border-[var(--coral)] focus:ring-4 focus:ring-[var(--coral)]/10"
                ></textarea>

                <div className="flex justify-end mt-2">
                    <span className={`text-sm font-medium transition-colors ${isTooLong ? "text-[var(--danger)]" : "text-[var(--brown-light)]"}`}>
                        {charCount} / 2000 characters
                    </span>
                </div>

                {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

                <button
                    onClick={handleAnalyze}
                    disabled={isDisabled}
                    className="btn-lens w-full h-[52px] mt-6 bg-[var(--coral)] text-[var(--beige-50)] font-lato font-bold text-base tracking-[0.05em] rounded-lg transition-all hover:bg-[var(--coral-dark)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching trusted sources...
                        </>
                    ) : (
                        "🔍 ANALYZE NEWS"
                    )}
                </button>
            </div>

            {result && (
                <div className="space-y-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
                    {/* Card 1: Trust Score & Verdict */}
                    <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(92,61,46,0.08)] p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                        <div className="shrink-0">
                            <ScoreMeter score={result.trustScore} verdict={result.verdict} />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <VerdictBadge verdict={result.verdict} fromCache={result.fromCache} />
                            <p className="mt-4 text-[var(--brown-light)] leading-relaxed">
                                {result.verdict?.description || "Analysis complete."}
                            </p>

                            <div className="mt-6 space-y-2">
                                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-[var(--brown-light)]">
                                    <span>📰</span>
                                    <span>Checked against {result.totalSourcesChecked || 0} trusted sources</span>
                                </div>
                                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-[var(--brown-light)]">
                                    <span>🎯</span>
                                    <span>{result.confirmedSources || 0} sources confirmed this news</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Keywords */}
                    {result.keywords?.length > 0 && (
                        <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(92,61,46,0.06)] p-6">
                            <h3 className="font-playfair font-bold text-xl text-[var(--brown)] mb-4">Keywords Extracted</h3>
                            <KeywordTags keywords={result.keywords} />
                        </div>
                    )}

                    {/* Card 3: Matched Sources */}
                    {result.matchedArticles?.length > 0 && (
                        <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(92,61,46,0.06)] p-6">
                            <h3 className="font-playfair font-bold text-xl text-[var(--brown)] mb-6">Matched Sources</h3>
                            <div className="space-y-4">
                                {result.matchedArticles.map((article, idx) => (
                                    <SourceCard key={idx} article={article} index={idx} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Card 4: Fact Check Database */}
                    {result.factCheckResults?.length > 0 && (
                        <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(92,61,46,0.06)] p-6">
                            <h3 className="font-playfair font-bold text-xl text-[var(--brown)] mb-6">Fact Check Database Results</h3>
                            <div className="space-y-4">
                                {result.factCheckResults.map((fact, idx) => (
                                    <div key={idx} className="bg-[var(--beige-50)] rounded-lg p-5 border border-[var(--beige-200)]">
                                        <p className="text-[var(--brown)] italic font-medium mb-3">"{fact.claim}"</p>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <span className="text-sm text-[var(--brown-light)]">Rated by: {fact.claimBy}</span>
                                            <a
                                                href={fact.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[var(--beige-100)] border border-[var(--beige-200)] text-[var(--brown)] hover:border-[var(--coral)] transition-colors"
                                            >
                                                {fact.rating} ↗
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 pb-12 flex justify-center">
                        <button
                            onClick={handleReset}
                            className="px-8 py-3 rounded-lg border-2 border-[var(--coral)] text-[var(--coral)] font-bold hover:bg-[var(--coral)] hover:text-white transition-colors"
                        >
                            Analyze Another News
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
