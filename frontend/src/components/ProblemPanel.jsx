import React from "react";
import { motion } from "framer-motion";
import StatusBadge from "./ui/StatusBadge";

const ProblemPanel = ({
  problem,
  activeTab,
  setActiveTab,
  history,
  handleRestoreCode,
}) => {
  return (
    <div className="w-5/12 glass-card rounded-2xl flex flex-col border border-white/[0.05] shadow-2xl overflow-hidden min-h-0">
      <div className="flex bg-black/40 backdrop-blur-md border-b border-white/[0.05] shrink-0 relative">
        {["description", "submissions"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-all ${activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {tab === "description" ? "Description" : "Submissions"}
            {activeTab === tab && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {activeTab === "description" ? (
          <div className="animate-in fade-in duration-300">
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap mb-10">
              {problem?.description || "No description available."}
            </p>
            <div className="space-y-10">
              <section>
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">
                  Constraints
                </h3>
                <div className="flex gap-4">
                  <div className="bg-[#050505] px-4 py-2 rounded-lg border border-zinc-800 text-xs font-mono font-bold text-zinc-400">
                    Time Limit: {problem?.timeLimit || "N/A"} ms
                  </div>
                  <div className="bg-[#050505] px-4 py-2 rounded-lg border border-zinc-800 text-xs font-mono font-bold text-zinc-400">
                    Memory Limit: {problem?.memoryLimit || "N/A"} MB
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">
                  Examples
                </h3>
                {(problem?.testCases || []).slice(0, 2).map((tc, index) => (
                  <div key={index} className="mb-6 last:mb-0">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-3">
                      Case {index + 1}
                    </span>
                    <div className="bg-[#050505] border border-zinc-800 rounded-xl p-5 font-mono text-sm text-zinc-300 leading-relaxed shadow-inner">
                      <span className="text-zinc-600 font-bold mr-4 select-none">
                        Input:
                      </span>{" "}
                      {tc?.input || ""} <br />
                      <span className="text-zinc-600 font-bold mr-4 select-none">
                        Output:
                      </span>{" "}
                      {tc?.output || ""}
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            {!Array.isArray(history) || history.length === 0 ? (
              <p className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-10">
                No history
              </p>
            ) : (
              history.map((sub, i) => (
                <div
                  key={i}
                  onClick={() => handleRestoreCode(sub.code)}
                  className="bg-[#111] border border-zinc-800 p-4 rounded-xl flex justify-between items-center hover:border-zinc-500 transition-colors cursor-pointer group"
                >
                  <div>
                    <StatusBadge status={sub.status} />
                    <p className="text-[10px] text-zinc-500 font-mono mt-1 group-hover:text-zinc-300 transition-colors">
                      {new Date(sub.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-zinc-400 bg-black px-3 py-1 rounded-lg border border-zinc-800">
                      {sub.timeTaken}ms
                    </span>
                    <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold tracking-widest">
                      Restore
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemPanel;
