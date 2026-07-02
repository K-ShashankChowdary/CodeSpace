import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor";
import ProblemDropdown from "../components/ui/ProblemDropdown";
import CountdownButton from "../components/ui/CountdownButton";
import MultiplayerCursors from "../components/MultiplayerCursors";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge, { getFullStatus } from "../components/ui/StatusBadge";
import { LogOut, Play, Send, Loader2, Rocket } from "lucide-react";
import Toast from "../components/ui/Toast";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

import { socket } from "../utils/socket";

const TerminalLoader = () => {
  const [lines, setLines] = useState([]);
  
  const sequence = [
    "> Initiating connection to execution engine...",
    "> Handshake successful. Secure channel established.",
    "> Uploading source code payload to backend server...",
    "> Spawning isolated sandboxed container...",
    "> Allocating CPU and memory limits...",
    "> Compiling source code...",
    "> Executing test cases...",
    "> Awaiting execution results...",
    "> Fetching verdicts...",
    "> Processing output stream..."
  ];
  
  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < sequence.length) {
        setLines(prev => [...prev, sequence[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 350);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] p-5 rounded-xl font-mono text-xs overflow-hidden border border-white/5 relative shadow-inner">
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
        <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
        <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(251,191,36,0.4)]"></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
        <span className="ml-3 text-zinc-500 text-[10px] uppercase tracking-widest font-black">Execution Terminal</span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pt-1">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3"
          >
            <span className="text-zinc-600 shrink-0 select-none">
              {new Date().toISOString().split('T')[1].slice(0, 8)}
            </span>
            <span className={i === sequence.length - 1 ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse" : "text-emerald-400/90 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]"}>
              {line}
            </span>
          </motion.div>
        ))}
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="w-2 h-3.5 bg-emerald-400 mt-1 ml-1 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
        />
      </div>
    </div>
  );
};

