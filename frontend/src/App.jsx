import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import api from "./services/api";
import Auth from "./pages/Auth";
import IDE from "./pages/IDE";
import Dashboard from "./pages/Dashboard";
import RoomDashboard from "./pages/RoomDashboard";
import GuestJoin from "./pages/GuestJoin";
import ErrorBoundary from "./components/ErrorBoundary";
import Spinner from "./components/ui/Spinner";
import { socket } from "./utils/socket";

function App() {
  // null = checking, true = logged in, false = not logged in
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  // /join/* routes are fully public — skip auth check entirely
  const isGuestRoute = location.pathname.startsWith("/join/");

  useEffect(() => {
    if (isGuestRoute) return; // don't hit /users/me for guest pages
    const checkAuthStatus = async () => {
      try {
        await api.get("/users/me");
        setIsAuthenticated(true);
        if (!socket.connected) {
          socket.connect();
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuthStatus();
  }, [isGuestRoute]);

  // Show the guest join page immediately — no auth spinner needed
  if (isGuestRoute) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/join/:sessionCode" element={<GuestJoin />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  // loading spinner while checking auth to prevent flash of wrong page
  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center">
        <Spinner size="md" label="Authenticating" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />} />
        <Route path="/room/:roomCode" element={isAuthenticated ? <RoomDashboard /> : <Navigate to="/auth" />} />
        {/* /problem/:id accessible to both logged-in users and guests (guest has guestToken in localStorage) */}
        <Route path="/problem/:id" element={isAuthenticated || localStorage.getItem("guestToken") ? <IDE /> : <Navigate to="/auth" />} />
        <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/auth"} />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;