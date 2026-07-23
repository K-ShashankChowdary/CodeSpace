import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import { Play, Send, Loader2, Rocket } from "lucide-react";
import TerminalLoader from "../ui/TerminalLoader";
import { getFullStatus } from "../ui/StatusBadge";
import OutputDiffViewer from "./OutputDiffViewer";

const getStatusTheme = (status) => {
  switch (status) {
    case "AC":
      return {
        text: "text-green-500 drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]",
        dot: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
        box: "bg-green-500/10 text-green-300 border border-green-500/20 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]",
      };
    case "TLE":
      return {
        text: "text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]",
        dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]",
        box: "bg-orange-500/10 text-orange-300 border border-orange-500/20 shadow-[inset_0_0_20px_rgba(249,115,22,0.05)]",
      };
    case "CE":
      return {
        text: "text-yellow-500 drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]",
        dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]",
        box: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 shadow-[inset_0_0_20px_rgba(234,179,8,0.05)]",
      };
    case "MLE":
      return {
        text: "text-purple-500 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]",
        dot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]",
        box: "bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]",
      };
    case "RE":
    case "RE (SIGSEGV)":
    case "RE (SIGABRT)":
    case "RE (SIGFPE)":
      return {
        text: "text-pink-500 drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]",
        dot: "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]",
        box: "bg-pink-500/10 text-pink-300 border border-pink-500/20 shadow-[inset_0_0_20px_rgba(236,72,153,0.05)]",
      };
    case "WA":
    default:
      return {
        text: "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]",
        dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        box: "bg-red-500/10 text-red-300 border border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]",
      };
  }
};

