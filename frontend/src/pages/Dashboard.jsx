import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { socket } from "../utils/socket";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import Input from "../components/ui/Input";
import Toast from "../components/ui/Toast";
import CustomProblemModal from "../components/ui/CustomProblemModal";
import { Search, Plus, Play, Info as InfoIcon, LogOut, LayoutGrid, Users, X, CheckCircle2 } from "lucide-react";

function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  
  // Host Room Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
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

  // Invite link shown after session creation
  const [inviteLink, setInviteLink] = useState(null);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  const handleCreateRoom = async () => {
    if (selectedProblems.length === 0) return;
    setIsCreatingRoom(true);
    try {
      const res = await api.post("/sessions/create", { problemIds: selectedProblems });
      const { sessionCode, inviteLink: link } = res.data.data;
      setCreatedRoomCode(sessionCode);
      setInviteLink(`${window.location.origin}${link}`);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Session creation failed:", error);
      showToast(error.response?.data?.message || "Failed to create session", "error");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleCreateCustomProblem = async (problemData) => {
    try {
      const res = await api.post("/problems", problemData);
      const newProblem = res.data.data;
      setProblems(prev => [...prev, newProblem]);
      showToast("Custom problem created!", "success");
      setIsCustomModalOpen(false);
      // Auto-select it in the room creation modal
      if (!selectedProblems.includes(newProblem._id)) {
        setSelectedProblems(prev => [...prev, newProblem._id]);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to create problem", "error");
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



  return (
    <div className="h-screen w-screen bg-[#030303] text-zinc-300 font-sans flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-white/[0.05] flex flex-col shrink-0 z-20 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="p-8 border-b border-white/[0.05] relative z-10">
          <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-3 active:scale-95 transition-transform cursor-pointer" onClick={() => navigate("/")}>
            <div className="relative group">
              <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 group-hover:opacity-70 transition-opacity" />
              <img src="/fevicon.svg" alt="CodeSpace" className="w-9 h-9 relative z-10 drop-shadow-xl" />
            </div>
            <span className="text-gradient">CodeSpace</span>
          </h1>
        </div>
        
        <div className="p-5 flex-1 flex flex-col gap-8 relative z-10">
          <div className="space-y-1.5">
            <div className="w-full px-4 py-2.5 rounded-xl bg-cyan-500/10 
            text-cyan-400 font-bold text-sm border border-cyan-500/20 inner-glow glow-cyan backdrop-blur-md">
              Problem Set
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full text-left px-4 py-2.5 rounded-xl text-zinc-400 font-bold text-sm hover:bg-white/[0.03] hover:text-white transition-all group flex justify-between items-center">
              Host Interview
              <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-cyan-400 font-black glow-cyan">›</span>
            </button>
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
      <main className="flex-1 flex flex-col overflow-hidden bg-[#030303] relative">
        <div className="absolute inset-0 animated-mesh-bg opacity-40 z-0 pointer-events-none" />
        
        <header className="h-24 px-12 flex items-center justify-between border-b border-white/[0.05] bg-[#0a0a0a]/30 backdrop-blur-3xl sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic drop-shadow-lg">Problem Set</h2>
          </div>
          <div className="w-72">
             <Input 
                placeholder="Search problems" 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                className="w-full glass-panel border-white/10 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
              />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-12 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-sm">
              {error}
            </div>
          )}

          <div className="w-full glass-card rounded-3xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/[0.05] bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500 backdrop-blur-md">
              <div className="col-span-12 sm:col-span-6 pl-6">Title</div>
              <div className="col-span-3 hidden sm:block text-center">Difficulty</div>
              <div className="col-span-3 hidden sm:block"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-white/[0.02]">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: i * 0.05 }} 
                    key={i} 
                    className="relative grid grid-cols-12 gap-4 p-6 items-center"
                  >
                    <div className="col-span-12 sm:col-span-6 pl-4">
                      <div className="h-5 w-3/4 bg-white/5 rounded-md animate-pulse"></div>
                      <div className="mt-2 sm:hidden h-3 w-1/3 bg-white/5 rounded-md animate-pulse"></div>
                    </div>
                    <div className="col-span-3 hidden sm:flex items-center justify-center">
                      <div className="h-6 w-16 bg-white/5 rounded-full animate-pulse"></div>
                    </div>
                    <div className="col-span-3 hidden sm:flex items-center justify-end pr-6">
                      <div className="h-8 w-24 bg-white/5 rounded-full animate-pulse"></div>
                    </div>
                  </motion.div>
                ))
              ) : mainFilteredProblems.length === 0 && !error ? (
                 <div className="py-20 text-center">
                  <div className="text-4xl mb-4 opacity-50">📁</div>
                  <h3 className="text-lg font-bold text-zinc-300">No problems found</h3>
                  <p className="text-zinc-500 text-sm mt-2">Adjust your search filter or check database connectivity.</p>
                </div>
              ) : (
                mainFilteredProblems.map((problem, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    key={problem._id} 
                    onClick={() => navigate(`/problem/${problem._id}`)}
                    className="relative grid grid-cols-12 gap-4 p-6 items-center cursor-pointer transition-all duration-300 group overflow-hidden hover:bg-white/[0.02]"
                  >
                    {/* Glassmorphism Hover Background */}
                    <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 group-hover:backdrop-blur-md transition-all duration-500" />
                    
                    {/* Left Accent Border */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-cyan-400 transition-all duration-300 transform scale-y-0 group-hover:scale-y-100 glow-cyan" />

                    <div className="col-span-12 sm:col-span-6 pl-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-zinc-200 group-hover:text-white transition-colors truncate tracking-tight drop-shadow-sm">
                            {problem.title}
                          </h3>
                          <div className="mt-1.5 sm:hidden flex items-center gap-2">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                               problem.difficulty === "Easy" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : 
                               problem.difficulty === "Medium" ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10" : 
                               "text-red-400 border-red-500/20 bg-red-500/10"
                             }`}>
                               {problem.difficulty || "Standard"}
                             </span>
                             <span className="text-[10px] text-cyan-400 font-black uppercase tracking-tighter italic">Solve ›</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-3 hidden sm:flex items-center justify-center relative z-10">
                      <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-lg border backdrop-blur-md transition-all ${
                         problem.difficulty === "Easy" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10 group-hover:border-emerald-400/50 group-hover:glow-emerald" : 
                         problem.difficulty === "Medium" ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10 group-hover:border-yellow-400/50" : 
                         "text-red-400 border-red-500/20 bg-red-500/10 group-hover:border-red-400/50"
                       }`}>
                        {problem.difficulty || "Standard"}
                      </span>
                    </div>

                    <div className="col-span-3 hidden sm:flex items-center justify-end pr-6 relative z-10">
                      <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-zinc-400 font-black text-[10px] uppercase tracking-widest group-hover:bg-cyan-500 group-hover:border-cyan-400 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-300 transform group-hover:scale-105 backdrop-blur-md">
                        <span>Solve</span>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
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
                  Create Interview Session
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
                   <div 
                     onClick={() => setIsCustomModalOpen(true)} 
                     className="p-4 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex items-center gap-4 border bg-[#0a0a0a] border-white/5 hover:border-white/10 hover:bg-white/[0.02] group"
                   >
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-zinc-900 border-zinc-800">
                       <Plus className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                     </div>
                     <div className="min-w-0">
                       <h3 className="text-sm font-black tracking-tight text-zinc-200 group-hover:text-white">Create Custom Problem</h3>
                       <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Draft your own question and hidden test cases</div>
                     </div>
                   </div>
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
                       Start Interview
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

      {/* Invite Link Panel — shown after session creation */}
      {inviteLink && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0d0d0d] border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">Session Created</h2>
                <p className="text-xs text-zinc-500 font-mono tracking-widest">Code: {createdRoomCode}</p>
              </div>
            </div>

            <p className="text-sm text-zinc-400 mb-4">
              Share this link with your candidate. They can join without creating an account.
            </p>

            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-zinc-700/60 rounded-xl px-4 py-3 mb-6">
              <span className="text-xs text-blue-400 font-mono truncate flex-1">{inviteLink}</span>
              <button
                id="copy-invite-link"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  showToast("Invite link copied!", "success");
                }}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-all shrink-0"
              >
                Copy
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setInviteLink(null); setCreatedRoomCode(null); }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-bold transition-all"
              >
                Stay Here
              </button>
              <button
                id="enter-interview-room"
                onClick={() => { setInviteLink(null); navigate(`/problem/${selectedProblems[0]}?session=${createdRoomCode}`); }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black uppercase tracking-widest transition-all"
              >
                Enter Room →
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomProblemModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={handleCreateCustomProblem}
      />
    </div>
  );
}

export default Dashboard;