import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { CheckCircle, Code2, Sparkles } from "lucide-react";

export default function InterviewEnded() {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const isInterviewer = role === "interviewer";
  const isCandidateExit = role === "candidate-exit";

  useEffect(() => {
    if (countdown === 0) {
      navigate("/");
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className="h-screen w-screen bg-[#030303] flex flex-col items-center justify-center font-sans text-zinc-200 relative overflow-hidden">
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute inset-0 animated-mesh-bg opacity-40 mix-blend-screen z-0 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl px-6 text-center"
      >
        {/* Animated Icon Container */}
        <div className="relative w-36 h-36 mx-auto mb-10 flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-emerald-500/20 rounded-full" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full opacity-10 blur-2xl" />
          
          <div className="relative glass-panel bg-zinc-900/60 backdrop-blur-xl border border-emerald-500/30 p-8 rounded-3xl shadow-[0_20px_60px_rgba(52,211,153,0.15)] flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-emerald-400" strokeWidth={2} />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -top-3 -right-3"
            >
              <Sparkles className="w-7 h-7 text-yellow-400 drop-shadow-md" />
            </motion.div>
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4 drop-shadow-sm">
          Interview <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500">Ended</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed font-medium px-4">
          {isInterviewer 
            ? "You have successfully closed the interview session. Navigating to dashboard..."
            : isCandidateExit
              ? "You have successfully exited the interview. We hope you crushed it!"
              : "The interviewer has successfully closed the session. We hope you crushed it!"}
        </p>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <button
            onClick={() => navigate("/")}
            disabled={countdown > 0}
            className={`flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all duration-500 w-full sm:w-auto relative overflow-hidden shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] active:translate-y-[2px]
              ${countdown === 0 
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-black border border-emerald-400/50 border-b-[3px] border-b-emerald-700' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed border-b-[3px] border-b-black'
              }
            `}
          >
            {/* Background fill transition */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: countdown === 0 ? '0%' : '-100%' }}
              transition={{ duration: 5, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-cyan-500/20"
            />

            <span className="relative z-10 flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              {countdown === 0 ? "Return to Dashboard" : `Return to Dashboard (${countdown}s)`}
            </span>
          </button>
        </div>
      </motion.div>
      
      {/* Footer minimal branding */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-40">
        <div className="flex items-center gap-2">
          <img src="/fevicon.svg" alt="CodeSpace" className="w-5 h-5 grayscale" />
          <span className="text-sm font-bold tracking-tight text-white">CodeSpace</span>
        </div>
      </div>
    </div>
  );
}
