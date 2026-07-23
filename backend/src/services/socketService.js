import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Submission } from "../models/submission.model.js";
import { createClient } from "redis";

dotenv.config({ path: "./.env" });

export const initializeSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN, credentials: true },
  });
  const subscriber = createClient({
    url: process.env.REDIS_URI || "redis://localhost:6379",
    pingInterval: 10000,
    socket: {
        keepAlive: 10000
    }
  });

  subscriber.on("error", (err) => console.log("Redis Subscriber Error", err));
  
  subscriber.connect().then(() => {
    subscriber.subscribe("job-updates", (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`[Socket] Broadcasting job-verdict to job_${data.jobId} for language: ${data.language || 'unknown'}`);
        io.to(`job_${data.jobId}`).emit("job-verdict", data);
      } catch (err) {
        console.error("Redis Pub/Sub Parse Error:", err);
      }
    });
  }).catch(err => console.error("Redis Subscriber Error:", err));

  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      
      // If an explicit guest token was provided in auth, use it (and don't fallback to the cookie).
      // Otherwise, check for the httpOnly cookie for authenticated users.
      if (!token && socket.handshake.headers.cookie) {
        const cookies = Object.fromEntries(
          socket.handshake.headers.cookie
            .split(";")
            .map((c) => c.trim().split("=")),
        );
        token = cookies.accessToken;
      }
      
      if (!token) return next(new Error("Auth Error"));
      
      // Since we use the same secret for both guest and access tokens, verify works for both.
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      // If it's a guest token, decoded._id will be undefined. 
      // If it's a regular token, decoded._id will be set.
      socket.data.userId = decoded._id;
      socket.data.username = decoded.username || decoded.name; // Guest tokens use 'name' instead of 'username'
      socket.data.isGuest = decoded.type === "guest";
      
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

        const { Session } = await import("../models/session.model.js");
        const entity = await Session.findOne({ 
          sessionCode: roomCode, 
          status: { $in: ["waiting", "active"] } 
        }).populate("candidate", "username");

        if (!entity) {
          console.warn(`[Socket] Session not found for code: ${roomCode}`);
          return;
        }

        const isInterviewer = socket.data.userId 
          ? entity.interviewer.toString() === socket.data.userId.toString() 
          : false;
        socket.data.isInterviewer = isInterviewer;

        if (isInterviewer) {
          
          // Sync all currently connected candidates for the interviewer (solves the refresh issue)
          const socketsInRoom = await io.in(roomCode).fetchSockets();
          const activeParticipants = socketsInRoom
            .filter(s => s.id !== socket.id && !s.data.isInterviewer && s.data.username)
            .map(s => ({
              _id: s.data.userId || s.data.username,
              username: s.data.username
            }));
          
          socket.emit("sync-participants", activeParticipants);
        } else {
          socket.to(roomCode).emit("candidate-joined", {
            _id: socket.data.userId || socket.data.username,
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
        const { Session } = await import("../models/session.model.js");
        const entity = await Session.findOne({ 
          sessionCode: roomCode, 
          status: { $in: ["waiting", "active"] } 
        });

        if (!entity) return;

        // For 1:1 Session, just broadcast the status (backend persistance is in Session model if needed later)
        io.to(roomCode).emit("leaderboard-update", { username, problemId, status });
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

    socket.on("interviewer-changed-problem", async ({ roomCode, problemId }) => {
      if (socket.data.isInterviewer) {
        try {
          const { Session } = await import("../models/session.model.js");
          await Session.updateOne({ sessionCode: roomCode }, { activeProblem: problemId });
          socket.to(roomCode).emit("force-navigate-problem", problemId);
        } catch (error) {
          console.error("Failed to sync problem change:", error);
        }
      }
    });

    socket.on("sync-execution-start", (data) => {
      if (socket.data.roomCode) {
        socket.to(socket.data.roomCode).emit("sync-execution-start", data);
      }
    });

    socket.on("sync-execution-result", (data) => {
      if (socket.data.roomCode) {
        socket.to(socket.data.roomCode).emit("sync-execution-result", data);
      }
    });

    // RELAY MOUSE CURSORS TO ROOM
    socket.on("sync-cursor", (data) => {
      if (socket.data.roomCode) {
        socket.to(socket.data.roomCode).emit("sync-cursor", data);
      }
    });

    // RELAY LANGUAGE CHANGES
    socket.on("sync-language", (data) => {
      if (socket.data.roomCode) {
        socket.to(socket.data.roomCode).emit("sync-language", data.language);
      }
    });

    // EXPLICIT LEAVE (candidate clicks Exit Interview)
    socket.on("leave-room", (roomCode) => {
      const targetRoom = roomCode || socket.data.roomCode;
      if (targetRoom && !socket.data.isInterviewer) {
        console.log(`👤 Candidate Explicitly Left: ${socket.data.username} from ${targetRoom}`);
        socket.to(targetRoom).emit("candidate-left", { 
          _id: socket.data.userId || socket.data.username, 
          username: socket.data.username 
        });
        socket.leave(targetRoom);
        socket.data.roomCode = null;
      }
    });

    // WEBRTC SIGNALING
    socket.on("webrtc-signal", (data) => {
      if (socket.data.roomCode) {
        socket.to(socket.data.roomCode).emit("webrtc-signal", data);
      }
    });

    // CANDIDATE LEAVING LOGIC
    socket.on("disconnect", () => {
      const { roomCode, userId, username, isInterviewer } = socket.data;
      if (roomCode && !isInterviewer) {
        console.log(`👤 Candidate Left: ${username} from ${roomCode}`);
        socket.to(roomCode).emit("candidate-left", { _id: userId || username, username });
      }
    });
  });

  io.redisSubscriber = subscriber;
  return io;
};
