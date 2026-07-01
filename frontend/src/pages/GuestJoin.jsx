import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

function GuestJoin() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/users/me");
        if (res.data?.data && !res.data.data.isGuest) {
          setCurrentUser(res.data.data);
        }
      } catch (err) {
        // Not logged in, stay as guest
      }
    };
    checkAuth();
  }, []);

  const handleAuthenticatedJoin = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Formally join the session on the backend using the logged-in user's name
      const res = await api.post("/sessions/guest-join", {
        name: currentUser.username,
        sessionCode,
      });
      const { guestToken, activeProblem } = res.data.data;
      
      localStorage.setItem("guestToken", guestToken);
      
      if (!activeProblem) {
        setError("No active problem found in this session.");
        setIsLoading(false);
        return;
      }
      
      navigate(`/problem/${activeProblem}?session=${sessionCode}`);
    } catch (err) {
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
      setError(
        err.response?.data?.message || "Failed to join session. Check the invite link."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center font-sans text-zinc-200 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
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
              <button
                type="button"
                onClick={handleAuthenticatedJoin}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? "Joining..." : `Join as ${currentUser.username} →`}
              </button>
              
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
      </div>
    </div>
  );
}

export default GuestJoin;
