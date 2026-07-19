import React from "react";
import { diffChars } from "diff";

const OutputDiffViewer = ({ actual, expected }) => {
  if (actual === undefined || actual === null) return "N/A";
  if (expected === undefined || expected === null) return actual;

  const diffChunks = diffChars(String(expected), String(actual));
  
  return (
    <span>
      {diffChunks.map((part, index) => {
        if (part.added) {
          return (
            <span key={index} className="text-rose-400 bg-rose-500/20 px-[1px] rounded-sm font-bold">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="text-emerald-400 bg-emerald-500/20 px-[1px] rounded-sm font-bold opacity-70">
              {part.value}
            </span>
          );
        }
        return <span key={index} className="text-inherit">{part.value}</span>;
      })}
    </span>
  );
};

export default OutputDiffViewer;
