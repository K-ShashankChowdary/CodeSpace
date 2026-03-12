import React, { useState, useEffect, useMemo } from "react";
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
  const [searchFilter, setSearchFilter] = useState("");
  
  // Host Room Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const navigate = useNavigate();

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
      alert(error.response?.data?.message || "Failed to create room");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    try {
      const res = await api.post("/rooms/join", { roomCode: roomCodeInput });
      const { roomCode } = res.data.data;
      navigate(`/room/${roomCode}`);
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
        <div className="p-6 border-b border-zinc-800/50">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
            <img src="/fevicon.svg" alt="CodeSpace" className="w-8 h-8 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">CodeSpace</span>
          </h1>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-6">
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Menu</span>
            <div className="w-full px-3 py-2 rounded-lg bg-zinc-900/50 
            text-blue-400 font-medium text-sm border border-blue-500/20 shadow-[0_0_10px_rgba(37,99,235,0.1)]">
              Dashboard
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full text-left px-3 py-2 rounded-lg text-zinc-400 font-medium text-sm hover:bg-zinc-900 transition-colors group flex justify-between items-center">
              Host Classroom
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">→</span>
            </button>
          </div>

          <div className="space-y-3">
            <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Student Access</span>
            <form onSubmit={handleJoinRoom} className="px-1 flex flex-col gap-2">
              <Input
                name="roomCode"
                placeholder="Enter Room Code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full font-mono uppercase bg-[#050505] border-zinc-800 text-sm"
              />
              <Button type="submit" variant="primary" disabled={!roomCodeInput.trim()} className="w-full text-sm">
                Join Classroom
              </Button>
            </form>
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
            <h2 className="text-2xl font-black text-white tracking-tighter">Problem Set</h2>
          </div>
          <div className="w-64">
             <Input 
                placeholder="Search problems..." 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                className="w-full bg-[#0d0d0d] border-zinc-800 text-sm"
              />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800/60 flex justify-between items-center bg-[#050505]">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Host a Classroom</h2>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Select problems to assign</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors">✕</button>
            </div>
            
            <div className="p-5 border-b border-zinc-800/60 bg-[#0a0a0a]">
               <Input 
                 placeholder="Search problems by title..." 
                 value={modalSearch} 
                 onChange={(e) => setModalSearch(e.target.value)} 
                 className="w-full bg-[#050505] border-zinc-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-sm"
               />
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-[#050505] border-b border-zinc-800/60">
               {modalFilteredProblems.length === 0 ? (
                 <p className="text-center py-12 text-sm text-zinc-600 font-bold uppercase tracking-widest">No problems match your search</p>
               ) : (
                 <div className="divide-y divide-zinc-800/50">
                   {modalFilteredProblems.map(p => (
                     <div 
                       key={p._id} 
                       onClick={() => toggleProblemSelection(p._id)} 
                       className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all duration-200 group ${
                         selectedProblems.includes(p._id) 
                           ? 'bg-blue-500/5' 
                           : 'hover:bg-zinc-900/50'
                       }`}
                     >
                       <div className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                         selectedProblems.includes(p._id) 
                           ? 'bg-blue-600 border-blue-500 text-white' 
                           : 'border-zinc-700 bg-zinc-900/50 text-transparent group-hover:border-zinc-500'
                       }`}>
                         <svg className={`w-3.5 h-3.5 transition-transform ${selectedProblems.includes(p._id) ? "scale-100" : "scale-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                         </svg>
                       </div>
                       
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between gap-4">
                           <h3 className={`text-sm font-medium truncate ${selectedProblems.includes(p._id) ? "text-blue-400" : "text-zinc-200"}`}>
                             {p.title}
                           </h3>
                           <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                             p.difficulty === "Easy" ? "text-green-400 border-green-500/20 bg-green-500/10" : 
                             p.difficulty === "Medium" ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10" : 
                             "text-red-400 border-red-500/20 bg-red-500/10"
                           }`}>
                             {p.difficulty || "Standard"}
                           </span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div> 
            
            <div className="p-5 border-t border-zinc-800/60 bg-[#050505] flex justify-between items-center">
               <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/60 px-4 py-2 rounded-lg">
                 <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Selected</span>
                 <span className="text-blue-400 text-sm font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                   {selectedProblems.length}
                 </span>
               </div>
               <div className="flex gap-3">
                 <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                 <Button variant="primary" onClick={handleCreateRoom} disabled={selectedProblems.length === 0 || isCreatingRoom} className="shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                   {isCreatingRoom ? <Spinner size="sm" /> : "Start Classroom"}
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;