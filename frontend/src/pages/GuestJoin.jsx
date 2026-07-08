import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import api from "../services/api";

function GuestJoin() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/users/me");
        if (res.data?.data && !res.data.data.isGuest) {
          setCurrentUser(res.data.data);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // Not logged in, stay as guest
      }
    };
    checkAuth();
  }, []);

  const handleAuthenticatedJoin = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (displayName.trim()) {
        sessionStorage.setItem("customDisplayName", displayName.trim());
      } else {
        sessionStorage.removeItem("customDisplayName");
      }
      
      // Clear any leftover guest token so the interviewer is properly authenticated
      localStorage.removeItem("guestToken");
      
      // Fetch session details to get activeProblem without creating a guest token
      const res = await api.get(`/sessions/details/${sessionCode}`);
      const session = res.data.data;
      const activeProblem = session.activeProblem || session.problemIds?.[0]?._id || session.problemIds?.[0];
      
      if (!activeProblem) {
        setError("No active problem found in this session.");
        setIsLoading(false);
        return;
      }
      
      navigate(`/problem/${activeProblem}?session=${sessionCode}`);
    } catch (err) {
      console.error(err);
      setError("Failed to join session. You may not have access.");
      setIsLoading(false);
    }
  };

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
      // Remove any regular access token to avoid conflicts if they somehow had both
      localStorage.removeItem("accessToken");
      
      if (!activeProblem) {
        setError("No active problem found in this session.");
        setIsLoading(false);
        return;
      }
      
      navigate(`/problem/${activeProblem}?session=${sessionCode}`);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to join session. Check the invite link."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#030303] flex flex-col items-center justify-center font-sans text-zinc-200 relative overflow-hidden">
      <div className="absolute inset-0 animated-mesh-bg opacity-30 z-0 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="flex items-center gap-3 justify-center mb-10">
          <img src="/fevicon.svg" alt="CodeSpace" className="w-10 h-10 drop-shadow-xl" />
          <span className="text-2xl font-black tracking-tighter text-white">
            Code<span className="text-gradient">Space</span>
          </span>
        </div>

        <div className="glass-panel rounded-3xl p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <div className="mb-8 relative z-10">
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">
              Join Interview
            </h1>
            <p className="text-sm text-zinc-500">
              Session{" "}
              <span className="text-cyan-400 font-mono font-bold tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {sessionCode}
              </span>
            </p>
          </div>

          {currentUser ? (
            <div className="space-y-6 mb-6">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Logged in as</p>
                  <p className="text-sm text-white font-black">{currentUser.username}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-black text-lg">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Display Name (Confidential Mode)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={`Leave blank to use '${currentUser.username}'`}
                  className="w-full bg-[#1a1a1a] border border-zinc-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
              </div>
              <div>
              <button
                type="button"
                onClick={handleAuthenticatedJoin}
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transform active:scale-[0.98]"
              >
                {isLoading ? "Joining..." : "Enter Room"}
              </button>
            </div>
              
              <div className="flex items-center gap-4 py-2">
                <div className="h-px bg-zinc-800 flex-1"></div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">OR JOIN AS GUEST</span>
                <div className="h-px bg-zinc-800 flex-1"></div>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                htmlFor="candidate-name"
                className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2"
              >
                {currentUser ? "Guest Name" : "Your Name"}
              </label>
              <input
                id="candidate-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoFocus={!currentUser}
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
              className={`w-full py-3.5 rounded-xl ${currentUser ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-blue-600 hover:bg-blue-500 text-white'} disabled:opacity-40 disabled:cursor-not-allowed text-sm font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2`}
            >
              {isLoading ? "Joining..." : (currentUser ? "Join as Guest" : "Join Interview →")}
            </button>
          </form>

          {!currentUser && (
             <div className="text-center mt-6">
               <p className="text-[11px] text-zinc-500 font-medium">
                 Already have an account?{" "}
                 <button 
                   type="button"
                   onClick={() => navigate(`/auth?returnTo=/join/${sessionCode}`)}
                   className="text-blue-400 hover:text-blue-300 transition-colors font-bold tracking-wide"
                 >
                   Log in here
                 </button>
               </p>
             </div>
          )}

          <p className="text-[10px] text-zinc-600 text-center mt-6 uppercase tracking-widest font-bold">
            No account required for guests
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default GuestJoin;
