export default function VerdictBadge({ verdict, fromCache }) {
    if (!verdict) return null;

    let bgClass = "bg-[var(--success)]";
    let icon = "✅";

    switch (verdict.label) {
        case "FAKE / MISLEADING":
            bgClass = "bg-[var(--danger)]";
            icon = "❌";
            break;
        case "PARTIALLY CORRECT":
            bgClass = "bg-[var(--warning)]";
            icon = "⚠️";
            break;
        case "UNVERIFIED":
            bgClass = "bg-[var(--gray)]";
            icon = "❓";
            break;
    }

    return (
        <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-white font-bold tracking-wide shadow-sm ${bgClass}`}>
                <span>{icon}</span>
                <span>{verdict.label}</span>
            </div>

            {fromCache && (
                <span className="flex items-center gap-1 text-[var(--coral)] text-xs font-bold px-2 py-1 rounded bg-[var(--coral)]/10 border border-[var(--coral)]/20 animate-pulse">
                    ⚡ CACHED
                </span>
            )}
        </div>
    );
}
