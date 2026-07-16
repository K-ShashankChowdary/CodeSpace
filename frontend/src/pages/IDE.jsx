import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { socket } from "../utils/socket";

// Components
import CodeEditor from "../components/ide/CodeEditor";
import MultiplayerCursors from "../components/ide/MultiplayerCursors";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import CountdownButton from "../components/ui/CountdownButton";
import Toast from "../components/ui/Toast";
import CustomProblemModal from "../components/ui/CustomProblemModal";
import IDEHeader from "../components/ide/IDEHeader";
import ProblemPanel from "../components/ide/ProblemPanel";
import ConsolePanel from "../components/ide/ConsolePanel";
import LanguageDropdown from "../components/ui/LanguageDropdown";
import DraggableVideoPanel from "../components/ide/DraggableVideoPanel";

// Custom Hooks
import { useIDEState, BOILERPLATES } from "../hooks/useIDEState";
import { useWorkspaceData } from "../hooks/useWorkspaceData";
import { useCodeExecution } from "../hooks/useCodeExecution";

import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

function IDE() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room");
  const sessionCode = searchParams.get("session");
  const activeRoomCode = sessionCode || roomCode;
  const navigate = useNavigate();

  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  const [showEndModal, setShowEndModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const monacoEditorRef = useRef(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // 1. IDE State (Tabs, Language, Code)
  const {
    activeTab,
    setActiveTab,
    language,
    setLanguage,
    code,
    setCode
  } = useIDEState(id, activeRoomCode);

  // 2. Workspace Data (Socket connections, WebRTC, Roles, Data Fetching)
  const {
    room,
    currentUser,
    isInterviewer,
    problem,
    allProblems,
    setAllProblems,
    isFetchingProblem
  } = useWorkspaceData(
    id, activeRoomCode, sessionCode, language, setCode, BOILERPLATES, showToast, navigate, monacoEditorRef
  );

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get(`/submissions/history/${id}`);
      setHistory(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistory([]);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab === "submissions") fetchHistory();
  }, [activeTab, fetchHistory]);

  // 3. Code Execution (Run/Submit, Status, Output)
  const {
    output,
    setOutput,
    status,
    setStatus,
    isRunning,
    isSubmitting,
    activeTestCase,
    setActiveTestCase,
    handleExecution
  } = useCodeExecution(id, activeRoomCode, currentUser, isInterviewer, fetchHistory, setActiveTab);

  // Reset output on problem change
  useEffect(() => {
    setOutput("");
    setStatus("Idle");
    setActiveTestCase(0);
  }, [id, setOutput, setStatus, setActiveTestCase]);

  // Boilerplate & Editor Utilities
  const setCursorToBoilerplate = (editor) => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    let matches = model.findMatches("Write your code here", false, false, false, null, false);
    if (matches && matches.length > 0) {
      setTimeout(() => { editor.setPosition({ lineNumber: matches[0].range.endLineNumber + 1, column: 5 }); editor.focus(); }, 50);
      return;
    }
    matches = model.findMatches("return 0;", false, false, false, null, false);
    if (matches && matches.length > 0) {
      setTimeout(() => { editor.setPosition({ lineNumber: Math.max(1, matches[0].range.startLineNumber - 1), column: 5 }); editor.focus(); }, 50);
      return;
    }
    matches = model.findMatches("pass", false, false, false, null, false);
    if (matches && matches.length > 0) {
      setTimeout(() => { editor.setPosition({ lineNumber: matches[0].range.startLineNumber, column: 5 }); editor.setSelection(matches[0].range); editor.focus(); }, 50);
      return;
    }
    setTimeout(() => { editor.setPosition({ lineNumber: Math.floor(model.getLineCount() / 2) + 1, column: 5 }); editor.focus(); }, 50);
  };

  const performCodeReset = () => {
    const dbKeyMap = { cpp: "C++ 17", c: "C", python: "Python 3", java: "Java", javascript: "JavaScript" };
    const codeToSet = problem?.boilerplate?.[dbKeyMap[language]] || BOILERPLATES[language];
    if (monacoEditorRef.current) {
      monacoEditorRef.current.setValue(codeToSet);
      setCursorToBoilerplate(monacoEditorRef.current);
    } else {
      setCode(codeToSet);
    }
    showToast("Code reset to boilerplate", "success");
  };

  const handleLogout = async () => {
    try {
      if (activeRoomCode) {
        if (!socket.connected) socket.connect();
        socket.emit("leave-room", activeRoomCode);
        socket.disconnect();
      }
      localStorage.removeItem("guestToken");
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCloseRoom = async () => {
    if (!activeRoomCode) {
      navigate("/");
      return;
    }
    try {
      if (sessionCode) await api.post(`/sessions/close/${activeRoomCode}`);
      else await api.post(`/rooms/close/${activeRoomCode}`);
      
      if (!socket.connected) socket.connect();
      socket.emit("interviewer-closed-room", activeRoomCode);
      showToast("Interview ended successfully", "success");
      navigate("/interview-ended?role=interviewer");
    } catch (err) {
      console.error("Failed to close room:", err);
      showToast("Failed to close interview", "error");
    }
  };

  const handleCreateCustomProblem = async (problemData) => {
    try {
      const res = await api.post("/problems", problemData);
      const newProblem = res.data.data;
      setAllProblems(prev => [...prev, newProblem]);
      showToast("Custom problem created!", "success");
      setIsCustomModalOpen(false);
      
      if (code && monacoEditorRef.current) sessionStorage.setItem(`session-${activeRoomCode}-problem-${id}`, monacoEditorRef.current.getValue());
      socket.emit("interviewer-changed-problem", { roomCode: activeRoomCode, problemId: newProblem._id });
      navigate(`/problem/${newProblem._id}?session=${activeRoomCode}`);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to create problem", "error");
    }
  };

  useEffect(() => {
    if (!activeRoomCode) return;
    const handleSyncLanguage = (newLang) => {
      setLanguage(newLang);
    };
    socket.on("sync-language", handleSyncLanguage);
    return () => socket.off("sync-language", handleSyncLanguage);
  }, [activeRoomCode, setLanguage]);

  // Intercept Back Button / Refresh
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
      isInterviewer ? setShowEndModal(true) : setShowLeaveModal(true);
    };
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", handlePopState);
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isInterviewer]);

  if (isFetchingProblem) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <Spinner size="sm" label="Loading Workspace" />
      </div>
    );
  }

  return (
    <>
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
            <h3 className="text-lg font-black text-white mb-2">Reset Code?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Are you sure you want to reset your code to the default boilerplate? This action cannot be undone.</p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowResetModal(false)}>Cancel</Button>
              <Button onClick={() => { setShowResetModal(false); performCodeReset(); }} className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">Yes, Reset Code</Button>
            </div>
          </motion.div>
        </div>
      )}

      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
            <h3 className="text-lg font-black text-white mb-2">End Interview?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Are you sure you want to end this interview? This will permanently close the session.</p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowEndModal(false)}>Cancel</Button>
              <CountdownButton duration={3} onComplete={() => { setShowEndModal(false); handleCloseRoom(); }}>Yes, End Interview</CountdownButton>
            </div>
          </motion.div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
            <h3 className="text-lg font-black text-white mb-2">Exit Interview?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Are you sure you want to leave the interview?</p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
              <CountdownButton duration={3} onComplete={() => { setShowLeaveModal(false); if (!socket.connected) socket.connect(); socket.emit("leave-room", activeRoomCode); navigate("/interview-ended?role=candidate-exit"); }}>Yes, Exit Interview</CountdownButton>
            </div>
          </motion.div>
        </div>
      )}
      
      {activeRoomCode && currentUser && (
        <MultiplayerCursors activeRoomCode={activeRoomCode} currentUser={currentUser} />
      )}

      <div className="h-screen w-screen bg-[#030303] flex flex-col font-sans text-zinc-200 overflow-hidden relative">
        <div className="absolute inset-0 animated-mesh-bg opacity-20 pointer-events-none z-0" />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <IDEHeader
          navigate={navigate}
          onDashboardClick={() => isInterviewer ? setShowEndModal(true) : setShowLeaveModal(true)}
          isInterviewer={isInterviewer}
          room={room}
          allProblems={allProblems}
          activeProblemId={id}
          activeRoomCode={activeRoomCode}
          problem={problem}
          status={status}
          onCreateCustomClick={() => setIsCustomModalOpen(true)}
          onChangeProblem={(newId) => {
            if (code) sessionStorage.setItem(`session-${activeRoomCode}-problem-${id}`, monacoEditorRef.current.getValue());
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
          isVideoOpen={isVideoOpen}
          onToggleVideo={() => setIsVideoOpen(!isVideoOpen)}
        />
        
        <div className="flex-1 flex gap-3 p-3 overflow-hidden relative z-10">
          <ProblemPanel
            problem={problem}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            history={history}
            handleRestoreCode={(submissionCode) => {
              if (submissionCode) {
                if (monacoEditorRef.current) monacoEditorRef.current.setValue(submissionCode);
                else setCode(submissionCode);
                setActiveTab("description");
              }
            }}
          />

          <div className="w-7/12 flex flex-col gap-3 min-h-0">
            <div className="flex-1 glass-card rounded-2xl flex flex-col border border-white/[0.05] shadow-2xl overflow-hidden min-h-0">
              <div className="bg-black/40 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/[0.05] shrink-0 z-20">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest glow-cyan drop-shadow-md">
                  {language === "cpp" ? "main.cpp" : language === "c" ? "main.c" : language === "python" ? "main.py" : language === "java" ? "Main.java" : "index.js"}
                </span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowResetModal(true)} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors duration-200">
                    <RotateCcw size={14} /><span>Reset</span>
                  </button>
                  <LanguageDropdown 
                    language={language}
                    onChange={(lang) => {
                      setLanguage(lang);
                      if (activeRoomCode) {
                        socket.emit("sync-language", { roomCode: activeRoomCode, language: lang });
                      }
                      const codeToSet = localStorage.getItem(`codespace-${id}-${lang}`) || problem?.boilerplate?.[{ cpp: "C++ 17", c: "C", python: "Python 3", java: "Java", javascript: "JavaScript" }[lang]] || BOILERPLATES[lang];
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
                  onMount={(editor) => { monacoEditorRef.current = editor; setCursorToBoilerplate(editor); }}
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
              handleExecution={(type) => {
                const currentCode = monacoEditorRef.current ? monacoEditorRef.current.getValue() : code;
                handleExecution(type, currentCode, language);
              }}
            />
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isVideoOpen && activeRoomCode && (
          <DraggableVideoPanel
            key="video-panel"
            onClose={() => setIsVideoOpen(false)}
            isInterviewer={isInterviewer}
          />
        )}
      </AnimatePresence>

      <CustomProblemModal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} onSubmit={handleCreateCustomProblem} />
    </>
  );
}

export default IDE;
