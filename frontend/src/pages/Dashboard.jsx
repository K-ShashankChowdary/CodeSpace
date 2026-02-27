import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch all available problems when the dashboard loads
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/v1/problems", {
          withCredentials: true,
        });
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

  const handleCreateRoom = async (problemId) => {
    try {
      console.log("Attempting to create room for problem:", problemId);

      const res = await axios.post(
        "http://localhost:5000/api/v1/rooms/create",
        { problemId },
        { withCredentials: true },
      );

      console.log("Backend Response:", res.data); 

      const { roomCode, problemId: pId } = res.data.data;
      navigate(`/problem/${pId}?room=${roomCode}`);
    } catch (error) {
      console.error("🔥 FULL ERROR:", error);
      alert(error.response?.data?.message || "Failed to create room");
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    try {
      const res = await axios.post(
        "http://localhost:5000/api/v1/rooms/join",
        { roomCode: roomCodeInput },
        { withCredentials: true },
      );

      const { problemId, roomCode } = res.data.data;

      // Redirect the student to the IDE with the room code
      navigate(`/problem/${problemId}?room=${roomCode}`);
    } catch (error) {
      console.error("Failed to join room", error);
      alert(error.response?.data?.message || "Invalid or expired room code");
    }
  };

  // --- NEW LOGOUT FUNCTION ---
  const handleLogout = async () => {
    try {
      // Calls the backend to clear the httpOnly cookie
      await axios.post(
        "http://localhost:5000/api/v1/auth/logout", // <-- Update this if your route is different
        {}, 
        { withCredentials: true }
      );
      
      // Redirect user back to the login page
      navigate("/login"); 
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              CodeSpace
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Select a problem or join a classroom
            </p>
          </div>

          {/* Right Side Controls: Join Form + Logout Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <form onSubmit={handleJoinRoom} className="flex gap-3">
              <input
                className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-sm font-mono focus:border-blue-500 outline-none uppercase placeholder:normal-case transition-colors w-48"
                placeholder="Enter Room Code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                type="submit"
                disabled={!roomCodeInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              >
                Join
              </button>
            </form>

            {/* NEW LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-8 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {problems.length === 0 && !error ? (
            <div className="text-center py-12 text-zinc-500 border border-zinc-800 rounded-xl border-dashed">
              No problems found in the database.
            </div>
          ) : (
            problems.map((problem) => (
              <div
                key={problem._id}
                className="bg-[#0d0d0d] border border-zinc-800 p-6 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:border-zinc-700 transition-all group"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {problem.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 ${problem.difficulty === "Easy" ? "text-green-500" : problem.difficulty === "Medium" ? "text-yellow-500" : "text-red-500"}`}
                    >
                      {problem.difficulty || "Standard"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/problem/${problem._id}`)}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                  >
                    Solve Alone
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCreateRoom(problem._id);
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-zinc-700 transition-all shadow-lg"
                  >
                    Host Room
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;