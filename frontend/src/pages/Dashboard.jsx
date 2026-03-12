import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { socket } from "../utils/socket";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import Input from "../components/ui/Input";
import Toast from "../components/ui/Toast";
import { Search, Plus, Play, Info as InfoIcon, LogOut, LayoutGrid, Users, X, CheckCircle2 } from "lucide-react";

function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  
  // Host Room Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  
  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const navigate = useNavigate();

  // 🚨 Connect socket when arriving at the dashboard
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

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

  const handleCreateRoom = async () => {
    if (selectedProblems.length === 0) return;
    setIsCreatingRoom(true);
    try {
      const res = await api.post("/rooms/create", { problems: selectedProblems });
      const { roomCode } = res.data.data;
      navigate(`/room/${roomCode}`);
    } catch (error) {
      console.error("Room creation failed:", error);
      showToast(error.response?.data?.message || "Failed to create room", "error");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim() || isJoiningRoom) return;
    setIsJoiningRoom(true);
    try {
      const res = await api.post("/rooms/join", { roomCode: roomCodeInput });
      const { roomCode } = res.data.data;
      navigate(`/room/${roomCode}`);
    } catch (error) {
      console.error("Failed to join room", error);
      showToast(error.response?.data?.message || "Invalid or expired room code", "error");
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (socket.connected) {
        socket.disconnect();
      }
      // 🚨 CRITICAL: Clear the token so the socket doesn't auto-connect on the login page
      localStorage.removeItem("accessToken");
      
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Failed to logout. Please try again.", "error");
    }
  };

  const toggleProblemSelection = (pId) => {
    setSelectedProblems(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  const mainFilteredProblems = useMemo(() => {
    if (!searchFilter) return problems;
    return problems.filter(p => p.title.toLowerCase().includes(searchFilter.toLowerCase()));
  }, [problems, searchFilter]);

  const modalFilteredProblems = useMemo(() => {
    if (!modalSearch) return problems;
    return problems.filter(p => p.title.toLowerCase().includes(modalSearch.toLowerCase()));
  }, [problems, modalSearch]);

  if (isLoading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="md" label="Loading Workspace" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#050505] text-zinc-300 font-sans flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-zinc-800/50 flex flex-col shrink-0 z-20">
        <div className="p-8 border-b border-zinc-800/40">
          <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-3 active:scale-95 transition-transform" onClick={() => navigate("/")}>
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
              <img src="/fevicon.svg" alt="CodeSpace" className="w-9 h-9 relative z-10" />
            </div>
            <span className="text-gradient">CodeSpace</span>
          </h1>
        </div>
        
        <div className="p-5 flex-1 flex flex-col gap-8">
          <div className="space-y-1.5">
            <div className="w-full px-4 py-2.5 rounded-xl bg-blue-500/10 
            text-blue-400 font-bold text-sm border border-blue-500/20 inner-glow">
              Problem Set
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full text-left px-4 py-2.5 rounded-xl text-zinc-500 font-bold text-sm hover:bg-zinc-900 transition-all group flex justify-between items-center">
              Host Classroom
              <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500 font-black">›</span>
            </button>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleJoinRoom} className="px-1 flex flex-col gap-3">
              <Input
                name="roomCode"
                placeholder="Classroom Code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full font-mono uppercase bg-zinc-900/30 border-zinc-800/40 text-xs"
              />
              <Button type="submit" variant="primary" disabled={!roomCodeInput.trim() || isJoiningRoom} className="w-full text-[10px]">
                {isJoiningRoom ? "Joining..." : "Join Classroom"}
              </Button>
            </form>
          </div>
        </div>
        
        <div className="p-6 border-t border-zinc-800/40">
          <Button 
            variant="ghost" 
            onClick={handleLogout} 
            className="w-full bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500/50 justify-start group/logout px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-md flex items-center gap-3 shadow-[0_8px_32px_rgba(239,68,68,0.1)]"
          >
            <LogOut className="w-4 h-4 group-hover/logout:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#020202] relative shadow-[inset_1px_0_0_0_rgba(255,255,255,0.03)]">
        <header className="h-24 px-12 flex items-center justify-between border-b border-zinc-800/30 bg-[#0a0a0a]/40 backdrop-blur-2xl sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic">Problem Set</h2>
          </div>
          <div className="w-72">
             <Input 
                placeholder="Search problems" 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                className="w-full bg-zinc-900/20 border-zinc-800/40 text-xs"
              />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-sm">
              {error}
            </div>
          )}

          <div className="w-full bg-[#0a0a0a] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800/60 bg-[#050505] text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="col-span-12 sm:col-span-6 pl-6">Title</div>
              <div className="col-span-3 hidden sm:block text-center">Difficulty</div>
              <div className="col-span-3 hidden sm:block"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-800/50">
              {mainFilteredProblems.length === 0 && !error ? (
                 <div className="py-20 text-center">
                  <div className="text-4xl mb-4 opacity-50">📁</div>
                  <h3 className="text-lg font-bold text-zinc-300">No problems found</h3>
                  <p className="text-zinc-500 text-sm mt-2">Adjust your search filter or check database connectivity.</p>
                </div>
              ) : (
                mainFilteredProblems.map((problem) => (
                  <div 
                    key={problem._id} 
                    onClick={() => navigate(`/problem/${problem._id}`)}
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
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Host Room Modal (Preserved & Polished) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-linear-to-b from-white/[0.02] to-transparent">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  Host Session
                </h2>
                <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                  Select problems to assign
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-zinc-500 hover:text-white w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search Area */}
            <div className="px-10 py-6 border-b border-white/5 bg-white/[0.01]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  placeholder="Filter by title..." 
                  value={modalSearch} 
                  onChange={(e) => setModalSearch(e.target.value)} 
                  className="pl-11 py-5 bg-zinc-900/10 border-white/5 focus:border-blue-500/30 text-xs rounded-2xl"
                />
              </div>
            </div>
            
            {/* Problem Selection Grid */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#050505]">
               {modalFilteredProblems.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-30 italic">
                    <Search className="w-10 h-10 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest ">No problems found</p>
                 </div>
               ) : (
                 <div className="flex flex-col gap-2">
                   {modalFilteredProblems.map(p => (
                     <div 
                       key={p._id} 
                       onClick={() => toggleProblemSelection(p._id)} 
                       className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex items-center justify-between border group
                       ${selectedProblems.includes(p._id) 
                           ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                           : 'bg-[#0a0a0a] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                       }`}
                     >
                       <div className="flex items-center gap-4 flex-1 min-w-0">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                            selectedProblems.includes(p._id) ? "bg-blue-500 border-blue-400" : "bg-zinc-900 border-zinc-800"
                         }`}>
                           {selectedProblems.includes(p._id) ? (
                             <CheckCircle2 className="w-5 h-5 text-white" />
                           ) : null}
                         </div>
                         <div className="min-w-0">
                           <h3 className={`text-sm font-black tracking-tight truncate ${selectedProblems.includes(p._id) ? "text-blue-400" : "text-zinc-200"}`}>
                             {p.title}
                           </h3>
                           <div className="flex items-center gap-2 mt-0.5">
                             <span className={`text-[7px] font-black uppercase tracking-widest ${
                               p.difficulty === "Easy" ? "text-green-500" : 
                               p.difficulty === "Medium" ? "text-yellow-500" : 
                               "text-red-500"
                             }`}>
                               {p.difficulty || "Standard"}
                             </span>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div> 
            
            {/* Modal Footer */}
            <div className="px-10 py-8 border-t border-white/5 bg-linear-to-t from-white/[0.02] to-transparent flex justify-between items-center">
                <div className="flex items-center gap-6">
                   <div className="flex flex-col">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Selection</div>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedProblems.length > 0 ? (
                          <span className="text-xl font-black text-blue-400 animate-in slide-in-from-bottom-2 duration-300">
                            {selectedProblems.length} <span className="text-xs uppercase tracking-widest text-zinc-400 ml-1">Problems Selected</span>
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-zinc-700 italic">No selection</span>
                        )}
                      </div>
                   </div>
                </div>
               <div className="flex gap-4">
                 <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Maybe Later</Button>
                 <Button 
                   variant="primary" 
                   onClick={handleCreateRoom} 
                   disabled={selectedProblems.length === 0 || isCreatingRoom}
                   className="h-14 px-10 rounded-2xl shadow-[0_20px_40px_rgba(59,130,246,0.2)]"
                 >
                   {isCreatingRoom ? <Spinner size="sm" /> : (
                     <span className="flex items-center gap-3">
                       <Play className="w-5 h-5 fill-current" />
                       Start Classroom
                     </span>
                   )}
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default Dashboard;