import React from "react";
import { LogOut } from "lucide-react";
import Button from "./ui/Button";
import ProblemDropdown from "./ui/ProblemDropdown";
import { getFullStatus } from "./ui/StatusBadge";

const IDEHeader = ({
  navigate,
  isInterviewer,
  room,
  activeProblemId,
  activeRoomCode,
  problem,
  status,
  onChangeProblem,
  onEndInterview,
  onExitInterview,
  onLogout,
  onCopyLink,
}) => {
  return (
    <header className="h-16 flex justify-between items-center glass-panel border-b border-white/[0.05] px-8 shrink-0 z-30">
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Dashboard
          </span>
        </button>
        <div className="h-4 w-px bg-zinc-800"></div>
        <div className="flex flex-col justify-center">
          {isInterviewer && room?.problems?.length > 1 ? (
            <ProblemDropdown
              problems={room.problems}
              activeProblemId={activeProblemId}
              onChange={onChangeProblem}
            />
          ) : (
            <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-3 truncate max-w-[200px]">
              {problem?.title || "Problem"}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                problem?.difficulty === "Easy"
                  ? "text-green-400 border-green-500/20 bg-green-500/10"
                  : problem?.difficulty === "Medium"
                    ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10"
                    : "text-red-400 border-red-500/20 bg-red-500/10"
              }`}
            >
              {problem?.difficulty || "Standard"}
            </span>
            {activeRoomCode && (
              <span className="bg-blue-500/10 text-blue-400 text-[8px] px-1.5 py-0.5 rounded-md border border-blue-500/20 uppercase tracking-widest font-black">
                Session: {activeRoomCode}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/60 shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Status
          </span>
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded border ${
              status === "AC"
                ? "bg-green-500/10 border-green-500/20 !text-green-500"
                : status === "Idle"
                  ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                  : ["CE", "RE", "TLE", "WA"].includes(status)
                    ? "bg-red-500/10 border-red-500/20 !text-red-500"
                    : "bg-blue-500/10 border-blue-500/20 !text-blue-500"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                status === "AC"
                  ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"
                  : status === "Idle"
                    ? "bg-zinc-500"
                    : ["CE", "RE", "TLE", "WA"].includes(status)
                      ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                      : "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)] animate-pulse"
              }`}
            ></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {getFullStatus(status)}
            </span>
          </div>
        </div>

        {activeRoomCode && isInterviewer && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onCopyLink}
              className="hidden md:flex gap-2 items-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy Link
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onEndInterview}
            >
              End Interview
            </Button>
          </>
        )}
        {activeRoomCode && !isInterviewer && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExitInterview}
          >
            Exit Interview
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500/50 transition-all duration-300 group/logout gap-2 flex items-center px-4 rounded-xl backdrop-blur-md h-10 shadow-[0_8px_32px_rgba(239,68,68,0.1)]"
        >
          <LogOut className="w-3.5 h-3.5 group-hover/logout:-translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Logout
          </span>
        </Button>
      </div>
    </header>
  );
};

export default IDEHeader;
