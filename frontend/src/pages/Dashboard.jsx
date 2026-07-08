import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import api from "../services/api";
import { socket } from "../utils/socket";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Toast from "../components/ui/Toast";
import CustomProblemModal from "../components/ui/CustomProblemModal";
import { Info as InfoIcon, CheckCircle2 } from "lucide-react";

import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import CommandCenterTab from "../components/dashboard/CommandCenterTab";
import QuestionBankTab from "../components/dashboard/QuestionBankTab";
import HostRoomModal from "../components/dashboard/HostRoomModal";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [problems, setProblems] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
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
    const fetchData = async () => {
      try {
        const [userRes, problemsRes, sessionsRes] = await Promise.all([
          api.get("/users/current-user").catch(() => ({ data: { data: null } })),
          api.get("/problems"),
          api.get("/sessions/me").catch(() => ({ data: { data: [] } }))
        ]);
        setCurrentUser(userRes.data.data);
        setProblems(problemsRes.data.data);
        setRecentSessions(sessionsRes.data.data || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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
      console.error("Failed to create custom problem", err);
      showToast(err.response?.data?.message || "Failed to create problem", "error");
    }
  };

  const handleDeleteCustomProblem = async (problemId, e) => {
    e.stopPropagation(); // Prevent toggling selection
    if (!window.confirm("Are you sure you want to delete this custom problem? This cannot be undone.")) {
      return;
    }
    
    try {
      await api.delete(`/problems/${problemId}`);
      setProblems(prev => prev.filter(p => p._id !== problemId));
      setSelectedProblems(prev => prev.filter(id => id !== problemId));
      showToast("Problem deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete problem:", err);
      showToast(err.response?.data?.message || "Failed to delete problem", "error");
    }
  };

  const handleDeleteSession = async (sessionCode) => {
    try {
      await api.post(`/sessions/close/${sessionCode}`);
      setRecentSessions(prev => prev.filter(s => s.sessionCode !== sessionCode));
      showToast("Session deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete session:", err);
      showToast(err.response?.data?.message || "Failed to delete session", "error");
    }
  };

  const toggleProblemSelection = (id) => {
    setSelectedProblems(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("guestToken");
      window.location.href = "/auth";
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      showToast("Invite link copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast("Failed to copy link", "error");
    }
  };

  const mainFilteredProblems = useMemo(() => {
    if (!searchFilter) return problems;
    return problems.filter(p => p.title.toLowerCase().includes(searchFilter.toLowerCase()));
  }, [problems, searchFilter]);

  const customFilteredProblems = useMemo(() => {
    return mainFilteredProblems.filter(p => p.isCustom);
  }, [mainFilteredProblems]);

  const builtInFilteredProblems = useMemo(() => {
    return mainFilteredProblems.filter(p => !p.isCustom);
  }, [mainFilteredProblems]);

  const modalFilteredProblems = useMemo(() => {
    if (!modalSearch) return problems;
    return problems.filter(p => p.title.toLowerCase().includes(modalSearch.toLowerCase()));
  }, [problems, modalSearch]);

  return (
    <div className="h-screen w-screen bg-[#030303] text-zinc-300 font-sans flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <DashboardSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setIsModalOpen={setIsModalOpen} 
        handleLogout={handleLogout} 
        navigate={navigate} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#030303] relative">
        <div className="absolute inset-0 animated-mesh-bg opacity-40 z-0 pointer-events-none" />
        
        <header className="h-24 px-12 flex items-center justify-between border-b border-white/[0.05] bg-[#0a0a0a]/30 backdrop-blur-3xl sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic drop-shadow-lg">{activeTab === "dashboard" ? "Command Center" : "Question Bank"}</h2>
          </div>
          {activeTab === "question_bank" && (
            <div className="w-72">
               <Input 
                  placeholder="Search problems" 
                  value={searchFilter} 
                  onChange={(e) => setSearchFilter(e.target.value)} 
                  className="w-full glass-panel border-white/10 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                />
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-12 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-sm">
              {error}
            </div>
          )}

          {activeTab === "dashboard" ? (
            <CommandCenterTab 
              recentSessions={recentSessions} 
              isLoading={isLoading} 
              setIsModalOpen={setIsModalOpen} 
              navigate={navigate} 
              onDeleteSession={handleDeleteSession}
              currentUser={currentUser}
            />
          ) : (
            <QuestionBankTab 
              isLoading={isLoading} 
              error={error} 
              mainFilteredProblems={mainFilteredProblems} 
              customFilteredProblems={customFilteredProblems} 
              builtInFilteredProblems={builtInFilteredProblems} 
              navigate={navigate} 
            />
          )}
        </div>
      </main>

      {/* Host Room Modal */}
      <HostRoomModal 
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        modalSearch={modalSearch}
        setModalSearch={setModalSearch}
        modalFilteredProblems={modalFilteredProblems}
        selectedProblems={selectedProblems}
        toggleProblemSelection={toggleProblemSelection}
        handleCreateRoom={handleCreateRoom}
        isCreatingRoom={isCreatingRoom}
        setIsCustomModalOpen={setIsCustomModalOpen}
        handleDeleteCustomProblem={handleDeleteCustomProblem}
      />

      {/* Invite Link Modal */}
      {inviteLink && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl max-w-md w-full shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            
            <h2 className="text-2xl font-black text-white text-center mb-2 tracking-tighter">Room Created!</h2>
            <p className="text-zinc-500 text-center text-sm mb-8">Share this invite link with your candidate to begin the interview.</p>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-8 flex items-center gap-3 group relative">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Invite Link</div>
                <div className="text-sm font-medium text-white truncate">{inviteLink}</div>
              </div>
              <Button onClick={copyInviteLink} variant="secondary" className="px-4 py-2 text-xs bg-white/10 hover:bg-white/20">
                Copy
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { setInviteLink(null); setCreatedRoomCode(null); }} className="flex-1">Close</Button>
              <Button variant="primary" onClick={async () => {
                try {
                  const res = await api.get(`/sessions/details/${createdRoomCode}`);
                  const session = res.data.data;
                  const activeProblem = session.activeProblem || session.problemIds?.[0]?._id || session.problemIds?.[0];
                  navigate(`/problem/${activeProblem}?session=${createdRoomCode}`);
                } catch {
                  navigate(`/join/${createdRoomCode}`);
                }
              }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-0">
                Enter Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Problem Creation Modal */}
      <CustomProblemModal 
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={handleCreateCustomProblem}
      />

      {/* Global Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
