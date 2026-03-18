export default function KeywordTags({ keywords }) {
    if (!keywords || keywords.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {keywords.map((kw, i) => (
                <span
                    key={i}
                    className="bg-[var(--beige-100)] border border-[var(--beige-200)] text-[var(--brown)] px-3.5 py-1.5 rounded-full font-lato text-sm fade-in-up hover:bg-[var(--beige-200)] transition-colors cursor-default block"
                    style={{ animationDelay: `${i * 0.05}s` }}
                >
                    {kw}
                </span>
            ))}
        </div>
    );
}
