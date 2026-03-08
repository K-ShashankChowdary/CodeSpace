import dotenv from "dotenv"
import { Server } from "socket.io";
import { Room } from "../models/room.model.js";

dotenv.config({path:"./.env"});

export const initializeSockets = (httpServer) => {
    // 🚨 FIX 1: Vercel Proxy Stability Settings
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000,   // Keeps Vercel tunnel alive longer
        pingInterval: 25000   // Heartbeat to prevent silent drops
    });

    io.on("connection", (socket) => {
        console.log(`🟢 Socket connected: ${socket.id}`);

        socket.on("join-room", async (data) => {
            const rawRoomCode = typeof data === "string" ? data : data.roomCode;
            
            // 🚨 FIX 2: Sanitize roomCode to guarantee exact string matching
            const roomCode = String(rawRoomCode).trim(); 
            
            const username = typeof data === "string" ? "Unknown" : data.username;
            const userId = typeof data === "string" ? null : data.userId;
            const isHost = data.isHost || false;

            // 1. Join the Socket.io memory room
            socket.join(roomCode);
            
            socket.data.roomCode = roomCode;
            socket.data.username = username;
            socket.data.userId = userId;
            socket.data.isHost = isHost;

            console.log(`👤 User ${username} (Host: ${isHost}) joined room: ${roomCode}`);
            
            if (userId) {
                // 🚨 FIX 3: ONLY emit student-joined if the person joining is NOT the host
                if (!isHost) {
                    // Broadcast to everyone else in this specific roomCode
                    socket.to(roomCode).emit("student-joined", {
                        _id: userId,
                        username: username
                    });

                    // Update DB
                    try {
                        await Room.updateOne(
                            { roomCode, isActive: true },
                            { $addToSet: { participants: userId } }
                        );
                    } catch (err) {
                        console.error("DB Update Error on Join:", err);
                    }
                }
            }
        });

        socket.on("student-submission", (data) => {
            const roomCode = String(data.roomCode).trim();
            const { username, status } = data;
            socket.to(roomCode).emit("leaderboard-update", { username, status });
        });

        socket.on("leave-room", async (rawRoomCode) => {
            const roomCode = String(rawRoomCode).trim();
            console.log(`👤 User ${socket.data.username} left room: ${roomCode}`);
            
            socket.leave(roomCode);
            
            if (socket.data.userId && socket.data.roomCode === roomCode) {
                if (socket.data.isHost) {
                    socket.to(roomCode).emit("room-closed");
                    try {
                        await Room.updateOne(
                            { roomCode, isActive: true },
                            { isActive: false }
                        );
                    } catch (err) {
                        console.error("DB Update Error on Host Leave:", err);
                    }
                } else {
                    const activeSockets = await io.in(roomCode).fetchSockets();
                    const hasOtherConnections = activeSockets.some(s => s.data.userId === socket.data.userId);

                    if (!hasOtherConnections) {
                        socket.to(roomCode).emit("student-left", {
                            _id: socket.data.userId,
                            username: socket.data.username
                        });
                        
                        try {
                            await Room.updateOne(
                                { roomCode, isActive: true },
                                { $pull: { participants: socket.data.userId } }
                            );
                        } catch (err) {
                            console.error("DB Update Error on Leave:", err);
                        }
                    }
                }
                socket.data.roomCode = null; 
            }
        });

        socket.on("host-closed-room", async (rawRoomCode) => {
            const roomCode = String(rawRoomCode).trim();
            console.log(`⚠️ Host closed room: ${roomCode}`);
            socket.to(roomCode).emit("room-closed");
        });

        socket.on("disconnect", async () => {
            console.log(`🔴 Socket disconnected: ${socket.id} (User: ${socket.data.username || 'Unknown'})`);
            
            if (socket.data.roomCode && socket.data.userId) {
                if (!socket.data.isHost) {
                    const activeSockets = await io.in(socket.data.roomCode).fetchSockets();
                    const hasOtherConnections = activeSockets.some(s => s.data.userId === socket.data.userId);

                    if (!hasOtherConnections) {
                        socket.to(socket.data.roomCode).emit("student-left", {
                            _id: socket.data.userId,
                            username: socket.data.username
                        });

                        try {
                            await Room.updateOne(
                                { roomCode: socket.data.roomCode, isActive: true },
                                { $pull: { participants: socket.data.userId } }
                            );
                        } catch (err) {
                            console.error("DB Update Error on Disconnect:", err);
                        }
                    }
                }
            }
        });
    });

    return io;
};