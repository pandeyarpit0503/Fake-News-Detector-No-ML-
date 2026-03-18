import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data } = await axios.post("/api/auth/login", formData);
            // Store token and user
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            // Trigger storage event for Navbar to pick up
            window.dispatchEvent(new Event("storage"));
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.error || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0f1628 100%)" }}>
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold gradient-text mb-2">Welcome Back</h1>
                    <p className="text-slate-400">Log in to verify more news.</p>
                </div>

                <div className="card p-8 bg-slate-800/20 backdrop-blur-xl border border-slate-700/50">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                placeholder="you@example.com"
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                placeholder="Enter your password"
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all glow-blue ${loading ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
                                }`}
                        >
                            {loading ? "Logging in..." : "Log In"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-400">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
