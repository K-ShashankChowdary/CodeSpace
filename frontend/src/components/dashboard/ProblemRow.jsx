import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

export default function ProblemRow({ problem, i, navigate }) {
  return (
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
  );
}
