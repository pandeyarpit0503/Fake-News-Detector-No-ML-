import { useState, useEffect } from "react";
import { api } from "../../utils/api";
import LoadingSpinner from "../shared/LoadingSpinner";
import ErrorMessage from "../shared/ErrorMessage";

export default function HistorySection() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await api.getHistory();
                setHistory(data.history || []);
            } catch (err) {
                setError("Failed to load search history.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const getVerdictBadge = (verdict) => {
        let bg = "bg-[var(--success)]";
        if (verdict === "FAKE / MISLEADING") bg = "bg-[var(--danger)]";
        else if (verdict === "PARTIALLY CORRECT") bg = "bg-[var(--warning)]";
        else if (verdict === "UNVERIFIED") bg = "bg-[var(--gray)]";
        return (
            <span className={`${bg} text-white px-3 py-1 text-[0.75rem] font-bold rounded-full`}>
                {verdict}
            </span>
        );
    };

    const getScoreColor = (score) => {
        if (score >= 70) return "text-[var(--success)]";
        if (score >= 40) return "text-[var(--warning)]";
        return "text-[var(--danger)]";
    };

    const openHistoryItem = (id) => {
        // Optional: If you want to build a deep link to analysis results, navigate to a details page.
        // For this iteration, we keep it simple.
        console.log("History item clicked:", id);
    };

    return (
        <div className="max-w-[900px] mx-auto px-4 py-12">
            <div className="mb-8 text-center fade-in-up">
                <h2 className="font-playfair text-3xl font-bold text-[var(--brown)] mb-3">Search History</h2>
                <p className="font-lato text-[var(--brown-light)]">Last 15 news verifications on this platform</p>
            </div>

            {loading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}

            {!loading && !error && history.length === 0 && (
                <div className="bg-[var(--beige-100)] rounded-xl shadow-sm border border-[var(--beige-200)] p-16 text-center fade-in text-[var(--brown-light)]">
                    <div className="text-5xl mb-4">📭</div>
                    <h3 className="font-playfair text-xl font-bold text-[var(--brown)] mb-2">No searches yet</h3>
                    <p>Start by analyzing a news article from the Analyze tab.</p>
                </div>
            )}

            {!loading && !error && history.length > 0 && (
                <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-6 overflow-hidden fade-in-up">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--beige-100)] border-b-2 border-[var(--beige-200)] text-[var(--brown)] font-lato font-bold text-[0.85rem] uppercase tracking-wider">
                                    <th className="py-4 px-6 font-semibold w-12 text-center">#</th>
                                    <th className="py-4 px-6 font-semibold min-w-[200px]">News Snippet</th>
                                    <th className="py-4 px-6 font-semibold text-center">Score</th>
                                    <th className="py-4 px-6 font-semibold w-[160px]">Verdict</th>
                                    <th className="py-4 px-6 font-semibold text-right w-[120px]">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--beige-200)]">
                                {history.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => openHistoryItem(item.id)}
                                        className="hover:bg-[var(--beige-100)]/50 transition-colors cursor-pointer group fade-in-up"
                                        style={{ animationDelay: `${index * 0.04}s` }}
                                    >
                                        <td className="py-4 px-6 text-center text-sm text-[var(--brown-light)]">
                                            {index + 1}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div
                                                className="text-[0.95rem] text-[var(--brown)] font-lato font-medium max-w-[300px] truncate group-hover:text-[var(--coral)] transition-colors"
                                                title={item.news_text}
                                            >
                                                {item.news_text}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`font-bold text-base ${getScoreColor(item.trust_score)}`}>
                                                {Math.round(item.trust_score)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            {getVerdictBadge(item.verdict)}
                                        </td>
                                        <td className="py-4 px-6 text-right text-sm text-[var(--brown-light)] whitespace-nowrap">
                                            {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
