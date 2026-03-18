import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { clearToken } from "../utils/api";

export default function DashboardLayout({ user, setUser }) {
    const location = useLocation();
    const navigate = useNavigate();

    // Derive active section from the current path
    const path = location.pathname.replace("/", "");
    const activeSection = ["history", "stats"].includes(path) ? path : "dashboard";

    const handleLogout = () => {
        clearToken();
        setUser(null);
        navigate("/auth", { replace: true });
    };

    return (
        <div className="dashboard-page">
            <Navbar
                activeSection={activeSection}
                onLogout={handleLogout}
            />
            <Outlet />
        </div>
    );
}
