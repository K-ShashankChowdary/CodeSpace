import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Auth from "./pages/auth";
import IDE from "./pages/IDE";

axios.defaults.withCredentials = true;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/v1/users/me",
        );

        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen bg-[#121212] flex items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-sans text-sm tracking-wide">
          Verifying session...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <IDE /> : <Navigate to="/auth" />}
      />
      <Route
        path="/auth"
        element={!isAuthenticated ? <Auth /> : <Navigate to="/" />}
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/" : "/auth"} />}
      />
    </Routes>
  );
}

export default App;
