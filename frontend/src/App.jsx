import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Auth from "./pages/Auth";
import IDE from "./pages/IDE";
import Dashboard from "./pages/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";

// send cookies with every request (needed for httpOnly JWT cookies)
axios.defaults.withCredentials = true;

function App() {
  // null = checking, true = logged in, false = not logged in
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // if the session cookie is valid, /me succeeds and we're authenticated
        await axios.get("http://localhost:5000/api/v1/users/me");
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
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">
          Authenticating
        </p>
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