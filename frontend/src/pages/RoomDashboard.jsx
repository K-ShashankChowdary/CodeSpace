import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

function RoomDashboard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/details/${roomCode}`);
        setRoom(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load room details.");
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomCode]);

  if (loading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="md" label="Loading Classroom" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-300 gap-4">
        <div className="text-red-400 bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-xl">
          {error || "Room not found."}
        </div>
        <Button variant="secondary" onClick={() => navigate("/")}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#050505] text-zinc-300 font-sans flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-zinc-800/50 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-zinc-800/50">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/fevicon.svg" alt="CodeSpace" className="w-8 h-8 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">CodeSpace</span>
          </h1>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-6">
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Menu</span>
            <button onClick={() => navigate("/")} className="w-full text-left px-3 py-2 rounded-lg text-zinc-400 font-medium text-sm hover:bg-zinc-900 transition-colors group flex justify-between items-center hidden sm:flex">
              ‹ Global Dashboard
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg bg-zinc-900 
            text-blue-400 font-medium text-sm border border-zinc-800 hover:border-zinc-700 transition-colors">
              Classroom View
            </button>
          </div>

          <div className="space-y-3 mt-auto mb-4 bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Classroom Info</span>
            <p className="text-white text-sm font-bold flex items-center justify-between">
              Host: <span className="text-blue-400 font-mono font-medium">{room.host?.username || "Unknown"}</span>
            </p>
            <p className="text-white text-sm font-bold flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
              Code: <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs tracking-widest">{room.roomCode}</span>
            </p>
          </div>
        </div>
        
        <div className="p-4 border-t border-zinc-800/50">
          <Button variant="ghost" onClick={handleLogout} className="w-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 justify-start">
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#020202] relative shadow-[inset_1px_0_0_0_rgba(255,255,255,0.05)]">
        <header className="h-20 px-10 flex items-center justify-between border-b border-zinc-800/50 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Assigned Problems</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
          <div className="w-full bg-[#0a0a0a] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800/60 bg-[#050505] text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="col-span-12 sm:col-span-6 pl-6">Title</div>
              <div className="col-span-3 hidden sm:block text-center">Difficulty</div>
              <div className="col-span-3 hidden sm:block"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-800/50">
              {room.problems && room.problems.length > 0 ? (
                room.problems.map((problem) => (
                  <div 
                    key={problem._id} 
                    onClick={() => navigate(`/problem/${problem._id}?room=${room.roomCode}`)}
                    className="relative grid grid-cols-12 gap-4 p-5 items-center cursor-pointer transition-all duration-300 group overflow-hidden"
                  >
                    {/* Glassmorphism Hover Background */}
                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 group-hover:backdrop-blur-sm transition-all duration-500" />
                    
                    {/* Left Accent Border */}
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-blue-500 transition-all duration-300 transform scale-y-0 group-hover:scale-y-100" />

                    <div className="col-span-12 sm:col-span-6 pl-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate tracking-tight">
                            {problem.title}
                          </h3>
                          <div className="mt-1 sm:hidden flex items-center gap-2">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                               problem.difficulty === "Easy" ? "text-green-400 border-green-500/20 bg-green-500/10" : 
                               problem.difficulty === "Medium" ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10" : 
                               "text-red-400 border-red-500/20 bg-red-500/10"
                             }`}>
                              {problem.difficulty || "Standard"}
                            </span>
                            <span className="text-[10px] text-blue-500 font-black uppercase tracking-tighter italic">Solve ›</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-3 hidden sm:flex items-center justify-center relative z-10">
                      <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all ${
                         problem.difficulty === "Easy" ? "text-green-400 border-green-500/10 bg-green-500/5 group-hover:border-green-500/30" : 
                         problem.difficulty === "Medium" ? "text-yellow-400 border-yellow-500/10 bg-yellow-500/5 group-hover:border-yellow-500/30" : 
                         "text-red-400 border-red-500/10 bg-red-500/5 group-hover:border-red-500/30"
                       }`}>
                        {problem.difficulty || "Standard"}
                      </span>
                    </div>

                    <div className="col-span-3 hidden sm:flex items-center justify-end pr-6 relative z-10">
                      <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-black text-[10px] uppercase tracking-widest group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 transform group-hover:scale-105">
                        <span>Solve</span>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                 <div className="py-20 text-center">
                  <div className="text-4xl mb-4 opacity-50">📁</div>
                  <h3 className="text-lg font-bold text-zinc-300">No problems assigned</h3>
                  <p className="text-zinc-500 text-sm mt-2">The host has not added any problems to this room.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RoomDashboard;
