export default function LoadingSpinner({ small }) {
    return <span className={`spinner${small ? " small" : ""}`} />;
}
