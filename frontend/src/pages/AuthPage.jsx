import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../utils/api";
import LoadingSpinner from "../components/shared/LoadingSpinner";

/* ── Field extracted outside AuthPage to avoid re-mount on every keystroke ── */
function Field({ label, type, value, onChange, error, placeholder, show, onToggle }) {
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div className="form-input-wrap">
                <input
                    className={`form-input${error ? " error" : ""}`}
                    type={onToggle ? (show ? "text" : "password") : (type || "text")}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={type === "password" ? "current-password" : "off"}
                />
                {onToggle && (
                    <button type="button" className="eye-btn" onClick={onToggle} tabIndex={-1}>
                        {show ? "🙈" : "👁"}
                    </button>
                )}
            </div>
            {error && <div className="field-error">{error}</div>}
        </div>
    );
}

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

export default function AuthPage({ setUser, sessionMsg, setSessionMsg, initialTab = "login" }) {
    const navigate = useNavigate();
    const [tab, setTab] = useState(initialTab === "signup" ? "signup" : "login");
    const [loading, setLoading] = useState(false);
    const [banner, setBanner] = useState(sessionMsg ? { type: "error", text: sessionMsg } : null);

    // Login state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPass, setLoginPass] = useState("");
    const [showLoginPass, setShowLoginPass] = useState(false);
    const [loginErrors, setLoginErrors] = useState({});

    // Signup state
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPass, setSignupPass] = useState("");
    const [signupConfirm, setSignupConfirm] = useState("");
    const [showSignupPass, setShowSignupPass] = useState(false);
    const [showSignupConfirm, setShowSignupConfirm] = useState(false);
    const [signupErrors, setSignupErrors] = useState({});

    useEffect(() => {
        setTab(initialTab === "signup" ? "signup" : "login");
    }, [initialTab]);

    const switchTab = (t) => {
        setTab(t);
        setBanner(null);
        setLoginErrors({});
        setSignupErrors({});
        if (setSessionMsg) setSessionMsg("");
    };

    const validateLogin = () => {
        const e = {};
        if (!loginEmail.trim()) e.email = "This field is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) e.email = "Enter a valid email";
        if (!loginPass) e.password = "This field is required";
        setLoginErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateSignup = () => {
        const e = {};
        if (!signupEmail.trim()) e.email = "This field is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) e.email = "Enter a valid email";
        if (!signupPass) e.password = "This field is required";
        else if (signupPass.length < 6) e.password = "Min 6 characters";
        if (!signupConfirm) e.confirm = "This field is required";
        else if (signupPass !== signupConfirm) e.confirm = "Passwords do not match";
        setSignupErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateLogin()) return;
        setLoading(true);
        setBanner(null);
        try {
            const email = normalizeEmail(loginEmail);
            const res = await api.login(email, loginPass);
            const { token, user } = res.data;
            setToken(token);
            const userData = { username: user?.email || email, email: user?.email || email, user_id: user?.user_id, token };
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            const msg = err.response?.status === 401
                ? "Invalid email or password. If you're new here, create an account first."
                : err.response?.data?.error || "Login failed. Please try again.";
            setBanner({ type: "error", text: msg });
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!validateSignup()) return;
        setLoading(true);
        setBanner(null);
        try {
            await api.signup(normalizeEmail(signupEmail), signupPass);
            switchTab("login");
            setBanner({ type: "success", text: "Account created! Please log in." });
        } catch (err) {
            if (err.response?.status === 409) {
                setSignupErrors(prev => ({ ...prev, email: "Email already exists" }));
            } else {
                setBanner({ type: "error", text: err.response?.data?.error || "Signup failed." });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-branding">
                <h1 className="gradient-text">FAKE NEWS DETECTOR</h1>
            </div>

            <div className="auth-card">
                <div className="tab-switcher">
                    <button className={`tab-btn${tab === "login" ? " active" : ""}`} onClick={() => switchTab("login")}>Login</button>
                    <button className={`tab-btn${tab === "signup" ? " active" : ""}`} onClick={() => switchTab("signup")}>Sign Up</button>
                </div>

                {banner && (
                    <div className={`form-banner ${banner.type}`}>{banner.text}</div>
                )}

                {tab === "login" ? (
                    <form onSubmit={handleLogin}>
                        <Field label="Email" type="email" value={loginEmail} onChange={setLoginEmail} error={loginErrors.email} placeholder="Enter your email" />
                        <Field label="Password" type="password" value={loginPass} onChange={setLoginPass} error={loginErrors.password} placeholder="Enter your password" show={showLoginPass} onToggle={() => setShowLoginPass(!showLoginPass)} />
                        <button type="submit" className="btn-gradient submit-btn" disabled={loading}>
                            {loading ? <><LoadingSpinner small /> Logging in...</> : "Login"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSignup}>
                        <Field label="Email" type="email" value={signupEmail} onChange={setSignupEmail} error={signupErrors.email} placeholder="Enter your email" />
                        <Field label="Password" type="password" value={signupPass} onChange={setSignupPass} error={signupErrors.password} placeholder="Create a password" show={showSignupPass} onToggle={() => setShowSignupPass(!showSignupPass)} />
                        <Field label="Confirm Password" type="password" value={signupConfirm} onChange={setSignupConfirm} error={signupErrors.confirm} placeholder="Confirm your password" show={showSignupConfirm} onToggle={() => setShowSignupConfirm(!showSignupConfirm)} />
                        <button type="submit" className="btn-gradient submit-btn" disabled={loading}>
                            {loading ? <><LoadingSpinner small /> Creating account...</> : "Sign Up"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
