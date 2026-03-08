import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge, { getFullStatus } from "../components/ui/StatusBadge";

// 1. PROXY CONFIG: Point to root so Vercel's vercel.json picks it up
const SOCKET_URL = "/"; 

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  path: "/socket.io", // Must match your vercel.json rewrite
  transports: ["polling", "websocket"], // Required for Vercel stability
});

function IDE() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room");
  const navigate = useNavigate();

  // State
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState({});
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

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // --- EFFECT 1: INITIAL LOAD & SOCKET CONNECTION ---
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        const userRes = await api.get("/users/current-user");
        const user = userRes.data.data;
        setCurrentUser(user);

        const probRes = await api.get(`/problems/${id}`);
        setProblem(probRes.data.data || null);

        if (roomCode) {
          const roomRes = await api.get(`/rooms/details/${roomCode}`);
          const roomData = roomRes.data.data;
          setRoom(roomData);
          setIsHost(roomData.host._id === user._id);

          // 🚨 SOCKET FIX: Set up join event BEFORE connecting
          const emitJoinRoom = () => {
            console.log("📡 Emitting join-room for:", user.username);
            socket.emit("join-room", {
              roomCode,
              username: user.username,
              userId: user._id,
              isHost: roomData.host._id === user._id
            });
          };

          socket.on("connect", emitJoinRoom);
          socket.connect();

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
      if (roomCode) socket.disconnect();
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [id, roomCode, navigate]);

  // --- EFFECT 2: REAL-TIME LISTENERS (TOASTS & JOINS) ---
  useEffect(() => {
    if (!roomCode) return;

    // Listeners for EVERYONE (Students & Teachers see toasts)
    socket.on("student-joined", (student) => {
      console.log("👋 Student Joined event received:", student.username);
      showToast(`Student joined: ${student.username}`, "info");
      setRoom((prev) => {
        if (!prev || prev.participants.some(p => p._id === student._id)) return prev;
        return { ...prev, participants: [...prev.participants, student] };
      });
    });

    socket.on("student-left", (student) => {
      showToast(`Student left: ${student.username}`, "error");
      setRoom((prev) => prev ? ({
        ...prev,
        participants: prev.participants.filter(p => p._id !== student._id)
      }) : null);
    });

    // Listeners for HOST ONLY
    if (isHost) {
      socket.on("leaderboard-update", (data) => {
        setLiveStatuses((prev) => ({ ...prev, [data.username]: data.status }));
      });
    }

    // Listeners for STUDENTS ONLY
    if (!isHost) {
      socket.on("room-closed", () => {
        showToast("Host closed the room. Redirecting...", "error", 3000);
        setTimeout(() => navigate("/"), 3000);
      });
    }

    return () => {
      socket.off("student-joined");
      socket.off("student-left");
      socket.off("leaderboard-update");
      socket.off("room-closed");
    };
  }, [isHost, roomCode, navigate]);

  // --- HELPER FUNCTIONS ---
  const handleExecution = async (type) => {
    if (!code.trim()) return;
    type === "run" ? setIsRunning(true) : setIsSubmitting(true);
    setStatus("Queued");
    setOutput("Processing...");
    setActiveTab("description");
    setActiveTestCase(0);

    try {
      const response = await api.post("/submissions/submit", {
        problemId: id,
        language: "cpp",
        code: code,
        executionType: type,
      });
      pollJobStatus(response.data.data.jobId, type);
    } catch (error) {
      setStatus("Error");
      setIsRunning(false);
      setIsSubmitting(false);
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
          setStatus(jobData.status);
          setOutput(jobData.output || "");
          setIsRunning(false);
          setIsSubmitting(false);

          if (roomCode && currentUser && type === "submit") {
            socket.emit("student-submission", {
              roomCode,
              username: currentUser.username,
              status: jobData.status,
            });
          }
        }
      } catch (err) {
        clearInterval(pollingIntervalRef.current);
        setIsRunning(false);
        setIsSubmitting(false);
      }
    }, 1500);
  };

  const renderConsoleContent = () => {
    if (!output) return <p className="text-sm font-mono text-zinc-500 italic mt-2">Run code to see output...</p>;
    // ... (Keep your existing renderConsoleContent logic here)
    return <div className="text-zinc-300 font-mono text-sm whitespace-pre-wrap">{output}</div>;
  };

  if (isFetchingProblem) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center"><Spinner label="Loading Workspace" /></div>;

  // --- UI RENDERING ---
  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col font-sans text-zinc-200 overflow-hidden relative">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-3 rounded-xl shadow-2xl border text-sm font-bold tracking-wide flex items-center gap-3 ${
            toast.type === "error" ? "bg-red-500/20 border-red-500/30 text-red-200" : "bg-blue-500/20 border-blue-500/30 text-blue-200"
          }`}>
            <div className={`w-2 h-2 rounded-full ${toast.type === "error" ? "bg-red-500" : "bg-blue-500"} animate-pulse`}></div>
            {toast.message}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="h-14 flex justify-between items-center bg-[#0d0d0d] border-b border-zinc-800 px-6 shrink-0 z-30">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="text-zinc-500 hover:text-white transition-colors text-[11px] font-bold uppercase tracking-widest">
            ‹ Dashboard
          </button>
          <div className="h-4 w-px bg-zinc-800"></div>
          <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-4">
            {problem?.title || "Problem"}
            {roomCode && <span className="bg-blue-500/10 text-blue-400 text-[9px] px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">Classroom: {roomCode}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === "AC" ? "bg-green-500" : status === "Idle" ? "bg-zinc-600" : "bg-yellow-500 animate-pulse"}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{getFullStatus(status)}</span>
          </div>
          <Button variant="danger" size="sm" onClick={() => api.post("/users/logout").then(() => window.location.href="/auth")}>Logout</Button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* LEFT: Description/Leaderboard */}
        <div className="w-5/12 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
           {isHost ? (
             <div className="p-4">
               <h3 className="text-blue-400 font-bold uppercase text-[10px] mb-4">Student Progress</h3>
               {room?.participants.map(p => (
                 <div key={p._id} className="flex justify-between py-2 border-b border-zinc-800">
                   <span className="text-sm">{p.username}</span>
                   <StatusBadge status={liveStatuses[p.username] || "In Progress"} />
                 </div>
               ))}
             </div>
           ) : (
             <div className="p-8 h-full overflow-y-auto custom-scrollbar">
               <h2 className="text-xl font-bold mb-4">{problem?.title}</h2>
               <p className="text-zinc-400 whitespace-pre-wrap">{problem?.description}</p>
             </div>
           )}
        </div>

        {/* RIGHT: Editor & Console */}
        <div className="w-7/12 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
            <CodeEditor code={code} setCode={setCode} />
          </div>
          <div className="h-[40%] bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
            <div className="bg-[#141414] px-6 py-2 border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-500">Console</div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">{renderConsoleContent()}</div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="h-14 bg-[#0d0d0d] border-t border-zinc-800 px-6 flex justify-end items-center gap-3">
        <Button variant="secondary" onClick={() => handleExecution("run")} disabled={isRunning || isSubmitting}>Run</Button>
        <Button variant="success" onClick={() => handleExecution("submit")} disabled={isRunning || isSubmitting}>Submit</Button>
      </footer>
    </div>
  );
}

export default IDE;