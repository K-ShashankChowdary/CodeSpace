import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import api from "./services/api";
import Auth from "./pages/Auth";
import IDE from "./pages/IDE";
import Dashboard from "./pages/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import Spinner from "./components/ui/Spinner";


function App() {
  // null = checking, true = logged in, false = not logged in
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await api.get("/users/me");
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

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
        <Route path="/problem/:id" element={isAuthenticated ? <IDE /> : <Navigate to="/auth" />} />
        <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/auth"} />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;