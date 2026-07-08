import { useState, useEffect } from "react";
import api from "../services/api";
import { socket } from "../utils/socket";

export const useWorkspaceData = (id, activeRoomCode, sessionCode, language, setCode, boilerplates, showToast, navigate, monacoEditorRef) => {
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isInterviewer, setIsInterviewer] = useState(false);
  const [problem, setProblem] = useState(null);
  const [allProblems, setAllProblems] = useState([]);
  const [isFetchingProblem, setIsFetchingProblem] = useState(true);

  // --- EFFECT 1: DATA FETCHING & CONNECTION ---
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    const fetchWorkspaceData = async () => {
      setIsFetchingProblem(true);
      try {
        let user;
        const guestToken = localStorage.getItem("guestToken");

        if (guestToken) {
          try {
            const payload = JSON.parse(atob(guestToken.split(".")[1]));
            user = { _id: null, username: payload.name, isGuest: true };
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

        const savedCode = localStorage.getItem(`codespace-${id}-${language}`);
        if (savedCode) {
          setCode(savedCode);
        } else if (problemData?.boilerplate) {
          const dbKeyMap = { cpp: "C++ 17", c: "C", python: "Python 3", java: "Java", javascript: "JavaScript" };
          setCode(problemData.boilerplate[dbKeyMap[language]] || boilerplates[language] || boilerplates["cpp"]);
        }

        if (activeRoomCode) {
          let roomData;
          const sessRes = await api.get(`/sessions/details/${activeRoomCode}`);
          const sess = sessRes.data.data;
          roomData = {
            ...sess,
            roomCode: sess.sessionCode,
            interviewer: sess.interviewer,
            problems: sess.problemIds || [],
            participants: [],
          };
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
            if (!socket.connected) socket.connect();
            const customName = sessionStorage.getItem("customDisplayName");
            socket.emit("join-room", {
              roomCode: activeRoomCode,
              username: customName ? customName : user.username,
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
  }, [id, activeRoomCode, navigate, language, setCode, boilerplates]);

  // --- EFFECT 2: ROOM NOTIFICATIONS (ALL USERS) ---
  useEffect(() => {
    if (!activeRoomCode) return;

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
          ? { ...prev, participants: prev.participants.filter((p) => p._id !== candidate._id) }
          : null
      );
    };

    const handleLeaderboardUpdate = (data) => {
      if (data.status !== "Queued" && data.status !== "Executing" && data.status !== "Idle") {
        if (data.status === "AC") {
          showToast(`🔥 ${data.username} solved a problem! (AC)`, "success");
        } else {
          showToast(`${data.username} submitted: ${data.status}`, "error");
        }
      }
    };

    const handleSyncParticipants = (participants) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, participants };
      });
    };

    socket.off("sync-entire-leaderboard");
    socket.off("leaderboard-update");
    socket.off("candidate-joined");
    socket.off("candidate-left");

    socket.on("leaderboard-update", handleLeaderboardUpdate);
    socket.on("candidate-joined", handleCandidateJoined);
    socket.on("candidate-left", handleCandidateLeft);
    socket.on("sync-participants", handleSyncParticipants);

    return () => {
      socket.off("leaderboard-update", handleLeaderboardUpdate);
      socket.off("candidate-joined", handleCandidateJoined);
      socket.off("candidate-left", handleCandidateLeft);
      socket.off("sync-participants", handleSyncParticipants);
    };
  }, [isInterviewer, activeRoomCode, id, showToast]);

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
  }, [isInterviewer, activeRoomCode, navigate, currentUser, id, showToast, monacoEditorRef]);

  return {
    room,
    setRoom,
    currentUser,
    isInterviewer,
    problem,
    allProblems,
    setAllProblems,
    isFetchingProblem
  };
};
