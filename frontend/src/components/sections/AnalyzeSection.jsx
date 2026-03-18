import { useState } from "react";
import { api } from "../../utils/api";
import LoadingSpinner from "../shared/LoadingSpinner";
import ScoreRing from "../shared/ScoreRing";

export default function AnalyzeSection({ username }) {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [hoveredSource, setHoveredSource] = useState(null);

    const handleAnalyze = async () => {
        if (!text.trim() || loading) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await api.verify(text.trim());
            setResult(res.data);
        } catch (err) {
            setResult({ error: err.response?.data?.error || "Analysis failed. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setText("");
        setResult(null);
    };

    const getVerdictLabel = (v) => {
        if (!v) return "";
        if (typeof v === "object") return v.label || "";
        return String(v);
    };

    const getVerdictClass = (v) => {
        const label = getVerdictLabel(v);
        if (!label) return "unknown";
        const low = label.toLowerCase();
        if (low.includes("real") && !low.includes("partial")) return "real";
        if (low.includes("partial")) return "partial";
        if (low.includes("fake") || low.includes("misleading")) return "fake";
        return "unknown";
    };

    const getVerdictDesc = (v) => {
        const cls = getVerdictClass(v);
        if (cls === "real") return "This news appears to be credible based on multiple trusted sources.";
        if (cls === "partial") return "Some claims could be verified, but parts may be inaccurate or misleading.";
        if (cls === "fake") return "This news could not be verified and may contain false or misleading claims.";
        return "Not enough data was found to verify this news.";
    };

    return (
        <div className="analyze-section">
            <div className="analyze-welcome">
                <h1>Welcome, {username}!</h1>
                <p>Enter a news headline to verify its authenticity</p>
            </div>

            <div className="analyze-card">
                <label>News Headline</label>
                <textarea
                    className="analyze-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 500))}
                    placeholder="Enter the news headline you want to verify..."
                    disabled={loading}
                />
                <div className={`char-count${text.length > 450 ? " warn" : ""}`}>
                    {text.length}/500 characters
                </div>
                <button
                    className="btn-gradient analyze-btn"
                    onClick={handleAnalyze}
                    disabled={loading || !text.trim()}
                >
                    {loading ? <><LoadingSpinner small /> Analyzing...</> : "🔍 Analyze News"}
                </button>
            </div>

            {loading && <div className="global-loading-bar" style={{ width: "70%" }} />}

            {result && !result.error && (
                <div className="results-area">
                    {/* Score & Verdict */}
                    <div className="result-card fade-in-up" style={{ animationDelay: "0s" }}>
                        <div className="score-verdict-row">
                            <ScoreRing score={result.trustScore ?? 0} verdict={getVerdictClass(result.verdict)} />
                            <div className="verdict-details">
                                <span className={`verdict-badge ${getVerdictClass(result.verdict)}`}>
                                    {getVerdictLabel(result.verdict) || "UNVERIFIED"}
                                </span>
                                <p className="verdict-desc">{getVerdictDesc(result.verdict)}</p>
                                <p className="verdict-sources">
                                    Checked {(result.matchedArticles || result.articles)?.length || 0} trusted sources
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Keywords */}
                    {result.keywords?.length > 0 && (
                        <div className="result-card fade-in-up" style={{ animationDelay: "0.15s" }}>
                            <h3>Keywords Detected</h3>
                            <div className="keyword-chips">
                                {result.keywords.map((kw, i) => (
                                    <span key={i} className="keyword-chip" style={{ animationDelay: `${i * 0.04}s`, animation: "fadeIn 0.3s ease forwards" }}>{kw}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sources */}
                    {(result.matchedArticles || result.articles)?.length > 0 && (
                        <div className="result-card fade-in-up" style={{ animationDelay: "0.3s" }}>
                            <h3>Matched Sources</h3>
                            {(result.matchedArticles || result.articles).map((art, i) => (
                                <div
                                    key={i}
                                    className="source-row"
                                    onMouseEnter={() => setHoveredSource(i)}
                                    onMouseLeave={() => setHoveredSource(null)}
                                >
                                    <span className={`source-dot tier${art.tier || art.sourceTier || 3}`} />
                                    <div className="source-info">
                                        <div className="source-name">{art.sourceName || art.source?.name || art.source || "Unknown"}</div>
                                        <div className="source-title">
                                            <a href={art.url} target="_blank" rel="noopener noreferrer">
                                                {art.title || "Article"}
                                            </a>
                                        </div>
                                        <div className="source-bar-track">
                                            <div className="source-bar-fill" style={{ width: `${Math.min(Number(art.matchScore) || 0, 100)}%` }} />
                                        </div>
                                    </div>
                                    <span className="source-score-pill">{Number(art.matchScore || 0).toFixed(0)}%</span>

                                    {hoveredSource === i && (
                                        <div className="source-tooltip">
                                            <span>Keyword: {art.signals?.keywordScore?.toFixed(1) ?? art.keywordScore?.toFixed(1) ?? "—"}</span>
                                            <span>Entity: {art.signals?.entityScore?.toFixed(1) ?? art.entityScore?.toFixed(1) ?? "—"}</span>
                                            <span>Contradiction: {art.signals?.contradictionPenalty?.toFixed(1) ?? art.contradictionPenalty?.toFixed(1) ?? "—"}</span>
                                            <span>Number: {art.signals?.numberPenalty?.toFixed(1) ?? art.numberPenalty?.toFixed(1) ?? "—"}</span>
                                            <span>Recency: {art.signals?.recencyMultiplier?.toFixed(2) ?? art.recencyMultiplier?.toFixed(2) ?? "—"}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fact Check */}
                    {result.factCheckResults?.length > 0 && (
                        <div className="result-card fade-in-up" style={{ animationDelay: "0.45s" }}>
                            <h3>Fact Check Results</h3>
                            {result.factCheckResults.map((fc, i) => (
                                <div key={i} className="fact-row">
                                    <p className="fact-claim">{fc.claimText || fc.text}</p>
                                    <span className="fact-rating">{fc.rating || "Unrated"}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button className="analyze-another" onClick={resetForm}>
                        Analyze Another
                    </button>
                </div>
            )}

            {result?.error && (
                <div className="result-card fade-in-up" style={{ marginTop: 24, textAlign: "center" }}>
                    <p style={{ color: "#ef4444", fontWeight: 600 }}>{result.error}</p>
                    <button className="analyze-another" onClick={resetForm} style={{ marginTop: 16 }}>
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
