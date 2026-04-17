import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./pages/DashboardLayout";
import AnalyzeSection from "./components/sections/AnalyzeSection";
import HistorySection from "./components/sections/HistorySection";
import StatsSection from "./components/sections/StatsSection";
import { getToken } from "./utils/api";

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    const token = getToken();
    if (stored && token) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [sessionMsg, setSessionMsg] = useState("");

  const authElement = (initialTab = "login") =>
    user ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <AuthPage
        setUser={setUser}
        sessionMsg={sessionMsg}
        setSessionMsg={setSessionMsg}
        initialTab={initialTab}
      />
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={authElement("login")} />
        <Route path="/login" element={authElement("login")} />
        <Route path="/signup" element={authElement("signup")} />

        <Route
          element={
            user ? (
              <DashboardLayout user={user} setUser={setUser} />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        >
          <Route
            path="/dashboard"
            element={<AnalyzeSection username={user?.username || user?.email} />}
          />
          <Route path="/history" element={<HistorySection />} />
          <Route path="/stats" element={<StatsSection />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
