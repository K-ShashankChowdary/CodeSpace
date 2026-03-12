import dotenv from "dotenv";
import { Server } from "socket.io"; 
import jwt from "jsonwebtoken";
import { Room } from "../models/room.model.js";

dotenv.config({ path: "./.env" });

export const initializeSockets = (httpServer) => {
    const io = new Server(httpServer, {
        cors: { origin: process.env.CORS_ORIGIN, credentials: true }
    });

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
        socket.on("join-room", async (data) => {
            const { roomCode } = data;
            socket.join(roomCode);
            socket.data.roomCode = roomCode;
            
            const room = await Room.findOne({ roomCode, isActive: true });
            if (!room) return;

            const isHost = room.host.toString() === socket.data.userId.toString();
            socket.data.isHost = isHost;

            // 🚨 REFRESH FIX: When teacher joins/refreshes, send them ALL current statuses from DB
            if (isHost) {
                const allProgress = [];
                room.studentProgress.forEach(p => {
                    allProgress.push({
                        studentId: p.studentId,
                        results: Object.fromEntries(p.results) 
                    });
                });
                socket.emit("sync-entire-leaderboard", allProgress);
            } else {
                socket.to(roomCode).emit("student-joined", { 
                    _id: socket.data.userId, 
                    username: socket.data.username 
                });
            }
        });

        socket.on("student-submission", async (data) => {
            const { roomCode, status, problemId, username } = data;
            const room = await Room.findOne({ roomCode, isActive: true });
            if (!room) return;

            let progress = room.studentProgress.find(p => p.studentId.toString() === socket.data.userId.toString());
            if (!progress) {
                progress = { studentId: socket.data.userId, results: new Map() };
                room.studentProgress.push(progress);
            }

            const currentBest = progress.results.get(problemId);

            // 🚨 AC-LOCK: If they already have "AC", don't downgrade the database
            if (currentBest !== "AC") {
                progress.results.set(problemId, status);
                room.markModified('studentProgress');
                await room.save();
            }
            
            // 🚨 BROADCAST: Always emit the current BEST status to the teacher
            io.to(roomCode).emit("leaderboard-update", {
                username,
                problemId,
                status: currentBest === "AC" ? "AC" : status 
            });
        });

        socket.on("host-closed-room", async (roomCode) => {
            socket.to(roomCode).emit("room-closed");
            await Room.updateOne({ roomCode }, { isActive: false });
        });

        // 🚨 REFRESH FIX: Disconnect no longer closes the room. 
        // Only "host-closed-room" or a manual session end does.
        socket.on("disconnect", () => {
            console.log(`🔴 Disconnected: ${socket.id}`);
        });
    });

    return io;
};