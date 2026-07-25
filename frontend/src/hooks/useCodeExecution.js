import { useState, useRef, useEffect } from "react";
import api from "../services/api";
import { socket } from "../utils/socket";

export const useCodeExecution = (problemId, activeRoomCode, currentUser, isInterviewer, fetchHistory, setActiveTab) => {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);

  const lastExecutionTypeRef = useRef(null);
  const lastExecutionTimeRef = useRef(null);

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
          fetchHistory?.();
          if (activeRoomCode && currentUser) {
            if (!socket.connected) socket.connect();
            socket.emit("candidate-submission", {
              roomCode: activeRoomCode,
              username: currentUser.username,
              status: jobData.status,
              problemId: problemId,
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
      setActiveTab("description");
      setActiveTestCase(0);
    };

    const handleSyncResult = (jobData) => {
      setStatus(jobData.status);
      setOutput(jobData.output || "");
      setIsRunning(false);
      setIsSubmitting(false);
      setActiveTab("description");
    };

    socket.on("sync-execution-start", handleSyncStart);
    socket.on("sync-execution-result", handleSyncResult);

    return () => {
      socket.off("job-verdict", handleJobVerdict);
      socket.off("sync-execution-start", handleSyncStart);
      socket.off("sync-execution-result", handleSyncResult);
    };
  }, [problemId, activeRoomCode, currentUser, fetchHistory, setActiveTab]);

  const handleExecution = async (type, currentCode, language) => {
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
        problemId,
        language,
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
      setOutput(err.response?.data?.message || "Failed to connect to the execution engine.");
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  return {
    output,
    setOutput,
    status,
    setStatus,
    isRunning,
    isSubmitting,
    activeTestCase,
    setActiveTestCase,
    handleExecution
  };
};
