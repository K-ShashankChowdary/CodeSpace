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
import Landing from "./pages/Landing";
import { socket } from "./utils/socket";

function App() {
  // null = still checking, true = logged in, false = not logged in
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  // /join/* and /interview-ended are fully public — skip auth check entirely
  const isGuestRoute =
    location.pathname.startsWith("/join/") ||
    location.pathname === "/interview-ended";

  useEffect(() => {
    if (isGuestRoute) return;
    const checkAuthStatus = async () => {
      try {
        const res = await api.get("/users/me");
        const user = res.data.data;

        // Restrict guest tokens strictly to the interview workspace
        if (user.isGuest && !location.pathname.startsWith("/problem/")) {
          localStorage.removeItem("guestToken");
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
        if (!socket.connected) socket.connect();
      } catch {
        // 401 / network error → treat as unauthenticated
        setIsAuthenticated(false);
      }
    };
    checkAuthStatus();
  }, [isGuestRoute, location.pathname]);

  // Guest routes: render immediately with no auth gate
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

  // While auth check is in-flight:
  //  - "/" → show Landing immediately (avoids blank flash / unwanted redirect)
  //  - "/auth" → show Auth immediately (user navigated there explicitly)
  //  - protected pages (e.g. /problem/:id) → show spinner until resolved
  if (isAuthenticated === null) {
    const isLandingOrAuth =
      location.pathname === "/" || location.pathname === "/auth";

    if (isLandingOrAuth) {
      // Render the page the user actually requested right away
      if (location.pathname === "/auth") {
        return (
          <ErrorBoundary>
            <Auth />
          </ErrorBoundary>
        );
      }
      return (
        <ErrorBoundary>
          <Landing />
        </ErrorBoundary>
      );
    }

    // For everything else, wait with a spinner
    return (
      <div className="h-screen w-screen bg-[#030303] flex flex-col items-center justify-center">
        <Spinner size="md" label="Authenticating" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* "/" → Dashboard if logged in, Landing if not */}
        <Route
          path="/"
          element={isAuthenticated ? <Dashboard /> : <Landing />}
        />

        {/* "/auth" → Auth form if not logged in, redirect home if already logged in */}
        <Route
          path="/auth"
          element={!isAuthenticated ? <Auth /> : <Navigate to="/" replace />}
        />

        {/* IDE: accessible to authenticated users and guests with a guestToken */}
        <Route
          path="/problem/:id"
          element={
            isAuthenticated || localStorage.getItem("guestToken") ? (
              <IDE />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="/interview-ended" element={<InterviewEnded />} />

        {/* Unknown paths → home (Landing for guests, Dashboard for users) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;