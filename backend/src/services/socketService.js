import dotenv from "dotenv";
import { Server } from "socket.io"; 
import jwt from "jsonwebtoken";
import { Room } from "../models/room.model.js";

dotenv.config({ path: "./.env" });

export const initializeSockets = (httpServer) => {
    const io = new Server(httpServer, {
        cors: { origin: process.env.CORS_ORIGIN, credentials: true }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        try {
            let token = socket.handshake.auth?.token;
            if (!token && socket.handshake.headers.cookie) {
                const cookies = Object.fromEntries(socket.handshake.headers.cookie.split(';').map(c => c.trim().split('=')));
                token = cookies.accessToken;
            }
            if (!token) return next(new Error("Auth Error"));
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.data.userId = decoded._id;
            socket.data.username = decoded.username;
            next();
        } catch (err) { next(new Error("Auth Error")); }
    });

    io.on("connection", (socket) => {
        console.log(`🟢 Socket connected: ${socket.id}`);

        socket.on("join-room", async (data) => {
            const { roomCode } = data;
            socket.join(roomCode);
            socket.data.roomCode = roomCode;
            
            const room = await Room.findOne({ roomCode, isActive: true });
            if (!room) return;

            const isHost = room.host.toString() === socket.data.userId.toString();
            socket.data.isHost = isHost;

            if (isHost) {
                // Send current board state (all problems, all students) to teacher on join/refresh
                const allProgress = room.studentProgress.map(p => ({
                    studentId: p.studentId,
                    results: Object.fromEntries(p.results) 
                }));
                socket.emit("sync-entire-leaderboard", allProgress);
            } else {
                // Notify teacher a student joined
                socket.to(roomCode).emit("student-joined", { 
                    _id: socket.data.userId, 
                    username: socket.data.username 
                });
            }
        });

        socket.on("student-submission", async (data) => {
            const { roomCode, status, problemId, username } = data;
            try {
                const room = await Room.findOne({ roomCode, isActive: true });
                if (!room) return;

                let progress = room.studentProgress.find(p => p.studentId.toString() === socket.data.userId.toString());
                if (!progress) {
                    progress = { studentId: socket.data.userId, results: new Map() };
                    room.studentProgress.push(progress);
                }

                const currentStatusInDB = progress.results.get(problemId);

                // 🚨 STICKY AC LOGIC:
                // If the user already has "AC" in the DB, we DO NOT update it.
                // If they have anything else (WA, RE, TLE) or NOTHING, we update it to the LATEST submission.
                if (currentStatusInDB !== "AC") {
                    progress.results.set(problemId, status);
                    room.markModified('studentProgress');
                    await room.save();
                    
                    // Broadcast the new status (WA, RE, TLE, or the new AC)
                    io.to(roomCode).emit("leaderboard-update", {
                        username,
                        problemId,
                        status: status 
                    });
                } else {
                    // If already AC, force broadcast AC to keep teacher UI in sync (ignores the new WA)
                    io.to(roomCode).emit("leaderboard-update", {
                        username,
                        problemId,
                        status: "AC" 
                    });
                }
            } catch (error) {
                console.error("Submission Error:", error);
            }
        });

        socket.on("host-closed-room", async (roomCode) => {
            socket.to(roomCode).emit("room-closed");
            await Room.updateOne({ roomCode }, { isActive: false });
        });

        socket.on("disconnect", () => {
            console.log(`🔴 Disconnected: ${socket.id}`);
        });
    });

    return io;
};