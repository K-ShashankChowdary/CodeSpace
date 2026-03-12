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

  const showToast = (message, type = "info") => setToast({ message, type });

  // --- EFFECT 1: INITIAL LOAD & HYDRATION ---
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

          // Initial hydration from DB
          const initialStatuses = {};
          if (roomData.studentProgress) {
            roomData.studentProgress.forEach(prog => {
              const student = roomData.participants.find(p => p._id === prog.studentId);
              if (student && prog.results[id]) initialStatuses[student.username] = prog.results[id];
            });
          }
          setLiveStatuses(initialStatuses);

          socket.emit("join-room", { roomCode });
        }
      } catch (error) {
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
      setLiveStatuses((prev) => {
        // AC-LOCK: Don't downgrade UI if student already solved it
        if (prev[data.username] === "AC") return prev;
        // Only update UI if the submission belongs to the current problem dashboard
        if (data.problemId === id) return { ...prev, [data.username]: data.status };
        return prev;
      });
    };

    const handleStudentJoined = (student) => {
      setRoom((prev) => {
        if (!prev || prev.participants.some(p => p._id === student._id)) return prev;
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

  // Rest of Logic...
  const fetchHistory = async () => { /* ...existing fetchHistory... */ };
  const handleLogout = async () => {
    if (socket.connected) socket.disconnect();
    localStorage.removeItem("accessToken");
    await api.post("/users/logout");
    window.location.href = "/auth";
  };

  const handleCloseRoom = async () => { /* ...existing handleCloseRoom... */ };
  const handleExecution = async (type) => { /* ...existing handleExecution... */ };
  const pollJobStatus = (jobId, type) => { /* ...existing pollJobStatus... */ };
  const renderConsoleContent = () => { /* ...existing renderConsole... */ };

  if (isFetchingProblem) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center"><Spinner size="sm" label="Syncing..." /></div>;

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col font-sans text-zinc-200 overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Teacher View: Leaderboard */}
      {isHost ? (
         <div className="min-h-screen bg-[#050505] text-white p-8 font-sans relative">
            <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-6">
              <div className="flex items-center gap-6">
                <button onClick={() => navigate(`/room/${roomCode}`)} className="flex items-center gap-2 group text-zinc-500 hover:text-white transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-blue-500/50 transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Return to Room</span>
                </button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-3">
                    <span className="text-blue-400">Live Status:</span>
                    <span className="text-white">{problem?.title}</span>
                  </h1>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-red-400">Logout</Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {room?.participants?.filter(p => p._id !== currentUser?._id).map((student) => {
                const statusStr = liveStatuses[student.username] || "In Progress";
                const isAC = statusStr === "AC";
                return (
                  <div key={student._id} className={`bg-[#0a0a0a] border rounded-2xl p-6 relative transition-all ${isAC ? "border-green-500/30" : "border-zinc-800"}`}>
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
        /* Student View: IDE */
        <div className="flex-1 flex flex-col overflow-hidden">
           {/* ... existing Student Header and Split IDE JSX ... */}
        </div>
      )}
    </div>
  );
}

export default IDE;