import { useState, useEffect } from "react";

export default function SourceCard({ article, index }) {
    const [animatedWidth, setAnimatedWidth] = useState(0);

    useEffect(() => {
        setAnimatedWidth(0);
        const timeout = setTimeout(() => {
            setAnimatedWidth(article.matchScore);
        }, 100);
        return () => clearTimeout(timeout);
    }, [article.matchScore]);

    // Determine tier badge color
    let tierColor = "bg-[var(--beige-300)]"; // Tier 3
    if (article.tier === 1) tierColor = "bg-[var(--coral)]";
    else if (article.tier === 2) tierColor = "bg-[var(--warning)]";

    // Determine score pill color
    let scoreClass = "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20";
    let barColor = "bg-[var(--success)]";
    if (article.matchScore < 40) {
        scoreClass = "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20";
        barColor = "bg-[var(--danger)]";
    } else if (article.matchScore < 60) {
        scoreClass = "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20";
        barColor = "bg-[var(--warning)]";
    }

    const dateStr = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "Unknown date";

    return (
        <div
            className="pb-4 border-b border-[var(--beige-200)] last:border-0 last:pb-0 fade-in-up"
            style={{ animationDelay: `${index * 0.08}s` }}
        >
            <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${tierColor}`} title={`Tier ${article.tier} Source`}></div>
                    <div className="min-w-0">
                        <span className="font-bold text-[var(--brown)] text-sm block mb-0.5">{article.source}</span>
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-playfair text-[0.95rem] font-bold text-[var(--brown)] hover:text-[var(--coral)] transition-colors leading-tight line-clamp-2"
                        >
                            {article.title}
                        </a>
                    </div>
                </div>
                <div className={`shrink-0 border px-2.5 py-1 rounded-full text-xs font-bold font-lato shadow-sm flex items-center justify-center min-w-[50px] ${scoreClass}`}>
                    {Math.round(article.matchScore)}%
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[var(--beige-100)] rounded-full overflow-hidden mt-3 mb-1.5">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                    style={{ width: `${animatedWidth}%` }}
                ></div>
            </div>

            <p className="text-xs text-[var(--brown-light)] mt-1">{dateStr}</p>
        </div>
    );
}
