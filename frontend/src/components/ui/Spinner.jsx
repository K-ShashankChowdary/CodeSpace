import React from "react";

const sizes = {
  sm: "w-6 h-6 border-2",
  md: "w-8 h-8 border-2",
};

const Spinner = ({ size = "sm", label }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`border-zinc-600 border-t-transparent rounded-full animate-spin ${sizes[size] || sizes.sm}`}
      />
      {label && (
        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">
          {label}
        </p>
      )}
    </div>
  );
};

export default Spinner;
