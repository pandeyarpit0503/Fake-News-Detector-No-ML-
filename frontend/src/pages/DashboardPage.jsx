import { useState } from "react";
import Navbar from "../components/Navbar";
import AnalyzeSection from "../components/sections/AnalyzeSection";
import HistorySection from "../components/sections/HistorySection";
import StatsSection from "../components/sections/StatsSection";
import { clearToken } from "../utils/api";

export default function DashboardPage({ user, setUser }) {
    const [section, setSection] = useState("analyze");

    const handleLogout = () => {
        clearToken();
        setUser(null);
    };

    return (
        <div className="dashboard-page">
            <Navbar
                activeSection={section}
                onNavigate={setSection}
                onLogout={handleLogout}
            />
            {section === "analyze" && <AnalyzeSection username={user.username} />}
            {section === "history" && <HistorySection onNavigate={setSection} />}
            {section === "stats" && <StatsSection />}
        </div>
    );
}
