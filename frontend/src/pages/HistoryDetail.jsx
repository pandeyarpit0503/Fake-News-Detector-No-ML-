import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import ScoreMeter from "../components/ScoreMeter";
import VerdictBadge from "../components/VerdictBadge";
import SourceCard from "../components/SourceCard";
import FactCheckResults from "../components/FactCheckResults";
import KeywordTags from "../components/KeywordTags";

export default function HistoryDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get(`/api/history/${id}`)
            .then(r => setData(r.data))
            .catch(() => setError("Could not load this search."))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0e1a" }}>
            <div className="text-slate-400">Loading...</div>
        </div>
    );
    if (error || !data) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0e1a" }}>
            <div className="text-red-400">{error || "Not found"}</div>
        </div>
    );

    return (
        <div className="min-h-[calc(100vh-3.5rem)] px-4 py-12 flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0f1628 100%)" }}>
            <div className="w-full max-w-3xl space-y-5 flex flex-col items-center text-center">
                <button
                    onClick={() => navigate("/history")}
                    className="text-slate-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-1 w-full"
                >
                    ← Back to History
                </button>

                <div className="card p-4 text-sm text-slate-300 leading-relaxed w-full max-w-2xl mx-auto">
                    <p className="text-xs text-slate-500 mb-1">Verified news text:</p>
                    {data.news_text}
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                    <div className="card p-6 flex items-center justify-center">
                        <ScoreMeter score={parseFloat(data.trust_score)} color={
                            data.verdict === "REAL" ? "green" :
                                data.verdict === "PARTIALLY CORRECT" ? "orange" :
                                    data.verdict === "FAKE / MISLEADING" ? "red" : "gray"
                        } />
                    </div>
                    <VerdictBadge verdict={{
                        label: data.verdict,
                        color: data.verdict === "REAL" ? "green" : data.verdict === "PARTIALLY CORRECT" ? "orange" : data.verdict === "FAKE / MISLEADING" ? "red" : "gray",
                        icon: data.verdict === "REAL" ? "✅" : data.verdict === "PARTIALLY CORRECT" ? "⚠️" : data.verdict === "FAKE / MISLEADING" ? "❌" : "❓",
                        description: "",
                    }} fromCache={false} />
                </div>

                <KeywordTags keywords={data.keywords || []} entities={{}} />

                {data.factCheckResults?.length > 0 && (
                    <FactCheckResults results={data.factCheckResults.map(f => ({
                        claim: f.claim_text,
                        claimBy: f.claim_by,
                        rating: f.rating,
                        url: f.rating_url,
                    }))} />
                )}

                {data.matchedArticles?.length > 0 && (
                    <div className="space-y-3 w-full">
                        <h2 className="text-sm font-semibold text-slate-400 text-center">Matched Sources</h2>
                        {data.matchedArticles.map((a, i) => (
                            <SourceCard key={i} index={i} article={{
                                title: a.title,
                                url: a.url,
                                source: a.source_name,
                                publishedAt: a.published_at,
                                matchScore: parseFloat(a.match_score),
                                tier: a.source_tier,
                                signals: {
                                    keywordScore: parseFloat(a.keyword_score),
                                    entityScore: parseFloat(a.entity_score),
                                    contradictionPenalty: parseFloat(a.contradiction_penalty),
                                    numberPenalty: parseFloat(a.number_penalty),
                                    recencyMultiplier: parseFloat(a.recency_multiplier),
                                    sourceWeight: parseFloat(a.source_weight),
                                },
                            }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
