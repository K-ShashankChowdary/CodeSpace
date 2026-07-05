import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor";
import ProblemDropdown from "../components/ui/ProblemDropdown";
import CustomProblemModal from "../components/ui/CustomProblemModal";
import LanguageDropdown from "../components/ui/LanguageDropdown";
import CountdownButton from "../components/ui/CountdownButton";
import MultiplayerCursors from "../components/MultiplayerCursors";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge, { getFullStatus } from "../components/ui/StatusBadge";
import { LogOut, Play, Send, Loader2, Rocket, RotateCcw } from "lucide-react";
import Toast from "../components/ui/Toast";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

import { socket } from "../utils/socket";

import TerminalLoader from "../components/ui/TerminalLoader";
import IDEHeader from "../components/IDEHeader";
import ProblemPanel from "../components/ProblemPanel";
import ConsolePanel from "../components/ConsolePanel";

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
  const [allProblems, setAllProblems] = useState([]); // Question Bank
  const [isFetchingProblem, setIsFetchingProblem] = useState(true);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const activeTabRef = useRef(activeTab);
  const [history, setHistory] = useState([]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  // Instead of relying on React state for the code (which causes lag/cursor jumps with Yjs),
  // we store a reference to the Monaco editor directly.
  const monacoEditorRef = useRef(null);

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(`codespace-lastLang`) || "cpp";
  });

  useEffect(() => {
    localStorage.setItem(`codespace-lastLang`, language);
  }, [language]);

  const boilerplates = {
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`,
    c: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`,
    python: `def solve():\n    # Write your code here\n    \n    pass\n\nif __name__ == '__main__':\n    solve()`,
    java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n        \n    }\n}`,
    javascript: `function solve() {\n    // Write your code here\n    \n}\n\nsolve();`
  };

  const [code, setCode] = useState(() => {
    return localStorage.getItem(`codespace-${id}-${language}`) || boilerplates[language] || boilerplates["cpp"];
  });

  const setCursorToBoilerplate = (editor) => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    
    // Attempt 1: Find the comment
    let matches = model.findMatches("Write your code here", false, false, false, null, false);
    if (matches && matches.length > 0) {
      setTimeout(() => {
        editor.setPosition({ lineNumber: matches[0].range.endLineNumber + 1, column: 5 });
        editor.focus();
      }, 50);
      return;
    }

    // Attempt 2: Find "return 0;" for C/C++
    matches = model.findMatches("return 0;", false, false, false, null, false);
    if (matches && matches.length > 0) {
      setTimeout(() => {
        editor.setPosition({ lineNumber: Math.max(1, matches[0].range.startLineNumber - 1), column: 5 });
        editor.focus();
      }, 50);
      return;
    }

    // Attempt 3: Find "pass" for Python
    matches = model.findMatches("pass", false, false, false, null, false);
    if (matches && matches.length > 0) {
      setTimeout(() => {
        editor.setPosition({ lineNumber: matches[0].range.startLineNumber, column: 5 });
        editor.setSelection(matches[0].range);
        editor.focus();
      }, 50);
      return;
    }

    // Fallback: Middle of the document
    setTimeout(() => {
      editor.setPosition({ lineNumber: Math.floor(model.getLineCount() / 2) + 1, column: 5 });
      editor.focus();
    }, 50);
  };

  const [showResetModal, setShowResetModal] = useState(false);

  const performCodeReset = () => {
    const dbKeyMap = { cpp: "C++ 17", c: "C", python: "Python 3", java: "Java", javascript: "JavaScript" };
    const codeToSet = problem?.boilerplate?.[dbKeyMap[language]] || boilerplates[language];
    if (monacoEditorRef.current) {
      monacoEditorRef.current.setValue(codeToSet);
      setCursorToBoilerplate(monacoEditorRef.current);
    } else {
      setCode(codeToSet);
    }
    showToast("Code reset to boilerplate", "success");
  };

  const handleResetCode = () => {
    setShowResetModal(true);
  };

  useEffect(() => {
    if (code) {
      localStorage.setItem(`codespace-${id}-${language}`, code);
    }
  }, [code, language, id]);

  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification State
  const [toast, setToast] = useState(null);
  const lastExecutionTypeRef = useRef(null);
  const lastExecutionTimeRef = useRef(null);

  // Clear console when problem changes
  useEffect(() => {
    setOutput("");
    setStatus("Idle");
    setActiveTestCase(0);
  }, [id]);

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

        // Safely restore the user's previously written code for this specific problem and language
        const savedCode = localStorage.getItem(`codespace-${id}-${language}`);
        if (savedCode) {
          setCode(savedCode);
        } else if (problemData?.boilerplate) {
          const dbKeyMap = { cpp: "C++ 17", c: "C", python: "Python 3", java: "Java", javascript: "JavaScript" };
          setCode(problemData.boilerplate[dbKeyMap[language]] || boilerplates[language] || boilerplates["cpp"]);
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

          if (userIsInterviewer) {
            try {
              const allProbsRes = await api.get("/problems");
              setAllProblems(allProbsRes.data.data || []);
            } catch (err) {
              console.error("Failed to fetch question bank", err);
            }
          }

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

  const handleCreateCustomProblem = async (problemData) => {
    try {
      const res = await api.post("/problems", problemData);
      const newProblem = res.data.data;
      setAllProblems(prev => [...prev, newProblem]);
      showToast("Custom problem created!", "success");
      setIsCustomModalOpen(false);
      
      // Optionally navigate to it immediately:
      if (code) {
        sessionStorage.setItem(`session-${activeRoomCode}-problem-${id}`, monacoEditorRef.current.getValue());
      }
      socket.emit("interviewer-changed-problem", { roomCode: activeRoomCode, problemId: newProblem._id });
      navigate(`/problem/${newProblem._id}?session=${activeRoomCode}`);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to create problem", "error");
    }
  };

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

  // Intercept Browser Back Button & Refresh/Tab Close
  useEffect(() => {
    const handlePopState = (e) => {
      // Prevent browser from navigating back immediately
      window.history.pushState(null, null, window.location.href);
      // Show our custom warning modal instead
      if (isInterviewer) {
        setShowEndModal(true);
      } else {
        setShowLeaveModal(true);
      }
    };

    // Trap the back button
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", handlePopState);
    
    // Warn on tab close / refresh
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isInterviewer]);

  const handleDashboardClick = () => {
    if (activeRoomCode) {
      if (isInterviewer) {
        setShowEndModal(true);
      } else {
        setShowLeaveModal(true);
      }
    } else {
      navigate("/");
    }
  };

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
        language: language,
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

  if (isFetchingProblem)
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <Spinner size="sm" label="Loading Workspace" />
      </div>
    );

  return (
    <>
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden"
          >
            <h3 className="text-lg font-black text-white mb-2">Reset Code?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to reset your code to the default boilerplate? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowResetModal(false);
                performCodeReset();
              }} className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                Yes, Reset Code
              </Button>
            </div>
          </motion.div>
        </div>
      )}

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
              <CountdownButton duration={5} onComplete={() => {
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
      <IDEHeader
        navigate={navigate}
        onDashboardClick={handleDashboardClick}
        isInterviewer={isInterviewer}
        room={room}
        allProblems={allProblems}
        activeProblemId={id}
        activeRoomCode={activeRoomCode}
        problem={problem}
        status={status}
        onCreateCustomClick={() => setIsCustomModalOpen(true)}
        onChangeProblem={(newId) => {
          // Save current code before switching
          if (code) {
            sessionStorage.setItem(`session-${activeRoomCode}-problem-${id}`, monacoEditorRef.current.getValue());
          }
          // Broadcast the problem switch to everyone
          socket.emit("interviewer-changed-problem", { roomCode: activeRoomCode, problemId: newId });
          navigate(`/problem/${newId}?session=${activeRoomCode}`);
        }}
        onEndInterview={() => setShowEndModal(true)}
        onExitInterview={() => setShowLeaveModal(true)}
        onLogout={handleLogout}
        onCopyLink={() => {
          navigator.clipboard.writeText(`${window.location.origin}/join/${activeRoomCode}`);
          showToast("Invite link copied to clipboard!", "success");
        }}
      />
      <div className="flex-1 flex gap-3 p-3 overflow-hidden relative z-10">
        {/* Left panel: problem description / submission history */}
        <ProblemPanel
          problem={problem}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          history={history}
          handleRestoreCode={handleRestoreCode}
        />

        {/* Right panel: Editor and Console */}
        <div className="w-7/12 flex flex-col gap-3 min-h-0">
          <div className="flex-1 glass-card rounded-2xl flex flex-col border border-white/[0.05] shadow-2xl overflow-hidden min-h-0">
            <div className="bg-black/40 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/[0.05] shrink-0 z-20">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest glow-cyan drop-shadow-md">
                {language === "cpp" ? "main.cpp" : language === "c" ? "main.c" : language === "python" ? "main.py" : language === "java" ? "Main.java" : "index.js"}
              </span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleResetCode}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors duration-200"
                  title="Reset code to boilerplate"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
                <LanguageDropdown 
                  language={language}
                  onChange={(lang) => {
                    setLanguage(lang);
                    const savedLangCode = localStorage.getItem(`codespace-${id}-${lang}`);
                    const dbKeyMap = { cpp: "C++ 17", c: "C", python: "Python 3", java: "Java", javascript: "JavaScript" };
                    const codeToSet = savedLangCode || problem?.boilerplate?.[dbKeyMap[lang]] || boilerplates[lang];
                    
                    if (monacoEditorRef.current) {
                      monacoEditorRef.current.setValue(codeToSet);
                      setCursorToBoilerplate(monacoEditorRef.current);
                    } else {
                      setCode(codeToSet);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex-1 relative bg-black/20 overflow-hidden">
              <CodeEditor 
                key={id}
                code={code} 
                setCode={setCode} 
                language={language} 
                roomCode={activeRoomCode ? `${activeRoomCode}-${id}` : null}
                currentUser={currentUser}
                isInterviewer={isInterviewer}
                onMount={(editor) => {
                  monacoEditorRef.current = editor;
                  setCursorToBoilerplate(editor);
                }}
              />
            </div>
          </div>

          <ConsolePanel
            output={output}
            status={status}
            activeTestCase={activeTestCase}
            setActiveTestCase={setActiveTestCase}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            handleExecution={handleExecution}
          />
        </div>
      </div>
    </div>
      {/* Toast Notifications */}
      <CustomProblemModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={handleCreateCustomProblem}
      />
    </>
  );
}

export default IDE;
