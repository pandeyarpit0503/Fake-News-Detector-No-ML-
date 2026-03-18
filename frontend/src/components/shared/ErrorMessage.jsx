export default function ErrorMessage({ message, onDismiss }) {
    if (!message) return null;

    return (
        <div className="bg-[#FFF5F3] border-l-4 border-[var(--coral)] p-4 rounded-r-lg shadow-sm flex items-start justify-between fade-in-up">
            <div className="flex items-center gap-3">
                <span className="text-[var(--coral)] text-xl">⚠️</span>
                <p className="text-[var(--coral-dark)] font-medium text-sm">{message}</p>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="text-[var(--coral)] hover:text-[var(--coral-dark)] p-1 rounded-md hover:bg-white"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
