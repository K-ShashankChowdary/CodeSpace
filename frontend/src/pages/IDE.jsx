import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge, { getFullStatus } from "../components/ui/StatusBadge";


const SOCKET_URL = "https://codespace-api.duckdns.org"; 

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  //force websocket
  transports: ["polling","websocket"], 
});

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

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // --- EFFECT 1: DATA FETCHING & CONNECTION ---
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

          //Convert both IDs to strings before comparing to prevent UI swapping
          const hostId = roomData.host._id.toString();
          const currentUserId = user._id.toString();
          const userIsHost = (hostId === currentUserId);
          
          setIsHost(userIsHost);

          const emitJoinRoom = () => {
            socket.emit("join-room", {
              roomCode,
              username: user.username,
              userId: user._id,
              isHost: userIsHost
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

  // --- EFFECT 2: TEACHER-ONLY NOTIFICATIONS (TOASTS) ---
  useEffect(() => {
    // 🚨 Exit if not in a room, or if the user is a student. 
    // This ensures ONLY the teacher sees the toasts.
    if (!roomCode || !isHost) return;

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

    // Attach listeners (Only happens if isHost is true)
    socket.on("student-joined", handleStudentJoined);
    socket.on("student-left", handleStudentLeft);
    socket.on("leaderboard-update", handleLeaderboardUpdate);

    // Clean up specific handlers
    return () => {
      socket.off("student-joined", handleStudentJoined);
      socket.off("student-left", handleStudentLeft);
      socket.off("leaderboard-update", handleLeaderboardUpdate);
    };
  }, [isHost, roomCode]);

  // --- EFFECT 3: STUDENT-ONLY LISTENERS ---
  useEffect(() => {
    if (isHost || !roomCode) return;

    const handleRoomClosed = () => {
      showToast("The host has closed the classroom. Exiting...", "error", 3000);
      setTimeout(() => {
        socket.disconnect();
        navigate("/");
      }, 3000);
    };

    socket.on("room-closed", handleRoomClosed);
    return () => socket.off("room-closed", handleRoomClosed);
  }, [isHost, roomCode, navigate]);

  // Sync ref for polling and auto-fetch history
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
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCloseRoom = async () => {
    if (!roomCode) {
      navigate("/");
      return;
    }
    showToast("Closing classroom for all students...", "error", 2000);
    socket.emit("host-closed-room", roomCode);
    try {
      await api.post(`/rooms/close/${roomCode}`);
    } catch (error) {
      console.error("Failed to close room:", error);
    } finally {
      setTimeout(() => {
        socket.disconnect();
        navigate("/");
      }, 2000); 
    }
  };

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
          pollingIntervalRef.current = null;
          setStatus(jobData.status);
          setOutput(jobData.output || "");
          setIsRunning(false);
          setIsSubmitting(false);

          if (type === "submit" && activeTabRef.current === "submissions") {
            fetchHistory();
          }

          if (roomCode && currentUser && type === "submit") {
            socket.emit("student-submission", {
              roomCode,
              username: currentUser.username,
              status: jobData.status,
            });
          }
        }
      } catch (error) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsRunning(false);
        setIsSubmitting(false);
      }
    }, 1500);
  };

  const handleRestoreCode = (submissionCode) => {
    if (submissionCode) {
      setCode(submissionCode);
      setActiveTab("description");
    }
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
      const overallStatus = parsedResults.every((r) => r?.status === "AC")
        ? "AC"
        : parsedResults.find((r) => r?.status !== "AC")?.status || "WA";

      return (
        <div className="flex flex-col animate-in fade-in duration-300">
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className={`text-2xl font-bold ${overallStatus === "AC" ? "text-green-500" : "text-red-500"}`}>
              {getFullStatus(overallStatus)}
            </h2>
            {overallStatus === "AC" && activeRes?.time !== undefined && (
              <span className="text-sm font-medium text-zinc-500">
                Runtime: {Math.max(...parsedResults.map((r) => r.time || 0))} ms
              </span>
            )}
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar">
            {parsedResults.map((res, i) => (
              <button
                key={i}
                onClick={() => setActiveTestCase(i)}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTestCase === i ? "bg-zinc-800 text-zinc-100" : "bg-transparent text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${res?.status === "AC" ? "bg-green-500" : "bg-red-500"}`}></div>
                Case {i + 1}
                {res?.time !== undefined && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                    activeTestCase === i ? "bg-zinc-700/50 text-zinc-300" : "bg-zinc-800/30 text-zinc-500"
                  }`}>
                    {res.time} ms
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Input</span>
              <div className="bg-zinc-900/50 rounded-lg px-4 py-3 font-mono text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-800/50">
                {activeRes?.input || "N/A"}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Output</span>
              <div className={`rounded-lg px-4 py-3 font-mono text-sm whitespace-pre-wrap ${
                activeRes?.status === "AC" ? "bg-zinc-900/50 text-zinc-300 border border-zinc-800/50" : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {activeRes?.actual || "N/A"}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Expected</span>
              <div className="bg-zinc-900/50 rounded-lg px-4 py-3 font-mono text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-800/50">
                {activeRes?.expected || "N/A"}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const isError = ["CE", "RE", "TLE", "WA"].includes(status);
    let cleanedOutput = "Output formatting failed.";

    if (typeof output === "string") {
      cleanedOutput = output.replace(/[a-f0-9]{24}(_tc\d+)?\.cpp/g, "solution.cpp");
    } else if (typeof output === "object") {
      cleanedOutput = JSON.stringify(output, null, 2);
    }

    return (
      <div className={`p-6 rounded-xl border text-sm leading-relaxed font-mono whitespace-pre-wrap ${isError ? "bg-red-500/5 text-red-400 border-red-500/20 shadow-inner" : "text-zinc-300 border-zinc-800"}`}>
        {status === "CE" && <div className="text-xs font-bold uppercase text-red-500/70 mb-3 tracking-widest">Compilation Error</div>}
        {status === "RE" && <div className="text-xs font-bold uppercase text-red-500/70 mb-3 tracking-widest">Runtime Error</div>}
        {cleanedOutput}
      </div>
    );
  };

  if (isFetchingProblem)
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <Spinner size="sm" label="Loading Workspace" />
      </div>
    );

  // ==========================================
  // --- VIEW 1: TEACHER VIEW (Leaderboard) ---
  // ==========================================
  if (isHost) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8 font-sans relative">
        {toast && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`px-6 py-3 rounded-xl shadow-2xl border text-sm font-bold tracking-wide flex items-center gap-3 ${
              toast.type === "error" ? "bg-red-500/20 border-red-500/30 text-red-200" : "bg-blue-500/20 border-blue-500/30 text-blue-200"
            }`}>
              <div className={`w-2 h-2 rounded-full ${toast.type === "error" ? "bg-red-500" : "bg-blue-500"} animate-pulse`}></div>
              {toast.message}
            </div>
          </div>
        )}
        <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Teacher Dashboard: {problem?.title}</h1>
            <p className="text-zinc-500 font-mono mt-1 flex items-center gap-2">
              Room Code: <span className="text-white font-bold bg-zinc-800 px-3 py-1 rounded-md">{roomCode}</span>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleCloseRoom}>
            Exit Classroom
          </Button>
        </header>

        <div className="bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141414] border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="p-4 font-bold">Student Name</th>
                <th className="p-4 font-bold">Live Status</th>
              </tr>
            </thead>
            <tbody>
              {room?.participants
                .filter((p) => p._id.toString() !== currentUser._id.toString())
                .map((student) => {
                  const currentStatus = liveStatuses[student.username] || "In Progress";
                  let badgeColor = "bg-zinc-800 text-zinc-400 border-zinc-700";
                  if (currentStatus === "AC") badgeColor = "bg-green-500/10 text-green-500 border-green-500/20";
                  else if (currentStatus !== "In Progress") badgeColor = "bg-red-500/10 text-red-500 border-red-500/20";

                  return (
                    <tr key={student._id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 text-sm font-medium">{student.username}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${badgeColor}`}>
                          {getFullStatus(currentStatus)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {(!room?.participants || room.participants.length <= 1) && (
                <tr>
                  <td colSpan="2" className="p-12 text-center text-zinc-500 italic">
                    <Spinner size="sm" label="Waiting for students to join..." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ==========================================
  // --- VIEW 2: STUDENT VIEW (Full IDE) ---
  // ==========================================
  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col font-sans text-zinc-200 overflow-hidden relative">
      {toast && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-3 rounded-xl shadow-2xl border text-sm font-bold tracking-wide flex items-center gap-3 ${
            toast.type === "error" ? "bg-red-500/20 border-red-500/30 text-red-200" : "bg-blue-500/20 border-blue-500/30 text-blue-200"
          }`}>
            <div className={`w-2 h-2 rounded-full ${toast.type === "error" ? "bg-red-500" : "bg-blue-500"} animate-pulse`}></div>
            {toast.message}
          </div>
        </div>
      )}
      <header className="h-14 flex justify-between items-center bg-[#0d0d0d] border-b border-zinc-800 px-6 shrink-0 z-30">
        <div className="flex items-center gap-6">
          <button onClick={() => {
            if (roomCode) {
              showToast("exiting room...", "info", 1500);
              socket.emit("leave-room", roomCode);
              setTimeout(() => navigate("/"), 1500);
              return;
            }
            navigate("/");
          }} className="text-zinc-500 hover:text-white transition-colors text-[11px] font-bold uppercase tracking-widest">
            ‹ Dashboard
          </button>
          <div className="h-4 w-px bg-zinc-800"></div>
          <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-4">
            {problem?.title || "Problem"}
            {roomCode && (
              <span className="bg-blue-500/10 text-blue-400 text-[9px] px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">
                Classroom: {roomCode}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === "AC" ? "bg-green-500" : status === "Idle" ? "bg-zinc-600" : "bg-yellow-500 animate-pulse"}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{getFullStatus(status)}</span>
          </div>
          {roomCode && !isHost && (
            <Button variant="secondary" size="sm" onClick={() => {
              showToast("exiting room...", "info", 1500);
              socket.emit("leave-room", roomCode);
              setTimeout(() => navigate("/"), 1500);
            }}>
              Exit Classroom
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Left panel: problem description / submission history */}
        <div className="w-5/12 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
          <div className="bg-[#141414] flex gap-1 shrink-0 border-b border-zinc-800/50 px-2">
            <button onClick={() => setActiveTab("description")} className={`text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-all ${activeTab === "description" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              Problem
            </button>
            <button onClick={() => setActiveTab("submissions")} className={`text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-all ${activeTab === "submissions" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              Submissions
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {activeTab === "description" ? (
              <div className="animate-in fade-in duration-300">
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap mb-10">
                  {problem?.description || "No description available."}
                </p>
                <div className="space-y-10">
                  <section>
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Constraints</h3>
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
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Examples</h3>
                    {(problem?.testCases || []).slice(0, 2).map((tc, index) => (
                      <div key={index} className="mb-6 last:mb-0">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-3">Case {index + 1}</span>
                        <div className="bg-[#050505] border border-zinc-800 rounded-xl p-5 font-mono text-sm text-zinc-300 leading-relaxed shadow-inner">
                          <span className="text-zinc-600 font-bold mr-4 select-none">Input:</span> {tc?.input || ""} <br />
                          <span className="text-zinc-600 font-bold mr-4 select-none">Output:</span> {tc?.output || ""}
                        </div>
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                {!Array.isArray(history) || history.length === 0 ? (
                  <p className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-10">No history</p>
                ) : (
                  history.map((sub, i) => (
                    <div key={i} onClick={() => handleRestoreCode(sub.code)} className="bg-[#111] border border-zinc-800 p-4 rounded-xl flex justify-between items-center hover:border-zinc-500 transition-colors cursor-pointer group">
                      <div>
                        <StatusBadge status={sub.status} />
                        <p className="text-[10px] text-zinc-500 font-mono mt-1 group-hover:text-zinc-300 transition-colors">
                          {new Date(sub.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-zinc-400 bg-black px-3 py-1 rounded-lg border border-zinc-800">{sub.timeTaken}ms</span>
                        <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold tracking-widest">Restore</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: code editor + console */}
        <div className="w-7/12 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
            <div className="bg-[#141414] px-6 py-3 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20">C++ 17</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor code={code} setCode={setCode} />
            </div>
          </div>

          <div className="h-[40%] bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden shrink-0">
            <div className="bg-[#141414] px-6 py-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Console</span>
            </div>
            <div className="flex-1 p-6 bg-[#050505] overflow-y-auto custom-scrollbar">
              {renderConsoleContent()}
            </div>
          </div>
        </div>
      </div>

      <footer className="h-14 bg-[#0d0d0d] border-t border-zinc-800 px-6 flex justify-between items-center shrink-0 z-30">
        <button className="text-[10px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Output ▴</button>
        <div className="flex items-center gap-3">
          {/* run = visible test cases only */}
          <Button variant="secondary" onClick={() => handleExecution("run")} disabled={isRunning || isSubmitting}>
            {isRunning ? "Running..." : "Run"}
          </Button>
          {/* submit = all test cases including hidden */}
          <Button variant="success" onClick={() => handleExecution("submit")} disabled={isRunning || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default IDE;