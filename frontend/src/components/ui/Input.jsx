import React from "react";

const Input = ({
  label,
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  required = false,
  className = "",
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={name}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input
        id={name}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`bg-[#0d0d0d] border border-zinc-800/60 px-4 py-3 rounded-xl text-sm text-white 
          placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 
          focus:ring-blue-500/20 inner-glow transition-all duration-300 ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
