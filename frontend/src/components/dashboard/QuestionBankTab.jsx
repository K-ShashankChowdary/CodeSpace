import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import ProblemRow from "./ProblemRow";

export default function QuestionBankTab({ isLoading, error, mainFilteredProblems, customFilteredProblems, builtInFilteredProblems, navigate }) {
  return (
    <div className="w-full glass-card rounded-3xl overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/[0.05] bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500 backdrop-blur-md">
        <div className="col-span-12 sm:col-span-6 pl-6">Title</div>
        <div className="col-span-3 hidden sm:block text-center">Difficulty</div>
        <div className="col-span-3 hidden sm:block"></div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-white/[0.02]">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: i * 0.05 }} 
              key={i} 
              className="relative grid grid-cols-12 gap-4 p-6 items-center"
            >
              <div className="col-span-12 sm:col-span-6 pl-4">
                <div className="h-5 w-3/4 bg-white/5 rounded-md animate-pulse"></div>
                <div className="mt-2 sm:hidden h-3 w-1/3 bg-white/5 rounded-md animate-pulse"></div>
              </div>
              <div className="col-span-3 hidden sm:flex items-center justify-center">
                <div className="h-6 w-16 bg-white/5 rounded-full animate-pulse"></div>
              </div>
              <div className="col-span-3 hidden sm:flex items-center justify-end pr-6">
                <div className="h-8 w-24 bg-white/5 rounded-full animate-pulse"></div>
              </div>
            </motion.div>
          ))
        ) : mainFilteredProblems.length === 0 && !error ? (
            <div className="py-20 text-center">
            <div className="text-4xl mb-4 opacity-50">📁</div>
            <h3 className="text-lg font-bold text-zinc-300">No problems found</h3>
            <p className="text-zinc-500 text-sm mt-2">Adjust your search filter or check database connectivity.</p>
          </div>
        ) : (
          <>
            {customFilteredProblems.length > 0 && (
                <>
                  <div className="p-4 bg-white/[0.02] text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-white/[0.05]">Saved Custom Problems</div>
                  {customFilteredProblems.map((problem, i) => (
                      <ProblemRow key={problem._id} problem={problem} i={i} navigate={navigate} />
                  ))}
                </>
            )}
            {builtInFilteredProblems.length > 0 && (
                <>
                  <div className={`p-4 bg-white/[0.02] text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-white/[0.05] ${customFilteredProblems.length > 0 ? "border-t border-t-white/[0.05]" : ""}`}>Platform Question Bank</div>
                  {builtInFilteredProblems.map((problem, i) => (
                      <ProblemRow key={problem._id} problem={problem} i={i} navigate={navigate} />
                  ))}
                </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
