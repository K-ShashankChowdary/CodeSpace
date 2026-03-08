import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge, { getFullStatus } from "../components/ui/StatusBadge";

const SOCKET_URL = "/"; 

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  path: "/socket.io", 
  transports: ["polling", "websocket"], 
});

function IDE() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room");
  const navigate = useNavigate();

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

          const emitJoinRoom = () => {
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

  // --- EFFECT 2: REAL-TIME NOTIFICATIONS (TEACHER ONLY) ---
  useEffect(() => {
    if (!roomCode || !isHost) return; // 🚨 Only attach these if the user IS THE HOST

    const handleStudentJoined = (student) => {
      showToast(`Student joined: ${student.username}`, "info");
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.participants.some(p => p._id === student._id)) return prev;
        return { ...prev, participants: [...prev.participants, student] };
      });
    };

    const handleStudentLeft = (student) => {
      showToast(`Student left: ${student.username}`, "error");
      setRoom((prev) => prev ? ({
        ...prev,
        participants: prev.participants.filter(p => p._id !== student._id)
      }) : null);
    };

    const handleLeaderboardUpdate = (data) => {
      setLiveStatuses((prev) => ({ ...prev, [data.username]: data.status }));
    };

    // Attach teacher-only listeners
    socket.on("student-joined", handleStudentJoined);
    socket.on("student-left", handleStudentLeft);
    socket.on("leaderboard-update", handleLeaderboardUpdate);

    return () => {
      // Clean up specific listeners
      socket.off("student-joined", handleStudentJoined);
      socket.off("student-left", handleStudentLeft);
      socket.off("leaderboard-update", handleLeaderboardUpdate);
    };
  }, [isHost, roomCode]);

  // --- REST OF LOGIC (handleLogout, handleExecution, etc.) ---
  const handleLogout = async () => {
    try { await api.post("/users/logout"); window.location.href = "/auth"; } catch (e) {}
  };

  const handleExecution = async (type) => {
    if (!code.trim()) return;
    type === "run" ? setIsRunning(true) : setIsSubmitting(true);
    setStatus("Queued");
    try {
      const response = await api.post("/submissions/submit", { problemId: id, language: "cpp", code, executionType: type });
      pollJobStatus(response.data.data.jobId, type);
    } catch (e) { setStatus("Error"); setIsRunning(false); setIsSubmitting(false); }
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
          setIsRunning(false); setIsSubmitting(false);
          if (roomCode && currentUser && type === "submit") {
            socket.emit("student-submission", { roomCode, username: currentUser.username, status: jobData.status });
          }
        }
      } catch (err) { clearInterval(pollingIntervalRef.current); }
    }, 1500);
  };

  const renderConsoleContent = () => {
    if (!output) return <p className="text-zinc-500 italic text-sm">Run code to see output...</p>;
    return <div className="text-zinc-300 font-mono text-sm whitespace-pre-wrap">{typeof output === 'string' ? output : JSON.stringify(output)}</div>;
  };

  if (isFetchingProblem) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center"><Spinner label="Loading Workspace" /></div>;

  // --- TEACHER VIEW ---
  if (isHost) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8 relative">
        {toast && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-blue-500/20 border border-blue-500/30 px-6 py-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-4">
            {toast.message}
          </div>
        )}
        <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-4">
          <div><h1 className="text-2xl font-bold text-blue-400">Classroom: {problem?.title}</h1><p className="text-zinc-500">Room Code: {roomCode}</p></div>
          <Button onClick={() => navigate("/")}>Exit Classroom</Button>
        </header>
        <div className="bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-[#141414] text-zinc-500 text-[10px] uppercase tracking-widest">
              <tr><th className="p-4">Student Name</th><th className="p-4">Live Status</th></tr>
            </thead>
            <tbody>
              {room?.participants.filter(p => p._id !== currentUser?._id).map(student => (
                <tr key={student._id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                  <td className="p-4 text-sm">{student.username}</td>
                  <td className="p-4"><StatusBadge status={liveStatuses[student.username] || "In Progress"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- STUDENT VIEW ---
  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col text-zinc-200 overflow-hidden relative">
      {/* Note: No toast div here for students unless you want them to see execution errors */}
      <header className="h-14 flex justify-between items-center bg-[#0d0d0d] border-b border-zinc-800 px-6">
        <h1 className="text-sm font-bold">{problem?.title} <span className="text-zinc-500 ml-4 font-mono">Room: {roomCode}</span></h1>
        <Button variant="danger" size="sm" onClick={handleLogout}>Logout</Button>
      </header>
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        <div className="w-5/12 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 overflow-hidden shadow-xl">
          <div className="bg-[#141414] px-6 py-3 border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-500">Problem Description</div>
          <div className="p-8 overflow-y-auto text-sm leading-relaxed text-zinc-300 custom-scrollbar">{problem?.description}</div>
        </div>
        <div className="w-7/12 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden shadow-xl"><CodeEditor code={code} setCode={setCode} /></div>
          <div className="h-[35%] bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden shadow-xl shrink-0">
            <div className="bg-[#141414] px-6 py-2 border-b border-zinc-800 text-[10px] font-bold text-zinc-500">CONSOLE</div>
            <div className="p-4 overflow-y-auto custom-scrollbar">{renderConsoleContent()}</div>
          </div>
        </div>
      </div>
      <footer className="h-14 bg-[#0d0d0d] border-t border-zinc-800 px-6 flex justify-end items-center gap-3">
        <Button variant="secondary" onClick={() => handleExecution("run")} disabled={isRunning || isSubmitting}>Run</Button>
        <Button variant="success" onClick={() => handleExecution("submit")} disabled={isRunning || isSubmitting}>Submit</Button>
      </footer>
    </div>
  );
}

export default IDE;