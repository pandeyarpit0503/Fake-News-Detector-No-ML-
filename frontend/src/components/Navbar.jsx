import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ activeSection, onLogout }) {
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const navItems = [
        { label: "Analyze", key: "dashboard", path: "/dashboard" },
        { label: "History", key: "history", path: "/history" },
        { label: "Stats",   key: "stats",   path: "/stats" },
    ];

    const handleNav = (path) => {
        navigate(path);
        setMobileOpen(false);
    };

    const confirmLogout = () => {
        setShowModal(false);
        onLogout();
    };

    return (
        <>
            <nav className="navbar">
                <span className="navbar-brand gradient-text">Fake News Detector</span>

                <div className="navbar-links">
                    {navItems.map((item) => (
                        <button
                            key={item.key}
                            className={`nav-btn${activeSection === item.key ? " active" : ""}`}
                            onClick={() => handleNav(item.path)}
                        >
                            {item.label}
                        </button>
                    ))}
                    <button className="nav-btn logout" onClick={() => setShowModal(true)}>
                        Logout
                    </button>
                </div>

                <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? "✕" : "☰"}
                </button>
            </nav>

            <div className={`mobile-menu${mobileOpen ? " open" : ""}`}>
                {navItems.map((item) => (
                    <button
                        key={item.key}
                        className={`nav-btn${activeSection === item.key ? " active" : ""}`}
                        onClick={() => handleNav(item.path)}
                    >
                        {item.label}
                    </button>
                ))}
                <button className="nav-btn logout" onClick={() => { setMobileOpen(false); setShowModal(true); }}>
                    Logout
                </button>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Confirm Logout</h3>
                        <p>Are you sure you want to log out?</p>
                        <div className="modal-actions">
                            <button className="modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="modal-confirm-logout" onClick={confirmLogout}>Logout</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
