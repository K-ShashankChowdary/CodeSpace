import React from "react";

const variants = {
  primary:
    "bg-linear-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_20px_rgba(59,130,246,0.15)] inner-glow border border-blue-400/20",
  secondary:
    "bg-linear-to-b from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-zinc-200 border border-zinc-700/50 inner-glow shadow-sm",
  danger:
    "bg-red-500/5 text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30",
  success:
    "bg-linear-to-b from-[#2db55d] to-[#26a150] hover:from-[#32c968] hover:to-[#2db55d] text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_20px_rgba(34,197,94,0.15)] inner-glow border border-white/10",
  ghost:
    "bg-transparent text-zinc-500 hover:text-white hover:bg-zinc-800/50 border border-transparent",
};

const sizes = {
  sm: "px-3 py-1.5 text-[10px]",
  md: "px-6 py-2 text-[10px]",
  lg: "px-8 py-3 text-sm",
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98] 
        disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
        ${variants[variant] || variants.primary} 
        ${sizes[size] || sizes.md} 
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
