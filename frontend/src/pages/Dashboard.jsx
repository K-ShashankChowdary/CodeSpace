import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import Input from "../components/ui/Input";

function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // fetch all problems on mount
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await api.get("/problems");
        setProblems(res.data.data);
      } catch (err) {
        console.error("Error fetching problems:", err);
        setError("Failed to load problems.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProblems();
  }, []);

  // creates a classroom room and navigates to the teacher's IDE view
  const handleCreateRoom = async (problemId) => {
    try {
      const res = await api.post("/rooms/create", { problemId });
      const { roomCode, problemId: pId } = res.data.data;
      navigate(`/problem/${pId}?room=${roomCode}`);
    } catch (error) {
      console.error("Room creation failed:", error);
      alert(error.response?.data?.message || "Failed to create room");
    }
  };

  // joins an existing classroom room by code
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    try {
      const res = await api.post("/rooms/join", { roomCode: roomCodeInput });
      const { problemId, roomCode } = res.data.data;
      navigate(`/problem/${problemId}?room=${roomCode}`);
    } catch (error) {
      console.error("Failed to join room", error);
      alert(error.response?.data?.message || "Invalid or expired room code");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    // 1. Lock the outer container to EXACTLY the screen height and hide page-level overflow
    <div className="h-screen w-screen bg-[#050505] text-zinc-300 font-sans flex flex-col overflow-hidden">
      
      {/* Wrapper to center content, taking up full height */}
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full p-8">
        
        {/* 2. Make the header shrink-0 so it never gets squished by the scrolling list */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">CodeSpace</h1>
            <p className="text-zinc-500 text-sm mt-1">Select a problem or join a classroom</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <form onSubmit={handleJoinRoom} className="flex gap-3">
              <Input
                name="roomCode"
                placeholder="Enter Room Code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-48 font-mono uppercase"
              />
              <Button type="submit" variant="primary" disabled={!roomCodeInput.trim()}>
                Join
              </Button>
            </form>
            <Button variant="ghost" onClick={handleLogout} className="hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10">
              Logout
            </Button>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* 3. The Magic Box: flex-1 takes remaining space, overflow-y-auto creates the scrollbar */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-4">
          <div className="grid gap-4">
            {problems.length === 0 && !error ? (
              <div className="text-center py-12 text-zinc-500 border border-zinc-800 rounded-xl border-dashed">
                No problems found in the database.
              </div>
            ) : (
              problems.map((problem) => (
                <div key={problem._id} className="bg-[#0d0d0d] border border-zinc-800 p-6 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:border-zinc-700 transition-all group">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">{problem.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 ${problem.difficulty === "Easy" ? "text-green-500" : problem.difficulty === "Medium" ? "text-yellow-500" : "text-red-500"}`}>
                        {problem.difficulty || "Standard"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => navigate(`/problem/${problem._id}`)}>
                      Solve Alone
                    </Button>
                    <Button variant="secondary" onClick={() => handleCreateRoom(problem._id)}>
                      Host Room
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default Dashboard;