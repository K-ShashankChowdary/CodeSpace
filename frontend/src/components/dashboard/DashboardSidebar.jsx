import React from "react";
import { LayoutGrid, Search, LogOut, Video } from "lucide-react";
import Button from "../ui/Button";

export default function DashboardSidebar({ activeTab, setActiveTab, setIsModalOpen, handleLogout, navigate }) {
  return (
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
          <button 
            onClick={() => setActiveTab("dashboard")} 
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "dashboard" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 inner-glow glow-cyan backdrop-blur-md" : "text-zinc-400 hover:bg-white/[0.03] hover:text-white border border-transparent"}`}
          >
            <LayoutGrid className="w-4 h-4" />
            Command Center
          </button>
          <button 
            onClick={() => setActiveTab("question_bank")} 
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "question_bank" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 inner-glow glow-cyan backdrop-blur-md" : "text-zinc-400 hover:bg-white/[0.03] hover:text-white border border-transparent"}`}
          >
            <Search className="w-4 h-4" />
            Question Bank
          </button>
        </div>
          <Button 
            variant="primary" 
            onClick={() => setIsModalOpen(true)} 
            className="w-full mt-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] border-0 hover:scale-[1.02] transition-all"
          >
            <Video className="w-4 h-4" />
            Host Interview
          </Button>
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
  );
}
