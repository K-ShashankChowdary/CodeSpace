import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";
import { io } from "socket.io-client";

//Initialize socket globally outside the component
const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket"]
});

function IDE() {
  //IDE STATE------------------
  const { id } = useParams();
  const [searchParams] = useSearchParams(); //Grab URL params
  const roomCode = searchParams.get("room"); //Extract room code
  const navigate = useNavigate();
  //--------------------------
  //CLASSROOM STATE ---
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState({});
  // ---------------------------

  const [problem, setProblem] = useState(null);
  const [isFetchingProblem, setIsFetchingProblem] = useState(true);
  const [activeTab, setActiveTab] = useState("description");
  const [history, setHistory] = useState([]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  const [code, setCode] = useState(
    `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n \n \treturn 0;\n}`,
  );

  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        // 1. Fetch current user (needed for username in leaderboard)
        const userRes = await axios.get(
          "http://localhost:5000/api/v1/users/current-user",
          { withCredentials: true },
        );
        const user = userRes.data.data;
        setCurrentUser(user);

        // 2. Fetch the problem details
        const probRes = await axios.get(
          `http://localhost:5000/api/v1/problems/${id}`,
          { withCredentials: true },
        );
        setProblem(probRes.data.data || null);

        // 3. If in a room, fetch room details and connect socket
        if (roomCode) {
          const roomRes = await axios.get(
            `http://localhost:5000/api/v1/rooms/details/${roomCode}`,
            { withCredentials: true },
          );
          const roomData = roomRes.data.data;
          setRoom(roomData);

          // Check if current user is the host
          if (roomData.host._id === user._id) {
            setIsHost(true);
          }

          socket.connect();
          socket.emit("join-room", roomCode);
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
      if (roomCode) socket.disconnect();
    };
  }, [id, roomCode, navigate]);

  //SOCKET LISTENER FOR TEACHER ---
  useEffect(() => {
    if (!isHost || !roomCode) return;

    socket.on("leaderboard-update", (data) => {
      console.log("📥 TEACHER RECEIVED:", data);
      setLiveStatuses((prev) => ({
        ...prev,
        [data.username]: data.status,
      }));
    });

    return () => socket.off("leaderboard-update");
  }, [isHost, roomCode]);

  useEffect(() => {
    if (activeTab === "submissions") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/v1/submissions/history/${id}`,
        { withCredentials: true },
      );
      setHistory(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      setHistory([]);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/v1/users/logout",
        {},
        { withCredentials: true },
      );
      window.location.href = "/auth";
    } catch (error) {}
  };

  const handleExecution = async (type) => {
    if (!code.trim()) return;
    type === "run" ? setIsRunning(true) : setIsSubmitting(true);

    setStatus("Queued");
    setOutput("Processing...");
    setActiveTab("description");
    setActiveTestCase(0);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/v1/submissions/submit",
        {
          problemId: id,
          language: "cpp",
          code: code,
          executionType: type,
        },
        { withCredentials: true },
      );
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
        const response = await axios.get(
          `http://localhost:5000/api/v1/submissions/status/${jobId}`,
          { withCredentials: true },
        );
        const jobData = response.data.data;

        if (
          jobData &&
          jobData.status !== "Pending" &&
          jobData.status !== "Executing"
        ) {
          clearInterval(pollingIntervalRef.current);
          setStatus(jobData.status);
          setOutput(jobData.output || "");
          setIsRunning(false);
          setIsSubmitting(false);

          if (type === "submit" && activeTab === "submissions") {
            fetchHistory();
          }

          // UPDATE REAL RESULTS TO SOCKET ---
          if (roomCode && currentUser && type === "submit") {
            console.log("STUDENT EMITTING:", {
              roomCode,
              username: currentUser.username,
              status: jobData.status,
            });

            socket.emit("student-submission", {
              roomCode,
              username: currentUser.username,
              status: jobData.status,
            });
          }
          // ----------------------------------------
        }
      } catch (error) {
        clearInterval(pollingIntervalRef.current);
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

  const getFullStatus = (statusCode) => {
    const statusMap = {
      AC: "Accepted",
      WA: "Wrong Answer",
      TLE: "Time Limit Exceeded",
      RE: "Runtime Error",
      CE: "Compilation Error",
      MLE: "Memory Limit Exceeded",
      IE: "Internal Error",
      Idle: "Idle",
      Queued: "Queued",
      Executing: "Executing",
      Pending: "Pending",
      Error: "Error",
    };
    return statusMap[statusCode] || statusCode;
  };

  // ... (Your exact renderConsoleContent function remains entirely unchanged here) ...
  const renderConsoleContent = () => {
    if (!output)
      return (
        <p className="text-sm font-mono text-zinc-500 italic mt-2">
          Run code to see output...
        </p>
      );

    let parsedResults = null;

    if (Array.isArray(output)) {
      parsedResults = output;
    } else if (typeof output === "string" && output.trim().startsWith("[")) {
      try {
        parsedResults = JSON.parse(output);
      } catch (e) {}
    }

    if (
      parsedResults &&
      Array.isArray(parsedResults) &&
      parsedResults.length > 0
    ) {
      const activeRes = parsedResults[activeTestCase] || parsedResults[0] || {};
      const overallStatus = parsedResults.every((r) => r?.status === "AC")
        ? "AC"
        : parsedResults.find((r) => r?.status !== "AC")?.status || "WA";

      return (
        <div className="flex flex-col animate-in fade-in duration-300">
          {/* Header Status & Runtime */}
          <div className="mb-6 flex items-baseline gap-4">
            <h2
              className={`text-2xl font-bold ${overallStatus === "AC" ? "text-green-500" : "text-red-500"}`}
            >
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
                  activeTestCase === i
                    ? "bg-zinc-800 text-zinc-100"
                    : "bg-transparent text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${res?.status === "AC" ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                Case {i + 1}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-500">Input</span>
              <div className="bg-zinc-900/80 rounded-lg px-4 py-3 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
                {activeRes?.input || "N/A"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-500">Output</span>
              <div
                className={`bg-zinc-900/80 rounded-lg px-4 py-3 font-mono text-sm whitespace-pre-wrap ${activeRes?.status === "AC" ? "text-zinc-300" : "text-red-400"}`}
              >
                {activeRes?.actual || "N/A"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-500">
                Expected
              </span>
              <div className="bg-zinc-900/80 rounded-lg px-4 py-3 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
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
      cleanedOutput = output.replace(/[a-f0-9]{24}\.cpp/g, "solution.cpp");
    } else if (typeof output === "object") {
      cleanedOutput = JSON.stringify(output, null, 2);
    }

    return (
      <div
        className={`p-6 rounded-xl border text-sm leading-relaxed font-mono whitespace-pre-wrap ${isError ? "bg-red-500/5 text-red-400 border-red-500/20 shadow-inner" : "text-zinc-300 border-zinc-800"}`}
      >
        {status === "CE" && (
          <div className="text-xs font-bold uppercase text-red-500/70 mb-3 tracking-widest">
            Compilation Error
          </div>
        )}
        {status === "RE" && (
          <div className="text-xs font-bold uppercase text-red-500/70 mb-3 tracking-widest">
            Runtime Error
          </div>
        )}
        {cleanedOutput}
      </div>
    );
  };

  if (isFetchingProblem)
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 text-zinc-500 font-bold text-sm uppercase tracking-widest">
        <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
        Loading Workspace
      </div>
    );

  //TEACHER VIEW
  if (isHost) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
        <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">
              Classroom: {problem?.title}
            </h1>
            <p className="text-zinc-500 font-mono mt-1 flex items-center gap-2">
              Room Code:{" "}
              <span className="text-white font-bold bg-zinc-800 px-3 py-1 rounded-md">
                {roomCode}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-white transition-colors bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800"
          >
            Exit Classroom
          </button>
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
                .filter((p) => p._id !== currentUser._id)
                .map((student) => {
                  const currentStatus =
                    liveStatuses[student.username] || "In Progress";

                  let badgeColor = "bg-zinc-800 text-zinc-400 border-zinc-700";
                  if (currentStatus === "AC")
                    badgeColor =
                      "bg-green-500/10 text-green-500 border-green-500/20";
                  else if (currentStatus !== "In Progress")
                    badgeColor = "bg-red-500/10 text-red-500 border-red-500/20";

                  return (
                    <tr
                      key={student._id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
                    >
                      <td className="p-4 text-sm font-medium">
                        {student.username}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${badgeColor}`}
                        >
                          {getFullStatus(currentStatus)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {room?.participants.length <= 1 && (
                <tr>
                  <td colSpan="2" className="p-12 text-center">
                    <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                      Waiting for students to join
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // STUDENT VIEW
  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col font-sans text-zinc-200 overflow-hidden">
      <header className="h-14 flex justify-between items-center bg-[#0d0d0d] border-b border-zinc-800 px-6 shrink-0 z-30">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/")}
            className="text-zinc-500 hover:text-white transition-colors text-[11px] font-bold uppercase tracking-widest"
          >
            ‹ Dashboard
          </button>
          <div className="h-4 w-[1px] bg-zinc-800"></div>
          <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-4">
            {problem?.title || "Problem"}
            {/* NEW: Room Badge for Students */}
            {roomCode && (
              <span className="bg-blue-500/10 text-blue-400 text-[9px] px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">
                Classroom: {roomCode}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${status === "AC" ? "bg-green-500" : status === "Idle" ? "bg-zinc-600" : "bg-yellow-500 animate-pulse"}`}
            ></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {getFullStatus(status)}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-[10px] font-bold px-3 py-1.5 rounded transition-all uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Left Panel */}
        <div className="w-5/12 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
          <div className="bg-[#141414] flex gap-1 shrink-0 border-b border-zinc-800/50 px-2">
            <button
              onClick={() => setActiveTab("description")}
              className={`text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-all ${activeTab === "description" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Problem
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-all ${activeTab === "submissions" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
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
                        <span
                          className={`text-xs font-bold uppercase tracking-widest ${sub.status === "AC" ? "text-green-500" : "text-red-500"}`}
                        >
                          {getFullStatus(sub.status)}
                        </span>
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

        {/* Right Panel */}
        <div className="w-7/12 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden">
            <div className="bg-[#141414] px-6 py-3 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20">
                C++ 17
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor code={code} setCode={setCode} />
            </div>
          </div>

          <div className="h-[40%] bg-[#0d0d0d] rounded-xl flex flex-col border border-zinc-800 shadow-xl overflow-hidden shrink-0">
            <div className="bg-[#141414] px-6 py-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Console
              </span>
            </div>
            <div className="flex-1 p-6 bg-[#050505] overflow-y-auto custom-scrollbar">
              {renderConsoleContent()}
            </div>
          </div>
        </div>
      </div>

      <footer className="h-14 bg-[#0d0d0d] border-t border-zinc-800 px-6 flex justify-between items-center shrink-0 z-30">
        <button className="text-[10px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">
          Output ▴
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExecution("run")}
            disabled={isRunning || isSubmitting}
            className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-zinc-700 disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run"}
          </button>
          <button
            onClick={() => handleExecution("submit")}
            disabled={isRunning || isSubmitting}
            className="bg-[#2db55d] hover:bg-[#26a150] active:scale-95 text-white px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-green-900/20"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default IDE;
