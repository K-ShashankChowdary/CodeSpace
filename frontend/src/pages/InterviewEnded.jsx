import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
    <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center font-sans text-zinc-200 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[45%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6 text-center">
        {/* Animated Icon Container */}
        <div className="relative w-32 h-32 mx-auto mb-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full opacity-10 blur-xl" />
          <div className="relative bg-[#0d0d0d] border border-green-500/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.15)] flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-400" strokeWidth={2.5} />
            <Sparkles className="absolute -top-3 -right-3 w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Interview <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Ended</span>
        </h1>
        
        <p className="text-lg text-zinc-400 mb-10 leading-relaxed font-medium">
          {isInterviewer 
            ? "You have successfully closed the interview session. Navigating to dashboard..."
            : isCandidateExit
              ? "You have successfully exited the interview. We hope you crushed it!"
              : "The interviewer has successfully closed the session. We hope you crushed it!"}
        </p>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-95 w-full sm:w-auto shadow-[0_0_20px_rgba(255,255,255,0.1)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/5" style={{ width: `${(countdown / 5) * 100}%`, transition: 'width 1s linear' }} />
            <Code2 className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Return to Home ({countdown}s)</span>
          </Link>
        </div>
      </div>
      
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
