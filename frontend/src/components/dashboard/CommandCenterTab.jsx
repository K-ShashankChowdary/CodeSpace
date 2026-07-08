import React from "react";
import { Play, Trash2, User, History, ArrowRight, Users } from "lucide-react";
import Button from "../ui/Button";

export default function CommandCenterTab({ recentSessions, isLoading, setIsModalOpen, navigate, onDeleteSession, currentUser }) {
  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Personalized Greeting & Stats */}
      {!isLoading && currentUser && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
          <h1 className="text-3xl font-black text-white tracking-tighter">
            Welcome back, <span className="text-cyan-400">{currentUser.fullName || currentUser.username}</span> 👋
          </h1>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden glass-card border border-white/[0.05] p-12 flex items-center justify-between group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 group-hover:opacity-100 opacity-50 transition-opacity duration-500" />
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter mb-4 drop-shadow-xl">Start a New Interview</h2>
          <p className="text-zinc-400 max-w-md">Instantly launch a collaborative coding session, select your problems, and share the invite link with your candidate.</p>
        </div>
        <div className="relative z-10">
          <Button 
            variant="primary" 
            onClick={() => setIsModalOpen(true)}
            className="h-16 px-10 rounded-2xl text-lg font-black bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transform hover:scale-105 flex items-center"
          >
            Start Interview
            <Play className="ml-3 w-5 h-5 fill-black" />
          </Button>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h3 className="text-xl font-black text-white tracking-tighter mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-cyan-500 rounded-full glow-cyan" />
          Recent Sessions
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
               <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center border border-white/[0.05] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
            <div className="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center mb-8 border border-cyan-500/20 group-hover:scale-110 transition-transform duration-500">
              <Users className="w-12 h-12 text-cyan-400" />
            </div>
            <h4 className="text-3xl font-black text-white tracking-tighter drop-shadow-md mb-3">Your Journey Starts Here</h4>
            <p className="text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
              You haven't hosted any interviews yet. Create a room, choose questions from the bank, and invite your candidate to experience real-time collaborative coding!
            </p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)} className="px-8 py-3 rounded-xl flex items-center gap-2 font-bold group/btn">
              Host First Interview <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentSessions.map(session => (
              <div key={session._id} className="glass-card rounded-3xl p-6 border border-white/[0.05] hover:border-cyan-500/40 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between h-56 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(6,182,212,0.15)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-all duration-500 ease-out" />
                
                {/* Candidate Name (Prominent) */}
                <div className="relative z-10 mb-4">
                   <div className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-1 flex items-center gap-2">
                     <User className="w-3 h-3" />
                     Candidate
                   </div>
                   <h4 className="text-2xl font-black text-white truncate drop-shadow-md group-hover:text-cyan-50 transition-colors">
                     {session.candidate?.name || "Waiting for candidate..."}
                   </h4>
                </div>

                <div className="relative z-10 flex-1">
                  <div className="text-xs text-zinc-400 font-medium truncate mb-2">
                     {session.problemIds?.length > 0 ? session.problemIds.map(p => p.title).join(" • ") : "No problems assigned"}
                  </div>
                  <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-wider">
                     {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {/* Footer: Status, Rejoin, Delete */}
                <div className="mt-4 pt-4 border-t border-white/[0.05] relative z-10 flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                     <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border ${session.status === "active" ? "bg-green-500/10 border-green-500/20 text-green-400" : session.status === "waiting" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                        {session.status !== "ended" && (
                          <span className={`w-1.5 h-1.5 rounded-full ${session.status === "active" ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
                        )}
                        {session.status}
                     </span>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    {session.status !== "ended" && (
                      <Button variant="ghost" className="h-8 px-4 text-xs font-bold bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-white transition-all rounded-lg" onClick={() => navigate(`/join/${session.sessionCode}`)}>
                        Rejoin
                      </Button>
                    )}
                    <button 
                      onClick={() => onDeleteSession(session.sessionCode)}
                      className="text-zinc-500 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/20 p-2 rounded-lg group/delete relative"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
