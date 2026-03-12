import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge, { getFullStatus } from "../components/ui/StatusBadge";
import { LogOut } from "lucide-react";
import Toast from "../components/ui/Toast";
import { socket } from "../utils/socket";

function IDE() {
  const { id } = useParams(); // problemId
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room");
  const navigate = useNavigate();

  // Classroom State
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState({}); 

  // Problem & IDE State
  const [problem, setProblem] = useState(null);
  const [isFetchingProblem, setIsFetchingProblem] = useState(true);
  const [activeTab, setActiveTab] = useState("description");
  const activeTabRef = useRef(activeTab); 
  const [history, setHistory] = useState([]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  const [code, setCode] = useState(
    `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n \n \treturn 0;\n}`
  );
  
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification State
  const [toast, setToast] = useState(null); 
  const pollingIntervalRef = useRef(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  // --- EFFECT 1: DATA FETCHING & HYDRATION ---
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const fetchWorkspaceData = async () => {
      try {
        const [userRes, probRes] = await Promise.all([
          api.get("/users/current-user"),
          api.get(`/problems/${id}`)
        ]);
        
        const user = userRes.data.data;
        setCurrentUser(user);
        setProblem(probRes.data.data || null);

        if (roomCode) {
          const roomRes = await api.get(`/rooms/details/${roomCode}`);
          const roomData = roomRes.data.data;
          setRoom(roomData);

          const hostId = roomData.host._id.toString();
          const currentUserId = user._id.toString();
          const userIsHost = (hostId === currentUserId);
          setIsHost(userIsHost);

          // 🚀 PERSISTENCE LOGIC: Populate board from DB on load/refresh
          const initialStatuses = {};
          if (roomData.studentProgress && roomData.participants) {
            roomData.studentProgress.forEach((progress) => {
              // Map studentId to username
              const student = roomData.participants.find(p => 
                (p._id?.toString() === progress.studentId?.toString())
              );
              const statusForThisProblem = progress.results[id];
              if (student && student.username && statusForThisProblem) {
                initialStatuses[student.username] = statusForThisProblem;
              }
            });
          }
          setLiveStatuses(initialStatuses);

          const emitJoinRoom = () => {
            socket.emit("join-room", { roomCode, username: user.username, userId: user._id, isHost: userIsHost });
          };
          socket.on("connect", emitJoinRoom);
          if (socket.connected) emitJoinRoom();
        }
      } catch (error) {
        console.error("Load Error:", error);
        navigate("/");
      } finally {
        setIsFetchingProblem(false);
      }
    };

    fetchWorkspaceData();
    return () => {
      socket.off("connect"); 
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [id, roomCode, navigate]);

  // --- EFFECT 2: TEACHER-ONLY LISTENERS ---
  useEffect(() => {
    if (!roomCode || !isHost) return;

    const handleFullSync = (allProgress) => {
      const newStatuses = {};
      allProgress.forEach(prog => {
        const student = room?.participants?.find(p => p._id.toString() === prog.studentId.toString());
        if (student && prog.results[id]) newStatuses[student.username] = prog.results[id];
      });
      setLiveStatuses(prev => ({ ...prev, ...newStatuses }));
    };

    const handleUpdate = (data) => {
      if (data.problemId === id) {
        setLiveStatuses((prev) => {
          // 🚀 ANTIGRAVITY: If current UI is already AC, ignore any updates
          if (prev[data.username] === "AC") return prev;
          return { ...prev, [data.username]: data.status };
        });
      }
    };

    const handleStudentJoined = (student) => {
      setRoom((prev) => {
        if (!prev) return prev;
        // 🚀 TOAST FILTER: Don't notify if they are already in the list
        const exists = prev.participants?.some(p => p._id.toString() === student._id.toString());
        if (!exists) {
          showToast(`Student joined: ${student.username}`, "info");
          return { ...prev, participants: [...prev.participants, student] };
        }
        return prev;
      });
    };

    const handleStudentLeft = (student) => {
      showToast(`Student left: ${student.username}`, "error");
      setRoom((prev) => prev ? ({ ...prev, participants: prev.participants.filter(p => p._id !== student._id) }) : null);
    };

    socket.on("sync-entire-leaderboard", handleFullSync);
    socket.on("leaderboard-update", handleUpdate);
    socket.on("student-joined", handleStudentJoined);
    socket.on("student-left", handleStudentLeft);

    return () => {
      socket.off("sync-entire-leaderboard");
      socket.off("leaderboard-update");
      socket.off("student-joined");
      socket.off("student-left");
    };
  }, [isHost, roomCode, id, room]);

  // --- EFFECT 3: STUDENT LISTENERS ---
  useEffect(() => {
    if (isHost || !roomCode) return;
    const handleRoomClosed = () => {
      showToast("Classroom closed by host. Exiting...", "error", 3000);
      setTimeout(() => navigate("/"), 3000);
    };
    socket.on("room-closed", handleRoomClosed);
    return () => socket.off("room-closed", handleRoomClosed);
  }, [isHost, roomCode, navigate]);

  // UI Support Logic
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { if (activeTab === "submissions") fetchHistory(); }, [activeTab]);

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/submissions/history/${id}`);
      setHistory(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) { setHistory([]); }
  };

  const handleLogout = async () => {
    try {
      if (socket.connected) socket.disconnect();
      localStorage.removeItem("accessToken");
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) { console.error(error); }
  };

  const handleCloseRoom = async () => {
    if (!roomCode) return navigate("/");
    showToast("Closing classroom...", "error", 2000);
    socket.emit("host-closed-room", roomCode);
    try { await api.post(`/rooms/close/${roomCode}`); } 
    finally { setTimeout(() => navigate("/"), 2000); }
  };

  const handleExecution = async (type) => {
    if (!code.trim()) return;
    type === "run" ? setIsRunning(true) : setIsSubmitting(true);
    setStatus("Queued"); setOutput("Processing...");
    setActiveTab("description"); setActiveTestCase(0);
    try {
      const response = await api.post("/submissions/submit", { problemId: id, language: "cpp", code, executionType: type });
      pollJobStatus(response.data.data.jobId, type);
    } catch (error) { setStatus("Error"); setIsRunning(false); setIsSubmitting(false); }
  };

  const pollJobStatus = (jobId, type) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/submissions/status/${jobId}`);
        const jobData = response.data.data;
        if (jobData && jobData.status !== "Pending" && jobData.status !== "Executing") {
          clearInterval(pollingIntervalRef.current);
          setStatus(jobData.status); setOutput(jobData.output || "");
          setIsRunning(false); setIsSubmitting(false);
          if (type === "submit" && roomCode && currentUser) {
            socket.emit("student-submission", { roomCode, username: currentUser.username, status: jobData.status, problemId: id });
          }
        }
      } catch (error) { clearInterval(pollingIntervalRef.current); setIsRunning(false); setIsSubmitting(false); }
    }, 1500);
  };

  const handleRestoreCode = (submissionCode) => { if (submissionCode) { setCode(submissionCode); setActiveTab("description"); } };

  const renderConsoleContent = () => {
    if (!output) return <p className="text-sm font-mono text-zinc-500 italic mt-2">Run code to see output...</p>;
    return <div className="text-zinc-300 font-mono text-sm whitespace-pre-wrap">{typeof output === 'string' ? output : JSON.stringify(output)}</div>;
  };

  if (isFetchingProblem) return <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center"><Spinner size="sm" label="Syncing Leaderboard..." /></div>;

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col font-sans text-zinc-200 overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {isHost ? (
        /* TEACHER VIEW (Your exact styles) */
        <div className="min-h-screen bg-[#050505] text-white p-8 font-sans relative">
          <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate(`/room/${roomCode}`)} className="flex items-center gap-2 group text-zinc-500 hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-zinc-800 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Return to Room</span>
              </button>
              <h1 className="text-xl font-bold flex gap-3"><span className="text-blue-400">Live Leaderboard:</span><span className="text-white">{problem?.title}</span></h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">Logout</Button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {room?.participants?.filter(p => p?._id?.toString() !== currentUser?._id?.toString()).map((student) => {
              const statusStr = liveStatuses[student.username] || "In Progress";
              const isAC = statusStr === "AC";
              const isError = ["WA", "TLE", "RE", "CE"].includes(statusStr);
              return (
                <div key={student._id} className={`bg-[#0a0a0a] border rounded-2xl p-6 relative overflow-hidden transition-all duration-300 shadow-lg ${isAC ? "border-green-500/30" : isError ? "border-red-500/30" : "border-zinc-800"}`}>
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${isAC ? "bg-green-500" : isError ? "bg-red-500" : "bg-blue-500"}`}></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border ${isAC ? "bg-green-500/10 border-green-500/30 !text-green-500" : isError ? "bg-red-500/10 border-red-500/30 !text-red-500" : "bg-zinc-800 border-zinc-700 text-zinc-300"}`}>{student.username?.charAt(0).toUpperCase()}</div>
                      <div><h3 className="text-zinc-100 font-bold truncate max-w-[120px]">{student.username}</h3><p className="text-zinc-500 text-xs font-mono">User</p></div>
                    </div>
                  </div>
                  <div className="mt-6 relative z-10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Live Status</span>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isAC ? "bg-green-500/10 border-green-500/20 !text-green-500" : isError ? "bg-red-500/10 border-red-500/20 !text-red-500" : "bg-blue-500/10 border-blue-500/20 !text-blue-500"}`}>
                      <div className={`w-2 h-2 rounded-full ${isAC ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : isError ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-blue-500 animate-pulse"}`}></div>
                      <span className="text-xs font-bold tracking-wide">{getFullStatus(statusStr)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* STUDENT VIEW (Your exact styles) */
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 flex justify-between items-center bg-[#0d0d0d] border-b border-zinc-800 px-6 shrink-0 z-30">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate(roomCode ? `/room/${roomCode}` : "/")} className="flex items-center gap-2 group text-zinc-500 hover:text-white transition-colors">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-zinc-800 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{roomCode ? "Return to Room" : "Dashboard"}</span>
              </button>
              <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-3">{problem?.title}</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/60 shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</span>
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded border ${status === "AC" ? "bg-green-500/10 border-green-500/20 !text-green-500" : "bg-blue-500/10 border-blue-500/20 !text-blue-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status === "AC" ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" : "bg-blue-500 animate-pulse"}`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{getFullStatus(status)}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/20 gap-2 flex items-center px-4 rounded-xl backdrop-blur-md h-10 shadow-[0_8px_32px_rgba(239,68,68,0.1)]">
                <LogOut className="w-3.5 h-3.5 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 flex gap-2 p-2 overflow-hidden">
            <div className="w-5/12 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
              <div className="bg-[#141414] flex shrink-0 border-b border-zinc-800/50 px-2">
                <button onClick={() => setActiveTab("description")} className={`text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-all ${activeTab === "description" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}>Problem</button>
                <button onClick={() => setActiveTab("submissions")} className={`text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-all ${activeTab === "submissions" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}>Submissions</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {activeTab === "description" ? <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap mb-10">{problem?.description}</p> : <div className="space-y-4 animate-in fade-in duration-300">{history.map((sub, i) => (<div key={i} onClick={() => handleRestoreCode(sub.code)} className="bg-[#111] border border-zinc-800 p-4 rounded-xl flex justify-between items-center hover:border-zinc-500 cursor-pointer group"><StatusBadge status={sub.status} /><span className="text-xs font-mono text-zinc-500">{new Date(sub.createdAt).toLocaleTimeString()}</span></div>))}</div>}
              </div>
            </div>
            <div className="w-7/12 flex flex-col gap-2 overflow-hidden">
              <div className="flex-1 bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden shadow-xl"><CodeEditor code={code} setCode={setCode} /></div>
              <div className="h-[40%] bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden shrink-0">
                <div className="bg-[#141414] px-6 py-3 border-b border-zinc-800"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Console</span></div>
                <div className="flex-1 p-6 bg-[#050505] overflow-y-auto custom-scrollbar">{renderConsoleContent()}</div>
              </div>
              <div className="h-16 flex justify-end items-center px-2 gap-3 shrink-0">
                <Button variant="secondary" size="lg" onClick={() => handleExecution("run")} disabled={isRunning || isSubmitting}>Run</Button>
                <Button variant="success" size="lg" onClick={() => handleExecution("submit")} disabled={isRunning || isSubmitting}>Submit</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IDE;