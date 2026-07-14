import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const variants = {
  primary:
    "bg-gradient-to-br from-cyan-400 to-blue-600 border-[6px] border-solid border-t-cyan-200 border-l-cyan-400 border-r-blue-700 border-b-blue-900 text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] hover:brightness-110 hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.9)] active:brightness-90 active:scale-95 shadow-[inset_0_2px_15px_rgba(255,255,255,0.4)]",
  secondary:
    "bg-gradient-to-br from-zinc-500 to-zinc-700 border-[6px] border-solid border-t-zinc-300 border-l-zinc-400 border-r-zinc-800 border-b-zinc-900 text-zinc-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] hover:brightness-110 hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:text-white active:brightness-90 active:scale-95 shadow-[inset_0_2px_15px_rgba(255,255,255,0.2)]",
  danger:
    "bg-gradient-to-br from-rose-400 to-red-600 border-[6px] border-solid border-t-rose-200 border-l-rose-400 border-r-red-700 border-b-red-900 text-white drop-shadow-[0_0_12px_rgba(244,63,94,0.6)] hover:brightness-110 hover:drop-shadow-[0_0_20px_rgba(244,63,94,0.9)] active:brightness-90 active:scale-95 shadow-[inset_0_2px_15px_rgba(255,255,255,0.4)]",
  success:
    "bg-gradient-to-br from-emerald-400 to-green-600 border-[6px] border-solid border-t-emerald-200 border-l-emerald-400 border-r-green-700 border-b-green-900 text-white drop-shadow-[0_0_12px_rgba(52,211,153,0.6)] hover:brightness-110 hover:drop-shadow-[0_0_20px_rgba(52,211,153,0.9)] active:brightness-90 active:scale-95 shadow-[inset_0_2px_15px_rgba(255,255,255,0.4)]",
  ghost:
    "bg-transparent border-[6px] border-solid border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.05] drop-shadow-none hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] active:brightness-90 active:scale-95",
  google:
    "bg-gradient-to-br from-white to-gray-200 border-[6px] border-solid border-t-white border-l-gray-100 border-r-gray-300 border-b-gray-400 text-gray-800 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] hover:brightness-105 active:brightness-95 active:scale-95 shadow-[inset_0_2px_15px_rgba(0,0,0,0.05)]",
  github:
    "bg-gradient-to-br from-[#24292F] to-[#1F2328] border-[6px] border-solid border-t-[#3b4148] border-l-[#30353c] border-r-[#15181b] border-b-[#0b0c0e] text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.4)] hover:brightness-110 active:brightness-90 active:scale-95 shadow-[inset_0_2px_15px_rgba(255,255,255,0.05)]",
};

const sizes = {
  sm: "px-2 py-0 text-[10px]",
  md: "px-3 py-0.5 text-xs",
  lg: "px-4 py-1.5 text-xs",
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
      className={`shape-gem font-black uppercase tracking-widest transition-colors
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
