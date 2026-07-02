import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const CountdownButton = ({ onComplete, duration = 3, children }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const isReady = timeLeft <= 0;

  return (
    <motion.button
      whileHover={isReady ? {} : {}}
      whileTap={isReady ? {} : {}}
      onClick={() => isReady && onComplete()}
      disabled={!isReady}
      className={`shape-gem relative overflow-hidden px-4 py-1.5 font-black uppercase tracking-widest text-xs transition-all duration-300
        ${isReady 
          ? 'bg-gradient-to-b from-red-500 to-red-700 border-[6px] border-solid border-t-white/40 border-l-white/20 border-r-black/20 border-b-black/40 text-white drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] hover:brightness-125 hover:drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] active:brightness-90 active:scale-95 shadow-[inset_0_2px_10px_rgba(255,255,255,0.4)]' 
          : 'bg-gradient-to-b from-zinc-700 to-zinc-900 border-[6px] border-solid border-t-white/10 border-l-white/5 border-r-black/30 border-b-black/60 text-zinc-500 cursor-not-allowed drop-shadow-none shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]'
        }
      `}
    >
      {/* Background fill transition */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isReady ? '0%' : '-100%' }}
        transition={{ duration: duration, ease: "linear" }}
        className="absolute inset-0 bg-zinc-700/50"
      />
      
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isReady ? children : `${children} (${timeLeft}s)`}
      </span>
    </motion.button>
  );
};

export default CountdownButton;
