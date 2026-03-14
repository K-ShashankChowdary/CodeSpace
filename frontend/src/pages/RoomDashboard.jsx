import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import Toast from "../components/ui/Toast";
import { socket } from "../utils/socket";
import {
  LogOut,
  LayoutGrid,
  Users,
  Play,
  Info as InfoIcon,
} from "lucide-react";

function RoomDashboard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    if (duration) {
      setTimeout(() => setToast(null), duration);
    }
  };

  const handleLogout = async () => {
    try {
      if (socket.connected) socket.disconnect();
      localStorage.removeItem("accessToken");
      await api.post("/users/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Failed to logout. Please try again.", "error");
    }
  };

  const handleCloseRoom = async () => {
    if (!roomCode) return;
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

  const handleExitRoom = async () => {
    if (!roomCode) return;
    showToast("Exiting classroom...", "info", 1500);
    try {
      await api.post(`/rooms/leave/${roomCode}`);
    } catch (error) {
      console.error("Failed to leave room:", error);
    } finally {
      setTimeout(() => {
        socket.disconnect();
        navigate("/");
      }, 1500);
    }
  };

  useEffect(() => {
    //REFRESH FIX: Re-connect socket if it died on refresh
    if (!socket.connected) {
      socket.connect();
    }

    const fetchRoomData = async () => {
      try {
        const [userRes, roomRes] = await Promise.all([
          api.get("/users/current-user"),
          api.get(`/rooms/details/${roomCode}`),
        ]);

        const user = userRes.data.data;
        const roomData = roomRes.data.data;

        setCurrentUser(user);
        setRoom(roomData);

        const userIsHost = roomData.host._id.toString() === user._id.toString();
        setIsHost(userIsHost);

        // Helper to emit join
        const emitJoin = () => {
          socket.emit("join-room", {
            roomCode,
            username: user.username,
            userId: user._id,
            isHost: userIsHost,
          });
        };

        // If socket connects later
        socket.on("connect", emitJoin);

        // If already connected (most common)
        if (socket.connected) {
          emitJoin();
        }
      } catch (err) {
        console.error("Room Details Error:", err);
        setError(
          err.response?.data?.message || "Failed to load classroom details.",
        );
      } finally {
        setLoading(false);
      }

      const handleGlobalLeaderboardUpdate = (data) => {
        if (!isHost) return; // Only notify the teacher

        if (data.status === "AC") {
          showToast(`🔥 ${data.username} got an AC!`, "success", 4000);
        } else if (data.status !== "Queued" && data.status !== "Executing") {
          showToast(`📝 ${data.username} got a ${data.status}`, "error", 4000);
        }
      };

      // Add this RIGHT BEFORE your socket.on() calls in the useEffect
      socket.off("leaderboard-update");
      socket.off("student-joined");
      socket.off("student-left");

      // Then attach them normally
      socket.on("leaderboard-update", handleLeaderboardUpdate);
      socket.on("student-joined", handleStudentJoined);
      socket.on("student-left", handleStudentLeft);

      socket.on("leaderboard-update", handleGlobalLeaderboardUpdate);

      return () => {
        socket.off("connect");
        socket.off("student-joined", handleStudentJoined);
        socket.off("student-left", handleStudentLeft);
        socket.off("room-closed", handleRoomClosed);
        socket.off("leaderboard-update", handleGlobalLeaderboardUpdate); // Clean up
      };
    };

    fetchRoomData();

    // Live Listeners
    const handleStudentJoined = (student) => {
      showToast(`Student joined: ${student.username}`, "info");
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.participants.some((p) => p._id === student._id)) return prev;
        return { ...prev, participants: [...prev.participants, student] };
      });
    };

    const handleStudentLeft = (student) => {
      showToast(`Student left: ${student.username}`, "error");
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.filter(
                (p) => p._id !== student._id,
              ),
            }
          : null,
      );
    };

    const handleRoomClosed = () => {
      showToast("The host has closed the classroom. Exiting...", "error", 3000);
      setTimeout(() => {
        if (socket.connected) socket.disconnect();
        navigate("/");
      }, 3000);
    };

    socket.on("student-joined", handleStudentJoined);
    socket.on("student-left", handleStudentLeft);
    socket.on("room-closed", handleRoomClosed);

    return () => {
      socket.off("connect");
      socket.off("student-joined", handleStudentJoined);
      socket.off("student-left", handleStudentLeft);
      socket.off("room-closed", handleRoomClosed);
    };
  }, [roomCode, navigate]);

  if (loading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="md" label="Loading Classroom" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-300 gap-4 text-center p-6">
        <div className="text-red-400 bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-xl max-w-md">
          <h3 className="font-bold mb-1 italic uppercase tracking-tighter">
            Access Denied
          </h3>
          <p className="text-sm opacity-80">
            {error ||
              "This classroom is no longer active or you don't have access."}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#050505] text-zinc-300 font-sans flex overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-zinc-800/50 flex flex-col shrink-0 z-20">
        <div className="p-8 border-b border-zinc-800/40">
          <h1
            className="text-xl font-black text-white tracking-tighter flex items-center gap-3 active:scale-95 transition-transform cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
              <img
                src="/fevicon.svg"
                alt="CodeSpace"
                className="w-9 h-9 relative z-10"
              />
            </div>
            <span className="text-gradient">CodeSpace</span>
          </h1>
        </div>

        <div className="p-5 flex-1 flex flex-col gap-8">
          <div className="space-y-1.5">
            <span className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 block">
              Classroom Actions
            </span>
            {isHost ? (
              <button
                onClick={handleCloseRoom}
                className="w-full text-left px-4 py-2.5 rounded-xl text-red-500 font-bold text-sm hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 group flex justify-between items-center"
              >
                ‹ Close Classroom
              </button>
            ) : (
              <button
                onClick={handleExitRoom}
                className="w-full text-left px-4 py-2.5 rounded-xl text-zinc-500 font-bold text-sm hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-800 group flex justify-between items-center"
              >
                ‹ Exit Classroom
              </button>
            )}
            <div
              className="w-full px-4 py-2.5 mt-2 rounded-xl bg-blue-500/10 
            text-blue-400 font-bold text-sm border border-blue-500/20 inner-glow"
            >
              Classroom View
            </div>
          </div>

          <div className="space-y-4 mt-auto mb-4 bg-zinc-900/30 border border-zinc-800/40 p-5 rounded-[1.5rem] inner-glow">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">
              Live Info
            </span>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                  Host
                </span>
                <span className="text-zinc-200 text-sm font-black tracking-tight">
                  {room.host?.username || "Unknown"}
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-3 border-t border-zinc-800/50">
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                  Session Code
                </span>
                <span className="text-blue-400 font-mono font-black text-sm tracking-widest">
                  {room.roomCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800/40">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500/50 justify-start group/logout px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-md flex items-center gap-3 shadow-[0_8px_32px_rgba(239,68,68,0.1)]"
          >
            <LogOut className="w-4 h-4 group-hover/logout:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#020202] relative shadow-[inset_1px_0_0_0_rgba(255,255,255,0.03)]">
        <header className="h-24 px-12 flex items-center justify-between border-b border-zinc-800/30 bg-[#0a0a0a]/40 backdrop-blur-2xl sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic">
              Session Workspace
            </h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
          <div className="w-full bg-[#0a0a0a] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800/60 bg-[#050505] text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="col-span-12 sm:col-span-6 pl-6">Title</div>
              <div className="col-span-3 hidden sm:block text-center">
                Difficulty
              </div>
              <div className="col-span-3 hidden sm:block"></div>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {room.problems && room.problems.length > 0 ? (
                room.problems.map((problem) => (
                  <div
                    key={problem._id}
                    onClick={() =>
                      navigate(`/problem/${problem._id}?room=${room.roomCode}`)
                    }
                    className="relative grid grid-cols-12 gap-4 p-5 items-center cursor-pointer transition-all duration-300 group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 group-hover:backdrop-blur-sm transition-all duration-500" />
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-blue-500 transition-all duration-300 transform scale-y-0 group-hover:scale-y-100" />

                    <div className="col-span-12 sm:col-span-6 pl-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate tracking-tight">
                            {problem.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 hidden sm:flex items-center justify-center relative z-10">
                      <span
                        className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg border backdrop-blur-md ${
                          problem.difficulty === "Easy"
                            ? "text-green-400 border-green-500/10 bg-green-500/5"
                            : problem.difficulty === "Medium"
                              ? "text-yellow-400 border-yellow-500/10 bg-yellow-500/5"
                              : "text-red-400 border-red-500/10 bg-red-500/5"
                        }`}
                      >
                        {problem.difficulty || "Standard"}
                      </span>
                    </div>

                    <div className="col-span-3 hidden sm:flex items-center justify-end pr-6 relative z-10">
                      <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-black text-[10px] uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-105">
                        <span>Solve</span>
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <div className="text-4xl mb-4 opacity-50">📁</div>
                  <h3 className="text-lg font-bold text-zinc-300">
                    No problems assigned
                  </h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default RoomDashboard;
