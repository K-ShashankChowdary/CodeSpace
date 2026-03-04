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
        className={`bg-[#0a0a0a] border border-[#2a2a2a] p-3 rounded-lg text-sm text-white 
          placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 
          focus:ring-blue-500 transition-all ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
