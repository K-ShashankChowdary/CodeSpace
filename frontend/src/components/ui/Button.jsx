import React from "react";

const variants = {
  primary:
    "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-900/20",
  secondary:
    "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700",
  danger:
    "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
  success:
    "bg-[#2db55d] hover:bg-[#26a150] text-white shadow-lg shadow-green-900/20",
  ghost:
    "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent",
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
      className={`rounded-lg font-bold uppercase tracking-widest transition-all active:scale-95 
        disabled:opacity-50 disabled:cursor-not-allowed 
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
