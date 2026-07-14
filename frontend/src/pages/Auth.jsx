import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Toast from "../components/ui/Toast";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast(null);
    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/users/login" : "/users/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      // 🚨 FIX 1: Capture the response from the API
      const response = await api.post(endpoint, payload);

      // 🚨 FIX 2: Save the token to localStorage for Socket.io to use
      const token = response.data?.data?.accessToken;
      if (token) {
        localStorage.setItem("accessToken", token);
      }
      
      // Ensure any leftover guest sessions are cleared when logging in
      localStorage.removeItem("guestToken");

      if (isLogin) {
        showToast("Logged in successfully!", "success");
        setTimeout(() => {
          const urlParams = new URLSearchParams(window.location.search);
          const returnTo = urlParams.get("returnTo") || "/";
          window.location.href = returnTo;
        }, 1000);
      } else {
        showToast("Account created! Please log in.", "success");
        setIsLogin(true);
        setFormData({ username: "", email: "", password: "" });
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Authentication failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center text-gray-200 font-sans p-4 relative">
      <div className="bg-[#121212] p-8 rounded-xl border border-[#2a2a2a] w-full max-w-md shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">CodeSpace</h1>
          <h2 className="text-sm font-medium text-gray-400">
            {isLogin ? "Welcome back. Log in to continue." : "Create your account to get started."}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <Input
              label="Username"
              type="text"
              name="username"
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
              required={!isLogin}
            />
          )}
          <Input
            label="Email Address"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            className="w-full mt-4"
          >
            {isLoading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="my-6 flex items-center justify-between">
          <span className="w-1/5 border-b border-[#2a2a2a] lg:w-1/4"></span>
          <span className="text-xs text-center text-gray-500 uppercase">or continue with</span>
          <span className="w-1/5 border-b border-[#2a2a2a] lg:w-1/4"></span>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <Button
            type="button"
            variant="google"
            size="lg"
            className="w-full flex items-center justify-center gap-3"
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || '/api/v1'}/users/auth/google`}
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </Button>
          
          <Button
            type="button"
            variant="github"
            size="lg"
            className="w-full flex items-center justify-center gap-3"
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || '/api/v1'}/users/auth/github`}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Continue with GitHub
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="text-blue-500 font-semibold hover:text-blue-400 transition-colors focus:outline-none"
            onClick={() => { 
              setIsLogin(!isLogin); 
              setToast(null); // Fixed undefined setError bug
            }}
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default Auth;