import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken } from "../utils/api";

export default function LoginPage({ setUser }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!formData.email) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Enter a valid email address";

        if (!formData.password) newErrors.password = "Password is required";
        else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError("");

        if (!validate()) return;

        setLoading(true);
        try {
            const { data } = await api.login(formData.email, formData.password);
            setToken(data.token);
            setUser(data.user);
            navigate("/dashboard");
        } catch (err) {
            if (err.response?.status === 401) {
                setApiError("Invalid email or password");
            } else {
                setApiError(err.response?.data?.error || "Cannot connect to server");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[var(--beige-50)]">
            {/* Left Panel */}
            <div className="hidden md:flex flex-col justify-center w-[40%] bg-[var(--coral)] p-12 relative overflow-hidden text-white">
                <div className="relative z-10 fade-in-up">
                    <h1 className="font-playfair text-5xl font-bold leading-tight mb-4">
                        FAKE<br />NEWS<br />DETECTOR
                    </h1>
                    <p className="text-xl font-light opacity-90">Know the truth before you share</p>
                </div>

                {/* Decorative Wavy Lines */}
                <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 1440 320">
                    <path fill="#ffffff" fillOpacity="1" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
                <div className="w-full max-w-md bg-[var(--beige-100)] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-10 fade-in-up">
                    <div className="md:hidden text-center mb-8">
                        <h1 className="font-playfair text-3xl font-bold text-[var(--coral)]">Fake News Detector</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="font-playfair text-3xl font-bold text-[var(--brown)] mb-2">Welcome Back</h2>
                        <p className="text-[var(--brown-light)]">Sign in to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {apiError && (
                            <div className="p-3 bg-red-50 text-[var(--coral-dark)] border border-red-200 rounded-lg text-sm fade-in text-center">
                                {apiError}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-[var(--brown)]">Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className={`w-full bg-[var(--beige-50)] border outline-none rounded-lg px-4 py-3 text-[var(--brown)] transition-colors ${errors.email ? "border-[var(--coral)] focus:border-[var(--coral)]" : "border-[var(--beige-200)] focus:border-[var(--coral-light)]"
                                    }`}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            {errors.email && <p className="text-[var(--danger)] text-xs mt-1 fade-in">{errors.email}</p>}
                        </div>

                        <div className="space-y-1 relative">
                            <label className="text-sm font-bold text-[var(--brown)]">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    className={`w-full bg-[var(--beige-50)] border outline-none rounded-lg pl-4 pr-12 py-3 text-[var(--brown)] transition-colors ${errors.password ? "border-[var(--coral)] focus:border-[var(--coral)]" : "border-[var(--beige-200)] focus:border-[var(--coral-light)]"
                                        }`}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brown-light)] hover:text-[var(--brown)] focus:outline-none"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            {errors.password && <p className="text-[var(--danger)] text-xs mt-1 fade-in">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-lens w-full bg-[var(--coral)] text-[var(--beige-50)] font-bold rounded-lg py-3 mt-4 transition-transform hover:-translate-y-0.5 hover:bg-[var(--coral-dark)] flex justify-center items-center"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : "Sign In"}
                        </button>
                    </form>

                    <div className="my-6 flex items-center">
                        <div className="flex-1 border-b border-[var(--beige-200)]"></div>
                        <span className="px-3 text-sm text-[var(--brown-light)]">or</span>
                        <div className="flex-1 border-b border-[var(--beige-200)]"></div>
                    </div>

                    <p className="text-center text-sm text-[var(--brown-light)]">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-[var(--coral)] font-bold hover:text-[var(--coral-dark)] transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
