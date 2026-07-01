import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

function GuestJoin() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name to join.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/sessions/guest-join", {
        name: trimmedName,
        sessionCode,
      });
      const { guestToken, activeProblem } = res.data.data;
      
      localStorage.setItem("guestToken", guestToken);
      // Remove any regular access token to avoid conflicts
      localStorage.removeItem("accessToken");
      
      if (!activeProblem) {
        setError("No active problem found in this session.");
        setIsLoading(false);
        return;
      }
      
      // Navigate directly to the active problem in the session
      navigate(`/problem/${activeProblem}?session=${sessionCode}`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to join session. Check the invite link."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center font-sans text-zinc-200 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <img src="/fevicon.svg" alt="CodeSpace" className="w-8 h-8" />
          <span className="text-xl font-black tracking-tighter text-white">
            Code<span className="text-blue-400">Space</span>
          </span>
        </div>

        <div className="bg-[#0d0d0d] border border-zinc-800/60 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">
              Join Interview
            </h1>
            <p className="text-sm text-zinc-500">
              Session{" "}
              <span className="text-blue-400 font-mono font-bold tracking-widest">
                {sessionCode}
              </span>
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                htmlFor="candidate-name"
                className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2"
              >
                Your Name
              </label>
              <input
                id="candidate-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoFocus
                maxLength={40}
                className="w-full bg-[#1a1a1a] border border-zinc-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              id="guest-join-btn"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Joining...
                </>
              ) : (
                "Join Interview →"
              )}
            </button>
          </form>

          <p className="text-[11px] text-zinc-600 text-center mt-5 leading-relaxed">
            No account required. You'll enter the interview workspace directly.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestJoin;