const ConsolePanel = ({
  output,
  status,
  testCases,
  activeTestCase,
  setActiveTestCase,
  isRunning,
  isSubmitting,
  handleExecution,
}) => {
  const renderConsoleContent = () => {
    if (!output)
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm font-mono text-zinc-600 italic">
            Run code to see output...
          </p>
        </div>
      );

    if (output === "Processing...") {
      return (
        <div className="h-full w-full">
          <TerminalLoader />
        </div>
      );
    }

    let parsedResults = null;
    if (Array.isArray(output)) {
      parsedResults = output;
    } else if (typeof output === "string" && output.trim().startsWith("[")) {
      try {
        parsedResults = JSON.parse(output);
      } catch {
        // Ignore JSON parse errors
      }
    }

    if (parsedResults && Array.isArray(parsedResults) && parsedResults.length > 0) {
      let activeRes = parsedResults[activeTestCase] || parsedResults[0] || {};
      
      // Zero-Copy Re-hydration: We inject input/expected from the local testCases array
      // since the backend no longer sends them over WebSockets to save memory.
      if (testCases && testCases.length > 0) {
        const tc = testCases[activeTestCase] || testCases[0];
        if (tc) {
          activeRes = {
            ...activeRes,
            input: tc.input,
            expected: tc.output
          };
        }
      }

      const overallStatus = parsedResults.every((r) => r?.status === "AC")
        ? "AC"
        : parsedResults.find((r) => r?.status !== "AC")?.status || "WA";

      const overallTheme = getStatusTheme(overallStatus);
      const activeTheme = getStatusTheme(activeRes?.status);

      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col h-full"
        >
          <div className="mb-6 flex items-baseline justify-between border-b border-white/5 pb-4">
            <motion.h2
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`text-xl tracking-tight font-black uppercase ${overallTheme.text}`}
            >
              {getFullStatus(overallStatus)}
            </motion.h2>
            {overallStatus === "AC" && activeRes?.time !== undefined && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-bold text-zinc-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/5"
              >
                Runtime: <span className="text-emerald-400">{Math.max(...parsedResults.map((r) => r.time || 0))}ms</span>
              </motion.span>
            )}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-3 mb-6 flex-wrap pb-2"
          >
            {parsedResults.map((res, i) => {
              const theme = getStatusTheme(res?.status);
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTestCase(i)}
                  className={`relative px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap overflow-visible
                    ${
                      activeTestCase === i
                        ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20"
                        : "bg-transparent text-zinc-500 border border-white/5 hover:bg-white/5 hover:text-zinc-300"
                    }
                  `}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}
                  ></div>
                  Case {i + 1}
                </motion.button>
              );
            })}
          </motion.div>

          <div className="space-y-4">
            {[
              { label: "Input", value: activeRes?.input },
              { label: "Output", value: activeRes?.actual, isOutput: true, status: activeRes?.status },
              { label: "Expected", value: activeRes?.expected }
            ].map((section, idx) => (
              <motion.div 
                key={section.label + activeTestCase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (idx * 0.1) }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-3 rounded-full bg-indigo-500"></div>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {section.label}
                  </span>
                </div>
                <div
                  className={`rounded-xl px-5 py-4 font-mono text-sm whitespace-pre-wrap backdrop-blur-md transition-colors ${
                    section.isOutput
                      ? activeTheme.box
                      : "bg-white/[0.02] text-zinc-300 border border-white/[0.05] shadow-[inset_0_0_20px_rgba(255,255,255,0.01)]"
                  }`}
                >
                  {(() => {
                    if (!section.value && section.value !== "") return "N/A";
                    if (section.isOutput && section.status === "WA" && activeRes?.expected !== undefined) {
                      return <OutputDiffViewer actual={section.value} expected={activeRes.expected} />;
                    }
                    return section.value;
                  })()}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      );
    }

    const isError = ["CE", "TLE", "WA", "IE"].includes(status) || status?.startsWith("RE");
    let cleanedOutput = "Output formatting failed.";

    if (typeof output === "string") {
      cleanedOutput = output.replace(/[a-f0-9]{24}(_tc\d+)?\.cpp/g, "solution.cpp");
    } else if (typeof output === "object") {
      cleanedOutput = JSON.stringify(output, null, 2);
    }

    let outputColorClass = "text-zinc-300";
    if (status === "AC" || (typeof cleanedOutput === "string" && cleanedOutput.toLowerCase().includes("accepted"))) {
      outputColorClass = "text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]";
    } else if (isError || (typeof cleanedOutput === "string" && (cleanedOutput.toLowerCase().includes("wrong answer") || cleanedOutput.toLowerCase().includes("time limit exceeded") || cleanedOutput.toLowerCase().includes("error")))) {
      outputColorClass = "text-rose-400 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]";
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative p-6 rounded-2xl border text-sm leading-relaxed font-mono whitespace-pre-wrap overflow-hidden ${
          isError ? "bg-rose-500/5 border-rose-500/30" : "bg-white/[0.02] border-white/10"
        } ${outputColorClass}`}
      >
        {isError && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-500" />}
        {status === "CE" && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            <div className="text-xs font-black uppercase text-rose-400 tracking-widest">Compilation Error</div>
          </div>
        )}
        {status?.startsWith("RE") && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            <div className="text-xs font-black uppercase text-rose-400 tracking-widest">Runtime Error</div>
          </div>
        )}
        {cleanedOutput}
      </motion.div>
    );
  };

  return (
    <div className="w-full h-full glass-card rounded-2xl flex flex-col border border-white/[0.05] shadow-2xl overflow-hidden shrink-0">
      <div className="bg-black/40 backdrop-blur-md px-6 py-4 border-b border-white/[0.05] shrink-0">
        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest glow-purple drop-shadow-md">
          Console Output
        </span>
      </div>
      <div className="flex-1 p-6 bg-black/20 overflow-y-auto custom-scrollbar">
        {renderConsoleContent()}
      </div>
      <div className="bg-black/40 backdrop-blur-md px-6 py-3 border-t border-white/[0.05] flex justify-end items-center gap-3 shrink-0">
        <Button
          variant="primary"
          size="lg"
          onClick={() => handleExecution("run")}
          disabled={isRunning || isSubmitting}
          className="relative overflow-hidden group w-[140px] flex justify-center shadow-lg"
        >
          <AnimatePresence mode="wait">
            {isRunning ? (
              <motion.div
                key="running"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 text-zinc-300"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running</span>
              </motion.div>
            ) : (
              <motion.div
                key="run"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Run</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {isRunning && (
            <motion.div 
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
              animate={{ translateX: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          )}
        </Button>
        
        <Button
          variant="success"
          size="lg"
          onClick={() => handleExecution("submit")}
          disabled={isRunning || isSubmitting}
          className={`relative overflow-hidden w-[140px] flex justify-center shadow-lg ${isSubmitting ? 'border-emerald-400' : ''}`}
        >
          <AnimatePresence mode="wait">
            {isSubmitting ? (
              <motion.div
                key="submitting"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center justify-center gap-2 relative w-full h-full"
              >
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ x: [-100, 100], y: [20, -20] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                  <Rocket className="w-6 h-6 text-white/50 opacity-50" />
                </motion.div>
                <span className="relative z-10 text-white font-bold tracking-widest drop-shadow-md">
                  Submitting
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="submit"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit</span>
              </motion.div>
            )}
          </AnimatePresence>

          {isSubmitting && (
            <motion.div 
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              animate={{ translateX: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ConsolePanel;
