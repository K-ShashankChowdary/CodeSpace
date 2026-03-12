import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge, { getFullStatus } from "../components/ui/StatusBadge";
import { LogOut, Play } from "lucide-react";
import Toast from "../components/ui/Toast";
import { socket } from "../utils/socket";

function IDE() {
  const { id } = useParams();
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

  const [code, setCode] = useState(`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n \n \treturn 0;\n}`);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const pollingIntervalRef = useRef(null);

  const showToast = (message, type = "info") => setToast({ message, type });

  // --- EFFECT 1: INITIAL DATA FETCH & HYDRATION ---
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
        setProblem(probRes.data.data);

        if (roomCode) {
          const roomRes = await api.get(`/rooms/details/${roomCode}`);
          const roomData = roomRes.data.data;
          setRoom(roomData);

          const userIsHost = roomData.host._id.toString() === user._id.toString();
          setIsHost(userIsHost);

          // 🚨 HYDRATION: Set initial statuses from DB
          const initialStatuses = {};
          if (roomData.studentProgress) {
            roomData.studentProgress.forEach(prog => {
              const student = roomData.participants?.find(p => p._id === prog.studentId);
              const statusFromDB = prog.results[id]; 
              if (student && statusFromDB) initialStatuses[student.username] = statusFromDB;
            });
          }
          setLiveStatuses(initialStatuses);

          socket.emit("join-room", { roomCode });
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
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [id, roomCode, navigate]);

  // --- EFFECT 2: TEACHER LISTENERS ---
  useEffect(() => {
    if (!roomCode || !isHost) return;

    const handleFullSync = (allProgress) => {
      const newStatuses = {};
      allProgress.forEach(prog => {
        const student = room?.participants?.find(p => p._id === prog.studentId);
        if (student && prog.results[id]) newStatuses[student.username] = prog.results[id];
      });
      setLiveStatuses(newStatuses);
    };

    const handleUpdate = (data) => {
      if (data.problemId === id) {
        setLiveStatuses((prev) => {
          // 🚨 STICKY AC: If already AC, don't change it
          if (prev[data.username] === "AC") return prev;
          return { ...prev, [data.username]: data.status };
        });
      }
    };

    const handleStudentJoined = (student) => {
      setRoom((prev) => {
        if (!prev || prev.participants?.some(p => p._id === student._id)) return prev;
        showToast(`${student.username} joined the session`, "info");
        return { ...prev, participants: [...prev.participants, student] };
      });
    };

    socket.on("sync-entire-leaderboard", handleFullSync);
    socket.on("leaderboard-update", handleUpdate);
    socket.on("student-joined", handleStudentJoined);

    return () => {
      socket.off("sync-entire-leaderboard");
      socket.off("leaderboard-update");
      socket.off("student-joined");
    };
  }, [isHost, roomCode, id, room]);

  // --- EFFECT 3: STUDENT LISTENERS ---
  useEffect(() => {
    if (isHost || !roomCode) return;
    const handleClosed = () => {
      showToast("Classroom closed by host", "error");
      setTimeout(() => navigate("/"), 2000);
    };
    socket.on("room-closed", handleClosed);
    return () => socket.off("room-closed", handleClosed);
  }, [isHost, roomCode, navigate]);

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
    if (!roomCode) { navigate("/"); return; }
    showToast("Closing classroom...", "error", 2000);
    socket.emit("host-closed-room", roomCode);
    try {
      await api.post(`/rooms/close/${roomCode}`);
    } finally {
      setTimeout(() => navigate("/"), 2000);
    }
  };

  const handleExecution = async (type) => {
    if (!code.trim()) return;
    type === "run" ? setIsRunning(true) : setIsSubmitting(true);
    setStatus("Queued"); setOutput("Processing...");
    setActiveTab("description"); setActiveTestCase(0);
    try {
      const response = await api.post("/submissions/submit", {
        problemId: id, language: "cpp", code, executionType: type
      });
      pollJobStatus(response.data.data.jobId, type);
    } catch (error) {
      setStatus("Error"); setIsRunning(false); setIsSubmitting(false);
    }
  };

  const pollJobStatus = (jobId, type) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/submissions/status/${jobId}`);
        const jobData = response.data.data;
        if (jobData && jobData.status !== "Pending" && jobData.status !== "Executing") {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setStatus(jobData.status); setOutput(jobData.output || "");
          setIsRunning(false); setIsSubmitting(false);
          if (type === "submit" && roomCode && currentUser) {
            socket.emit("student-submission", {
              roomCode, username: currentUser.username, status: jobData.status, problemId: id
            });
          }
        }
      } catch (error) {
        clearInterval(pollingIntervalRef.current);
        setIsRunning(false); setIsSubmitting(false);
      }
    }, 1500);
  };

  const handleRestoreCode = (submissionCode) => {
    if (submissionCode) { setCode(submissionCode); setActiveTab("description"); }
  };

  const renderConsoleContent = () => {
    if (!output) return <p className="text-sm font-mono text-zinc-500 italic mt-2">Run code to see output...</p>;

    let parsedResults = null;
    if (Array.isArray(output)) {
      parsedResults = output;
    } else if (typeof output === "string" && output.trim().startsWith("[")) {
      try { parsedResults = JSON.parse(output); } catch (e) {}
    }

    if (parsedResults && Array.isArray(parsedResults) && parsedResults.length > 0) {
      const activeRes = parsedResults[activeTestCase] || parsedResults[0] || {};
      const overallStatus = parsedResults.every((r) => r?.status === "AC") ? "AC" : 
                            parsedResults.find((r) => r?.status !== "AC")?.status || "WA";

      return (
        <div className="flex flex-col">
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className={`text-2xl font-bold ${overallStatus === "AC" ? "text-green-500" : "text-red-500"}`}>
              {getFullStatus(overallStatus)}
            </h2>
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar">
            {parsedResults.map((res, i) => (
              <button key={i} onClick={() => setActiveTestCase(i)} className={`px-4 py-2 rounded-md text-sm transition-all ${activeTestCase === i ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>
                Case {i + 1}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-[#050505] p-4 rounded-lg border border-zinc-800 font-mono text-sm">
              <span className="text-zinc-500 block mb-1">Output:</span>
              <span className={activeRes?.status === "AC" ? "text-zinc-200" : "text-red-400"}>{activeRes?.actual || "N/A"}</span>
            </div>
          </div>
        </div>
      );
    }
    return <div className="text-zinc-300 font-mono text-sm whitespace-pre-wrap">{typeof output === 'string' ? output : JSON.stringify(output)}</div>;
  };

  if (isFetchingProblem) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center"><Spinner size="sm" label="Syncing Leaderboard..." /></div>;

  // --- RENDER ---
  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col font-sans text-zinc-200 overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {isHost ? (
         /* TEACHER VIEW */
         <div className="min-h-screen bg-[#050505] text-white p-8 font-sans relative">
            <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-6">
               <div className="flex items-center gap-6">
                 <button onClick={() => navigate(`/room/${roomCode}`)} className="flex items-center gap-2 group text-zinc-500 hover:text-white transition-colors">
                   <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-zinc-800 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest">Return to Room</span>
                 </button>
                 <h1 className="text-xl font-bold flex gap-3">
                   <span className="text-blue-400">Live Leaderboard:</span>
                   <span>{problem?.title}</span>
                 </h1>
               </div>
               <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-red-400">Logout</Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {room?.participants?.filter(p => p?._id?.toString() !== currentUser?._id?.toString()).map((student) => {
                  const statusStr = liveStatuses[student.username] || "In Progress";
                  const isAC = statusStr === "AC";
                  return (
                    <div key={student._id} className={`bg-[#0a0a0a] border rounded-2xl p-6 transition-all ${isAC ? "border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-zinc-800"}`}>
                       <h3 className="text-zinc-100 font-bold mb-4">{student.username}</h3>
                       <div className={`px-3 py-2 rounded-lg border text-xs font-bold ${isAC ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}`}>
                         {getFullStatus(statusStr)}
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>
      ) : (
        /* STUDENT VIEW */
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 flex justify-between items-center bg-[#0d0d0d] border-b border-zinc-800 px-6 shrink-0 z-30">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate(roomCode ? `/room/${roomCode}` : "/")} className="text-zinc-500 hover:text-white transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-widest">{roomCode ? "‹ Room" : "‹ Dashboard"}</span>
              </button>
              <h1 className="text-sm font-black text-white italic tracking-tight">{problem?.title}</h1>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <div className={`w-2 h-2 rounded-full ${status === "AC" ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,1)]" : "bg-blue-500 animate-pulse"}`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{getFullStatus(status)}</span>
               </div>
               <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400">Logout</Button>
            </div>
          </header>

          <div className="flex-1 flex gap-2 p-2 overflow-hidden">
            <div className="w-5/12 bg-[#0d0d0d] rounded-xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
               <div className="flex border-b border-zinc-800 bg-[#141414]">
                 <button onClick={() => setActiveTab("description")} className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === "description" ? "text-white border-b-2" : "text-zinc-500"}`}>Description</button>
                 <button onClick={() => setActiveTab("submissions")} className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === "submissions" ? "text-white border-b-2" : "text-zinc-500"}`}>History</button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 {activeTab === "description" ? (
                   <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{problem?.description}</p>
                 ) : (
                   <div className="space-y-3">
                     {history.map((sub, i) => (
                       <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex justify-between items-center">
                         <StatusBadge status={sub.status} />
                         <span className="text-xs font-mono text-zinc-500">{new Date(sub.createdAt).toLocaleTimeString()}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>

            <div className="w-7/12 flex flex-col gap-2 overflow-hidden">
               <div className="flex-1 bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden shadow-xl">
                 <CodeEditor code={code} setCode={setCode} />
               </div>
               <div className="h-1/3 bg-[#0d0d0d] rounded-xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
                 <div className="px-6 py-2 border-b border-zinc-800 bg-[#141414] text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Console</div>
                 <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">{renderConsoleContent()}</div>
               </div>
               <div className="flex justify-end gap-3 h-14 items-center shrink-0">
                 <Button variant="secondary" onClick={() => handleExecution("run")} disabled={isRunning || isSubmitting}>Run</Button>
                 <Button variant="success" onClick={() => handleExecution("submit")} disabled={isRunning || isSubmitting}>Submit</Button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IDE;