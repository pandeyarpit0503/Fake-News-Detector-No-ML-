import { useState, useEffect } from "react";
import { api } from "../../utils/api";
import LoadingSpinner from "../shared/LoadingSpinner";
import ErrorMessage from "../shared/ErrorMessage";
import StatsPieChart from "./StatsPieChart";

export default function StatsSection() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.getStats();
                setStats(data || {});
            } catch (err) {
                setError("Failed to load platform statistics.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Animated count up component inside the stats section
    const AnimatedCounter = ({ endValue, duration = 1500 }) => {
        const [count, setCount] = useState(0);

        useEffect(() => {
            let startTimestamp = null;
            const finalVal = parseInt(endValue) || 0;
            if (finalVal === 0) return;

            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);

                // easeOutQuart
                const ease = 1 - Math.pow(1 - progress, 4);
                setCount(Math.floor(ease * finalVal));

                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };

            window.requestAnimationFrame(step);
        }, [endValue, duration]);

        return <span>{count.toLocaleString()}</span>;
    };

    return (
        <div className="max-w-[1000px] mx-auto px-4 py-12">
            <div className="mb-10 text-center fade-in-up">
                <h2 className="font-playfair text-3xl font-bold text-[var(--brown)] mb-3">Platform Statistics</h2>
                <p className="font-lato text-[var(--brown-light)]">Overview of all news verified on this platform</p>
            </div>

            {loading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}

            {!loading && !error && stats && (
                <div className="flex flex-col lg:flex-row gap-12">

                    {/* Left Column: Grid Cards */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8">

                        <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] p-6 border-l-4 border-[var(--coral)] fade-in-up" style={{ animationDelay: "0.05s" }}>
                            <div className="text-[2rem] mb-2 leading-none">📰</div>
                            <div className="font-playfair text-5xl font-bold text-[var(--brown)] mb-2 mt-4">
                                <AnimatedCounter endValue={stats.total_searches} />
                            </div>
                            <div className="font-lato text-[0.85rem] text-[var(--brown-light)] uppercase tracking-wider font-bold">Total Analyzed</div>
                        </div>

                        <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] p-6 border-l-4 border-[var(--success)] fade-in-up" style={{ animationDelay: "0.10s" }}>
                            <div className="text-[2rem] mb-2 leading-none">✅</div>
                            <div className="font-playfair text-5xl font-bold text-[var(--brown)] mb-2 mt-4">
                                <AnimatedCounter endValue={stats.real_count} />
                            </div>
                            <div className="font-lato text-[0.85rem] text-[var(--brown-light)] uppercase tracking-wider font-bold">Confirmed Real</div>
                        </div>

                        <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] p-6 border-l-4 border-[var(--warning)] fade-in-up" style={{ animationDelay: "0.15s" }}>
                            <div className="text-[2rem] mb-2 leading-none">⚠️</div>
                            <div className="font-playfair text-5xl font-bold text-[var(--brown)] mb-2 mt-4">
                                <AnimatedCounter endValue={stats.partial_count} />
                            </div>
                            <div className="font-lato text-[0.85rem] text-[var(--brown-light)] uppercase tracking-wider font-bold">Partially Correct</div>
                        </div>

                        <div className="bg-[var(--beige-100)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] p-6 border-l-4 border-[var(--danger)] fade-in-up" style={{ animationDelay: "0.20s" }}>
                            <div className="text-[2rem] mb-2 leading-none">❌</div>
                            <div className="font-playfair text-5xl font-bold text-[var(--brown)] mb-2 mt-4">
                                <AnimatedCounter endValue={stats.fake_count} />
                            </div>
                            <div className="font-lato text-[0.85rem] text-[var(--brown-light)] uppercase tracking-wider font-bold">Fake / Misleading</div>
                        </div>

                        <div className="sm:col-span-2 bg-[var(--beige-200)] rounded-xl p-6 border-l-4 border-[var(--coral)] fade-in-up" style={{ animationDelay: "0.25s" }}>
                            <div className="flex items-center justify-between">
                                <span className="font-lato font-bold text-[var(--brown)] tracking-wide">AVERAGE TRUST SCORE</span>
                                <span className="font-playfair text-3xl font-bold text-[var(--coral)]">{parseFloat(stats.avg_trust_score || 0).toFixed(1)} / 100</span>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Pie Chart */}
                    <div className="w-full lg:w-[400px] bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-6 flex flex-col items-center justify-center">
                        <StatsPieChart data={stats} />
                    </div>

                </div>
            )}
        </div>
    );
}