function IDE() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room");
  const sessionCode = searchParams.get("session"); // guest join param
  // Use whichever context param is present (session takes priority for guests)
  const activeRoomCode = sessionCode || roomCode;
  const navigate = useNavigate();

  // Classroom State
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isInterviewer, setIsInterviewer] = useState(false);

  // Problem & IDE State
  const [problem, setProblem] = useState(null);
  const [isFetchingProblem, setIsFetchingProblem] = useState(true);
  const [activeTab, setActiveTab] = useState("description");
  const activeTabRef = useRef(activeTab);
  const [history, setHistory] = useState([]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  // Instead of relying on React state for the code (which causes lag/cursor jumps with Yjs),
  // we store a reference to the Monaco editor directly.
  const monacoEditorRef = useRef(null);

  const [code, setCode] = useState(
    `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n \n \treturn 0;\n}`,
  );

  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification State
  const [toast, setToast] = useState(null);
  const lastExecutionTypeRef = useRef(null);
  const lastExecutionTimeRef = useRef(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  // --- EFFECT 1: DATA FETCHING & CONNECTION ---
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    const fetchWorkspaceData = async () => {
      try {
        let user;
        const guestToken = localStorage.getItem("guestToken");

        if (guestToken) {
          // Guest user — decode name from JWT payload (no DB call needed)
          try {
            const payload = JSON.parse(atob(guestToken.split(".")[1]));
            user = {
              _id: null,
              username: payload.name,
              isGuest: true,
            };
          } catch {
            localStorage.removeItem("guestToken");
            navigate("/auth");
            return;
          }
        } else {
          const userRes = await api.get("/users/current-user");
          user = userRes.data.data;
        }
        setCurrentUser(user);

        const probRes = await api.get(`/problems/${id}`);
        const problemData = probRes.data.data || null;
        setProblem(problemData);

        // Safely restore the user's previously written code for this specific problem
        // if they had navigated away, or fallback to the problem's boilerplate.
        const savedCode = sessionStorage.getItem(`session-${activeRoomCode}-problem-${id}`);
        if (savedCode) {
          setCode(savedCode);
        } else if (problemData?.boilerplate) {
          setCode(problemData.boilerplate["C++ 17"]);
        }

        if (activeRoomCode) {
          let roomData;
          if (sessionCode) {
            const sessRes = await api.get(`/sessions/details/${activeRoomCode}`);
            const sess = sessRes.data.data;
            roomData = {
              ...sess,
              roomCode: sess.sessionCode,
              interviewer: sess.interviewer,
              problems: sess.problemIds || [],
              participants: [],
            };
          } else {
            const roomRes = await api.get(`/rooms/details/${activeRoomCode}`);
            roomData = roomRes.data.data;
          }
          setRoom(roomData);

          const interviewerId = roomData.interviewer?._id?.toString() || roomData.interviewer?.toString();
          const currentUserId = user._id?.toString();
          const userIsInterviewer = !user.isGuest && interviewerId === currentUserId;
          setIsInterviewer(userIsInterviewer);

          const emitJoinRoom = () => {
            if (!socket.connected) {
              socket.connect();
            }
            socket.emit("join-room", {
              roomCode: activeRoomCode,
              username: user.username,
              userId: user._id,
              isInterviewer: userIsInterviewer,
            });
          };

          socket.on("connect", emitJoinRoom);
          if (socket.connected) emitJoinRoom();
        }
      } catch (error) {
        console.error("Workspace Load Error:", error);
        navigate("/");
      } finally {
        setIsFetchingProblem(false);
      }
    };

    fetchWorkspaceData();

    return () => {
      socket.off("connect");
    };
  }, [id, activeRoomCode, navigate, sessionCode]);

  // --- EFFECT 2: INTERVIEWER-ONLY NOTIFICATIONS (TOASTS) ---
  useEffect(() => {
    // 🚨 Exit if not in a room, or if the user is a candidate.
    // This ensures ONLY the interviewer sees the toasts.
    if (!activeRoomCode || !isInterviewer) return;

    const handleCandidateJoined = (candidate) => {
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.participants.some((p) => p._id === candidate._id)) return prev;
        
        showToast(`Candidate joined: ${candidate.username}`, "info");
        return { ...prev, participants: [...prev.participants, candidate] };
      });
    };

    const handleCandidateLeft = (candidate) => {
      showToast(`Candidate left: ${candidate.username}`, "error");
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.filter(
                (p) => p._id !== candidate._id,
              ),
            }
          : null,
      );
    };

    const handleSyncLeaderboard = (allProgress) => {
      const loadedStatuses = {};
      allProgress.forEach((p) => {
        // Only load the statuses for the SPECIFIC problem the interviewer is currently viewing
        if (p.username && p.results[id]) {
          loadedStatuses[p.username] = p.results[id];
        }
      });
    };

    const handleLeaderboardUpdate = (data) => {
      // Filter out noisy statuses so the interviewer only sees final results
      if (
        data.status !== "Queued" &&
        data.status !== "Executing" &&
        data.status !== "Idle"
      ) {
        if (data.status === "AC") {
          showToast(`🔥 ${data.username} solved a problem! (AC)`, "success");
        } else {
          showToast(`${data.username} submitted: ${data.status}`, "error");
        }
      }
      // UI leaderboard update removed
    };
    socket.off("sync-entire-leaderboard");
    socket.off("leaderboard-update");
    socket.off("candidate-joined");
    socket.off("candidate-left");

    const handleSyncParticipants = (participants) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, participants };
      });
    };

    socket.on("sync-entire-leaderboard", handleSyncLeaderboard);
    socket.on("leaderboard-update", handleLeaderboardUpdate);
    socket.on("candidate-joined", handleCandidateJoined);
    socket.on("candidate-left", handleCandidateLeft);
    socket.on("sync-participants", handleSyncParticipants);

    return () => {
      socket.off("sync-entire-leaderboard", handleSyncLeaderboard);
      socket.off("leaderboard-update", handleLeaderboardUpdate);
      socket.off("candidate-joined", handleCandidateJoined);
      socket.off("candidate-left", handleCandidateLeft);
      socket.off("sync-participants", handleSyncParticipants);
    };
  }, [isInterviewer, activeRoomCode, id]);

  // --- EFFECT 3: CANDIDATE-ONLY LISTENERS ---
  useEffect(() => {
    if (isInterviewer || !activeRoomCode) return;

    const handleRoomClosed = () => {
      if (currentUser?.isGuest) {
        localStorage.removeItem("guestToken");
      }
      navigate("/interview-ended");
    };

    const handleForceNavigate = (newProblemId) => {
      if (monacoEditorRef.current) {
        sessionStorage.setItem(`session-${activeRoomCode}-problem-${id}`, monacoEditorRef.current.getValue());
      }
      showToast("Interviewer moved to another problem. Syncing...", "info", 2000);
      navigate(`/problem/${newProblemId}?session=${activeRoomCode}`);
    };

    socket.on("room-closed", handleRoomClosed);
    socket.on("force-navigate-problem", handleForceNavigate);
    
    return () => {
      socket.off("room-closed", handleRoomClosed);
      socket.off("force-navigate-problem", handleForceNavigate);
    };
  }, [isInterviewer, activeRoomCode, navigate, currentUser, id]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get(`/submissions/history/${id}`);
      setHistory(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistory([]);
    }
  }, [id]);

  // Sync ref for polling and auto-fetch history
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === "submissions") fetchHistory();
  }, [activeTab, fetchHistory]);

  useEffect(() => {
    const handleJobVerdict = (jobData) => {
      const minLoadingTime = 3000;
      const elapsedTime = Date.now() - (lastExecutionTimeRef.current || Date.now());
      const delay = Math.max(0, minLoadingTime - elapsedTime);

      setTimeout(() => {
        setStatus(jobData.status);
        setOutput(jobData.output || "");
        setIsRunning(false);
        setIsSubmitting(false);
        if (activeRoomCode) socket.emit("sync-execution-result", jobData);

        if (lastExecutionTypeRef.current === "submit") {
          if (activeTabRef.current === "submissions") {
            fetchHistory();
          }
          if (activeRoomCode && currentUser) {
            if (!socket.connected) socket.connect();
            socket.emit("candidate-submission", {
              roomCode: activeRoomCode,
              username: currentUser.username,
              status: jobData.status,
              problemId: id,
            });
          }
        }
      }, delay);
    };

    socket.on("job-verdict", handleJobVerdict);

    const handleSyncStart = (data) => {
      data.type === "run" ? setIsRunning(true) : setIsSubmitting(true);
      setStatus("Queued");
      setOutput("Processing...");
      setActiveTab("console");
      setActiveTestCase(0);
      const role = isInterviewer ? "Candidate" : "Interviewer";
      showToast(`${role} is ${data.type === "run" ? "running" : "submitting"} code...`, "info");
    };

    const handleSyncResult = (jobData) => {
      setStatus(jobData.status);
      setOutput(jobData.output || "");
      setIsRunning(false);
      setIsSubmitting(false);
      setActiveTab("console");
    };

    socket.on("sync-execution-start", handleSyncStart);
    socket.on("sync-execution-result", handleSyncResult);

    return () => {
      socket.off("job-verdict", handleJobVerdict);
      socket.off("sync-execution-start", handleSyncStart);
      socket.off("sync-execution-result", handleSyncResult);
    };
  }, [id, activeRoomCode, currentUser, fetchHistory, isInterviewer]);


  // Removed old fetchHistory location

  const handleLogout = async () => {
    try {
      if (activeRoomCode) {
        if (!socket.connected) socket.connect();
        socket.emit("leave-room", activeRoomCode);
        socket.disconnect();
      }
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const [showEndModal, setShowEndModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const handleCloseRoom = async () => {
    if (!activeRoomCode) {
      navigate("/");
      return;
    }
    try {
      if (sessionCode) {
        await api.post(`/sessions/close/${activeRoomCode}`);
      } else {
        await api.post(`/rooms/close/${activeRoomCode}`);
      }
      
      if (!socket.connected) socket.connect();
      socket.emit("interviewer-closed-room", activeRoomCode);
      showToast("Interview ended successfully", "success");
      navigate("/interview-ended?role=interviewer");
    } catch (err) {
      console.error("Failed to close room:", err);
      showToast("Failed to close interview", "error");
    }
  };

  const handleExecution = async (type) => {
    // Grab the latest code directly from the Monaco editor instance (or fallback to state)
    const currentCode = monacoEditorRef.current ? monacoEditorRef.current.getValue() : code;
    if (!currentCode.trim()) return;
    
    lastExecutionTypeRef.current = type;
    lastExecutionTimeRef.current = Date.now();
    type === "run" ? setIsRunning(true) : setIsSubmitting(true);
    setStatus("Queued");
    setOutput("Processing...");
    setActiveTab("description");
    setActiveTestCase(0);

    try {
      const response = await api.post("/submissions/submit", {
        problemId: id,
        language: "cpp",
        code: currentCode,
        executionType: type,
      });
      const jobId = response.data.data.jobId;
      if (!socket.connected) socket.connect();
      socket.emit("subscribe-job", jobId);
      if (activeRoomCode) socket.emit("sync-execution-start", { type });
    } catch (err) {
      console.error("Execution error:", err);
      setStatus("Error");
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  const handleRestoreCode = (submissionCode) => {
    if (submissionCode) {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.setValue(submissionCode);
      } else {
        setCode(submissionCode);
      }
      setActiveTab("description");
    }
  };

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
        case "RE":
        case "WA":
        default:
          return {
            text: "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]",
            dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
            box: "bg-red-500/10 text-red-300 border border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]",
          };
      }
    };

    if (parsedResults && Array.isArray(parsedResults) && parsedResults.length > 0) {
      const activeRes = parsedResults[activeTestCase] || parsedResults[0] || {};
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
                  {section.value || "N/A"}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      );
    }

    const isError = ["CE", "RE", "TLE", "WA"].includes(status);
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
        {status === "RE" && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            <div className="text-xs font-black uppercase text-rose-400 tracking-widest">Runtime Error</div>
          </div>
        )}
        {cleanedOutput}
      </motion.div>
    );
  };

  if (isFetchingProblem)
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <Spinner size="sm" label="Loading Workspace" />
      </div>
    );

  // ==========================================
  // Both Interviewer and Candidate share the same IDE view.
  // ==========================================

  // ==========================================
  // --- VIEW 2: CANDIDATE VIEW (Full IDE) ---
  // ==========================================
  return (
    <>
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden"
          >
            <h3 className="text-lg font-black text-white mb-2">End Interview?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to end this interview? This will permanently close the session and disconnect all participants.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowEndModal(false)}>
                Cancel
              </Button>
              <CountdownButton duration={3} onComplete={() => {
                setShowEndModal(false);
                handleCloseRoom();
              }}>
                Yes, End Interview
              </CountdownButton>
            </div>
          </motion.div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden"
          >
            <h3 className="text-lg font-black text-white mb-2">Exit Interview?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to leave the interview? You can rejoin later if the session is still active.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </Button>
              <CountdownButton duration={3} onComplete={() => {
                setShowLeaveModal(false);
                if (!socket.connected) socket.connect();
                socket.emit("leave-room", activeRoomCode);
                navigate("/interview-ended?role=candidate-exit");
              }}>
                Yes, Exit Interview
              </CountdownButton>
            </div>
          </motion.div>
        </div>
      )}
      
      {activeRoomCode && currentUser && (
        <MultiplayerCursors activeRoomCode={activeRoomCode} currentUser={currentUser} />
      )}

      <div className="h-screen w-screen bg-[#030303] flex flex-col font-sans text-zinc-200 overflow-hidden relative">
      <div className="absolute inset-0 animated-mesh-bg opacity-20 pointer-events-none z-0" />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <header className="h-16 flex justify-between items-center glass-panel border-b border-white/[0.05] px-8 shrink-0 z-30">
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              navigate("/");
            }}
            className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
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
                activeProblemId={id}
                onChange={(newId) => {
                  if (monacoEditorRef.current) {
                    sessionStorage.setItem(`session-${activeRoomCode}-problem-${id}`, monacoEditorRef.current.getValue());
                  }
                  if (!socket.connected) socket.connect();
                  socket.emit("interviewer-changed-problem", { roomCode: activeRoomCode, problemId: newId });
                  navigate(`/problem/${newId}?session=${activeRoomCode}`);
                }}
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
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${activeRoomCode}`);
                  showToast("Invite link copied to clipboard!", "success");
                }}
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
                onClick={() => setShowEndModal(true)}
              >
                End Interview
              </Button>
            </>
          )}
          {activeRoomCode && !isInterviewer && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLeaveModal(true)}
            >
              Exit Interview
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500/50 transition-all duration-300 group/logout gap-2 flex items-center px-4 rounded-xl backdrop-blur-md h-10 shadow-[0_8px_32px_rgba(239,68,68,0.1)]"
          >
            <LogOut className="w-3.5 h-3.5 group-hover/logout:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Logout
            </span>
          </Button>
        </div>
      </header>
      <div className="flex-1 flex gap-3 p-3 overflow-hidden relative z-10">
        {/* Left panel: problem description / submission history */}
        <div className="w-5/12 glass-card rounded-2xl flex flex-col border border-white/[0.05] shadow-2xl overflow-hidden">
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

        {/* Right panel: Editor and Console */}
        <div className="w-7/12 flex flex-col gap-3 min-h-0">
          <div className="flex-1 glass-card rounded-2xl flex flex-col border border-white/[0.05] shadow-2xl overflow-hidden min-h-0">
            <div className="bg-black/40 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/[0.05] shrink-0">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest glow-cyan drop-shadow-md">
                main.cpp
              </span>
            </div>
            <div className="flex-1 relative bg-black/20 overflow-hidden">
              <CodeEditor 
                key={id}
                code={code} 
                setCode={setCode} 
                language="cpp" 
                roomCode={activeRoomCode ? `${activeRoomCode}-${id}` : null}
                currentUser={currentUser}
                isInterviewer={isInterviewer}
                onMount={(editor) => monacoEditorRef.current = editor}
              />
            </div>
          </div>

          <div className="h-[55%] glass-card rounded-2xl flex flex-col border border-white/[0.05] shadow-2xl overflow-hidden shrink-0">
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
                
                {/* Shimmer Effect */}
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

                {/* Success Shimmer Effect */}
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
        </div>
      </div>
    </div>
      {/* Interviewer Dashboard */}
      
      {/* Toast Notifications */}
    </>
  );
}

export default IDE;
