import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Room } from "../models/room.model.js";
import { Submission } from "../models/submission.model.js";
import { createClient } from "redis";

dotenv.config({ path: "./.env" });

export const initializeSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN, credentials: true },
  });

  const subscriber = createClient({
    url: process.env.REDIS_URI || "redis://localhost:6379"
  });
  
  subscriber.connect().then(() => {
    subscriber.subscribe("job-updates", (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`job_${data.jobId}`).emit("job-verdict", data);
      } catch (err) {
        console.error("Redis Pub/Sub Parse Error:", err);
      }
    });
  }).catch(err => console.error("Redis Subscriber Error:", err));

  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (!token && socket.handshake.headers.cookie) {
        const cookies = Object.fromEntries(
          socket.handshake.headers.cookie
            .split(";")
            .map((c) => c.trim().split("=")),
        );
        token = cookies.accessToken;
      }
      if (!token) return next(new Error("Auth Error"));
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.data.userId = decoded._id;
      socket.data.username = decoded.username;
      next();
    } catch (err) {
      console.log("Socket Auth Error:", err.message);
      next(new Error("Auth Error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (user: ${socket.data.username})`);
    
    socket.on("subscribe-job", async (jobId) => {
      console.log(`[Socket] ${socket.data.username} subscribed to job_${jobId}`);
      socket.join(`job_${jobId}`);
      try {
        const submission = await Submission.findById(jobId);
        if (submission && submission.status !== "Pending") {
          console.log(`[Socket] Job ${jobId} already finished (${submission.status}), emitting immediately`);
          socket.emit("job-verdict", {
            jobId: submission._id.toString(),
            status: submission.status,
            output: submission.output
          });
        }
      } catch (err) {
        console.error("Failed to check job status on subscribe:", err);
      }
    });

    socket.on("join-room", async (data) => {
      try {
        const { roomCode, username, userId } = data;
        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        if (userId) socket.data.userId = userId;
        if (username) socket.data.username = username;

        // Try Room first, fallback to Session
        let entity = await Room.findOne({ roomCode, isActive: true }).populate(
          "candidateProgress.candidateId",
          "username"
        );
        let isSession = false;

        if (!entity) {
          const { Session } = await import("../models/session.model.js");
          // Allow joining both 'waiting' and 'active' sessions. 
          entity = await Session.findOne({ 
            sessionCode: roomCode, 
            status: { $in: ["waiting", "active"] } 
          }).populate("candidate", "username");
          isSession = true;
        }

        if (!entity) {
          console.warn(`[Socket] Room/Session not found for code: ${roomCode}`);
          return;
        }

        const isInterviewer = entity.interviewer.toString() === socket.data.userId.toString();
        socket.data.isInterviewer = isInterviewer;

        if (isInterviewer) {
          if (!isSession) {
            const allProgress = entity.candidateProgress.map((p) => ({
              username: p.candidateId?.username,
              results: Object.fromEntries(p.results),
            }));
            socket.emit("sync-entire-leaderboard", allProgress);
          }
          // Note: for 1:1 sessions we don't have a global leaderboard to sync on join yet
        } else {
          socket.to(roomCode).emit("candidate-joined", {
            _id: socket.data.userId,
            username: socket.data.username,
          });
        }
      } catch (err) {
        console.error("WebSocket Join Room Error:", err);
        socket.emit("server-error", "Failed to join room securely");
      }
    });

    socket.on("candidate-submission", async (data) => {
      const { roomCode, status, problemId, username } = data;
      try {
        let entity = await Room.findOne({ roomCode, isActive: true });
        let isSession = false;

        if (!entity) {
          const { Session } = await import("../models/session.model.js");
          entity = await Session.findOne({ 
            sessionCode: roomCode, 
            status: { $in: ["waiting", "active"] } 
          });
          isSession = true;
        }
        if (!entity) return;

        if (!isSession) {
          let progress = entity.candidateProgress.find(
            (p) => p.candidateId.toString() === socket.data.userId.toString()
          );
          if (!progress) {
            progress = { candidateId: socket.data.userId, results: new Map() };
            entity.candidateProgress.push(progress);
          }
          const currentStatusInDB = progress.results.get(problemId);
          if (currentStatusInDB !== "AC") {
            progress.results.set(problemId, status);
            entity.markModified("candidateProgress");
            await entity.save();
            io.to(roomCode).emit("leaderboard-update", { username, problemId, status });
          } else {
            io.to(roomCode).emit("leaderboard-update", { username, problemId, status: "AC" });
          }
        } else {
          // For 1:1 Session, just broadcast the status (backend persistance is in Session model if needed later)
          io.to(roomCode).emit("leaderboard-update", { username, problemId, status });
        }
      } catch (error) {
        console.error("Submission Error:", error);
      }
    });

    socket.on("interviewer-closed-room", async (roomCode) => {
      // SECURITY FIX: Only allow the actual interviewer to close the room
      if (socket.data.isInterviewer) {
        socket.to(roomCode).emit("room-closed");
      } else {
        console.warn(`[Security] Unauthorized attempt to close room ${roomCode} by ${socket.data.username}`);
      }
    });

    // CANDIDATE LEAVING LOGIC
    socket.on("disconnect", () => {
      const { roomCode, userId, username, isInterviewer } = socket.data;
      if (roomCode && userId && !isInterviewer) {
        console.log(`👤 Candidate Left: ${username} from ${roomCode}`);
        socket.to(roomCode).emit("candidate-left", { _id: userId, username });
      }
    });
  });

  return io;
};
