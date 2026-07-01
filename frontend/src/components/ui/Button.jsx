import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const variants = {
  primary:
    "bg-gradient-to-b from-cyan-500 to-cyan-600 text-white border-t border-x border-cyan-400/30 border-b-[4px] border-b-cyan-800 shadow-[0_5px_15px_rgba(6,182,212,0.3),inset_0_2px_2px_rgba(255,255,255,0.2)] hover:shadow-[0_5px_25px_rgba(6,182,212,0.5),inset_0_2px_2px_rgba(255,255,255,0.2)] hover:brightness-110",
  secondary:
    "bg-zinc-800 text-zinc-200 border-t border-x border-zinc-600 border-b-[4px] border-b-zinc-700 shadow-[0_5px_15px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-zinc-700 hover:text-white hover:border-zinc-500 hover:border-b-zinc-600",
  danger:
    "bg-red-950/60 text-red-400 border-t border-x border-red-800 border-b-[4px] border-b-red-950 shadow-[0_5px_15px_rgba(239,68,68,0.2),inset_0_2px_2px_rgba(255,255,255,0.05)] hover:bg-red-900/60 hover:text-red-300",
  success:
    "bg-emerald-600 text-white border-t border-x border-emerald-500 border-b-[4px] border-b-emerald-800 shadow-[0_5px_15px_rgba(16,185,129,0.3),inset_0_2px_2px_rgba(255,255,255,0.2)] hover:bg-emerald-500 hover:border-emerald-400 hover:border-b-emerald-700",
  ghost:
    "bg-transparent text-zinc-500 hover:text-white hover:bg-white/[0.05] border border-transparent",
};

const sizes = {
  sm: "px-3 py-1.5 text-[10px]",
  md: "px-5 py-2 text-xs",
  lg: "px-6 py-2.5 text-xs",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  className = "",
  ...props
}) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      className={`rounded-xl font-black uppercase tracking-widest transition-colors
        disabled:opacity-90 disabled:cursor-not-allowed
        ${variants[variant] || variants.primary} 
        ${sizes[size] || sizes.md} 
        ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
