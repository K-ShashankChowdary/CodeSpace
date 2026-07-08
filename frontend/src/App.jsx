import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import api from "./services/api";
import Auth from "./pages/Auth";
import IDE from "./pages/IDE";
import Dashboard from "./pages/Dashboard";
import GuestJoin from "./pages/GuestJoin";
import InterviewEnded from "./pages/InterviewEnded";
import ErrorBoundary from "./components/ErrorBoundary";
import Spinner from "./components/ui/Spinner";
import { socket } from "./utils/socket";

function App() {
  // null = checking, true = logged in, false = not logged in
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  // /join/* and /interview-ended routes are fully public — skip auth check entirely
  const isGuestRoute = location.pathname.startsWith("/join/") || location.pathname === "/interview-ended";

  useEffect(() => {
    if (isGuestRoute) return; // don't hit /users/me for guest pages
    const checkAuthStatus = async () => {
      try {
        const res = await api.get("/users/me");
        const user = res.data.data;

        // Restrict guest access strictly to the interview workspace
        if (user.isGuest && !location.pathname.startsWith("/problem/")) {
          localStorage.removeItem("guestToken");
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
        if (!socket.connected) {
          socket.connect();
        }
      } catch (err) {
        console.error(err);
        setIsAuthenticated(false);
      }
    };
    checkAuthStatus();
  }, [isGuestRoute, location.pathname]);

  // Show the guest join page immediately — no auth spinner needed
  if (isGuestRoute) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/join/:sessionCode" element={<GuestJoin />} />
          <Route path="/interview-ended" element={<InterviewEnded />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  // loading spinner while checking auth to prevent flash of wrong page
  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen bg-[#030303] flex flex-col items-center justify-center">
        <Spinner size="md" label="Authenticating" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />} />
        {/* /problem/:id accessible to both logged-in users and guests (guest has guestToken in localStorage) */}
        <Route path="/problem/:id" element={isAuthenticated || localStorage.getItem("guestToken") ? <IDE /> : <Navigate to="/auth" />} />
        <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
        <Route path="/interview-ended" element={<InterviewEnded />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/auth"} />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;