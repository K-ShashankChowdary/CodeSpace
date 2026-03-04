import React from "react";

const STATUS_MAP = {
  AC: { label: "Accepted", color: "text-green-500" },
  WA: { label: "Wrong Answer", color: "text-red-500" },
  TLE: { label: "Time Limit Exceeded", color: "text-yellow-500" },
  RE: { label: "Runtime Error", color: "text-red-500" },
  CE: { label: "Compilation Error", color: "text-red-500" },
  MLE: { label: "Memory Limit Exceeded", color: "text-orange-500" },
  IE: { label: "Internal Error", color: "text-red-500" },
  Idle: { label: "Idle", color: "text-zinc-500" },
  Queued: { label: "Queued", color: "text-yellow-500" },
  Executing: { label: "Executing", color: "text-yellow-500" },
  Pending: { label: "Pending", color: "text-yellow-500" },
  Error: { label: "Error", color: "text-red-500" },
};

/**
 * Converts a short status code (AC, WA, TLE, etc.) to its full human-readable label.
 */
export const getFullStatus = (statusCode) => {
  return STATUS_MAP[statusCode]?.label || statusCode;
};

/**
 * Returns the Tailwind text color class for a given status code.
 */
export const getStatusColor = (statusCode) => {
  return STATUS_MAP[statusCode]?.color || "text-zinc-400";
};

/**
 * A badge component that displays a verdict with appropriate color coding.
 */
const StatusBadge = ({ status, className = "" }) => {
  const config = STATUS_MAP[status] || { label: status, color: "text-zinc-400" };

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-widest ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
