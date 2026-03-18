import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./pages/DashboardLayout";
import AnalyzeSection from "./components/sections/AnalyzeSection";
import HistorySection from "./components/sections/HistorySection";
import StatsSection from "./components/sections/StatsSection";
import { getToken } from "./utils/api";

export default function App() {
  // Restore user from localStorage on mount so sessions survive refresh
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    const token = getToken();
    if (stored && token) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });
  const [sessionMsg, setSessionMsg] = useState("");

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth route — redirect to dashboard if already logged in */}
        <Route
          path="/auth"
          element={
            user
              ? <Navigate to="/dashboard" replace />
              : <AuthPage setUser={setUser} sessionMsg={sessionMsg} setSessionMsg={setSessionMsg} />
          }
        />

        {/* Protected routes — redirect to auth if not logged in */}
        <Route
          element={
            user
              ? <DashboardLayout user={user} setUser={setUser} />
              : <Navigate to="/auth" replace />
          }
        >
          <Route path="/dashboard" element={<AnalyzeSection username={user?.username || user?.email} />} />
          <Route path="/history" element={<HistorySection />} />
          <Route path="/stats" element={<StatsSection />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
