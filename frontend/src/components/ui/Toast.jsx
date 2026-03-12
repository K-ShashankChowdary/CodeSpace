import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const Toast = ({ message, type = "info", onClose, duration = 4000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const colors = {
    success: "bg-green-500/10 border-green-500/20 text-green-200",
    error: "bg-red-500/10 border-red-500/20 text-red-200",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-200",
  };

  return (
    <div 
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out 
      ${isExiting ? "opacity-0 -translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"}`}
    >
      <div className={`px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-4 min-w-[320px] ${colors[type]}`}>
        <div className="shrink-0">{icons[type]}</div>
        <p className="flex-1 text-sm font-bold tracking-tight">{message}</p>
        <button 
          onClick={handleClose}
          className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 opacity-50 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
