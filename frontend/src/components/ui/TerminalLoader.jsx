import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const sequence = [
  "> Initiating connection to execution engine...",
  "> Handshake successful. Secure channel established.",
  "> Uploading source code payload to backend server...",
  "> Spawning isolated sandboxed container...",
  "> Allocating CPU and memory limits...",
  "> Compiling source code...",
  "> Executing test cases...",
  "> Awaiting execution results...",
  "> Fetching verdicts...",
  "> Processing output stream..."
];

const TerminalLoader = ({ onComplete }) => {
  const [lines, setLines] = useState([]);
  
  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < sequence.length) {
        setLines(prev => [...prev, sequence[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 350);
    
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] p-5 rounded-xl font-mono text-xs overflow-hidden border border-white/5 relative shadow-inner">
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
        <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
        <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(251,191,36,0.4)]"></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
        <span className="ml-3 text-zinc-500 text-[10px] uppercase tracking-widest font-black">Execution Terminal</span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pt-1">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3"
          >
            <span className="text-zinc-600 shrink-0 select-none">
              {new Date().toISOString().split('T')[1].slice(0, 8)}
            </span>
            <span className={i === sequence.length - 1 ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse" : "text-emerald-400/90 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]"}>
              {line}
            </span>
          </motion.div>
        ))}
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="w-2 h-3.5 bg-emerald-400 mt-1 ml-1 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
        />
      </div>
    </div>
  );
};

export default TerminalLoader;
