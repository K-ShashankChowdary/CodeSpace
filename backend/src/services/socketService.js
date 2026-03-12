import dotenv from "dotenv"
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Room } from "../models/room.model.js";

dotenv.config({path:"./.env"});

export const initializeSockets = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000,   
        pingInterval: 25000
    });

    //Socket Authentication Middleware
    io.use((socket, next) => {
        try {
            // Parse cookies from the handshake headers
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) return next(new Error("Authentication error: No cookies found"));

            const cookies = Object.fromEntries(
                cookieHeader.split(';').map(c => c.trim().split('='))
            );

            const token = cookies.accessToken;
            if (!token) return next(new Error("Authentication error: Token missing"));

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.data.userId = decoded._id;
            socket.data.username = decoded.username;
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid session"));
        }
    });
    io.on("connection", (socket) => {
        console.log(`🟢 Socket connected: ${socket.id}`);

        socket.on("join-room", async (data) => {
            const rawRoomCode = typeof data === "string" ? data : data.roomCode;
            
            const roomCode = String(rawRoomCode).trim(); 
            
            const username = socket.data.username;
            const userId = socket.data.userId;

            // Fetch room to verify host
            const room = await Room.findOne({ roomCode, isActive: true });
            if (!room) return;

            // 🚨 SECURITY FIX 6: Server-side host verification
            // Don't trust the client's 'isHost' flag.
            const isHost = room.host.toString() === userId.toString();

            // 1. Join the Socket.io memory room
            socket.join(roomCode);
            
            socket.data.roomCode = roomCode;
            socket.data.username = username;
            socket.data.userId = userId;
            socket.data.isHost = isHost;

            console.log(`👤 User ${username} (Host: ${isHost}) joined room: ${roomCode}`);
            
            if (userId) {
                // FIX 3: ONLY emit student-joined if the person joining is NOT the host
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
            const { username, status, problemId } = data;
            socket.to(roomCode).emit("leaderboard-update", { username, status, problemId });
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
            
            const { roomCode, userId, isHost } = socket.data;

            if (roomCode && userId) {
                if (isHost) {
                    // 🚨 FIX 4: Handle Host ungraceful disconnection
                    console.log(`⚠️ Host disconnected unexpectedly from room: ${roomCode}`);
                    socket.to(roomCode).emit("room-closed");
                    try {
                        await Room.updateOne(
                            { roomCode, isActive: true },
                            { isActive: false }
                        );
                    } catch (err) {
                        console.error("DB Update Error on Host Disconnect:", err);
                    }
                } else {
                    const activeSockets = await io.in(roomCode).fetchSockets();
                    const hasOtherConnections = activeSockets.some(s => s.data.userId === userId);

                    if (!hasOtherConnections) {
                        socket.to(roomCode).emit("student-left", {
                            _id: userId,
                            username: socket.data.username
                        });

                        try {
                            await Room.updateOne(
                                { roomCode, isActive: true },
                                { $pull: { participants: userId } }
                            );
                        } catch (err) {
                            console.error("DB Update Error on Student Disconnect:", err);
                        }
                    }
                }
            }
        });
    });

    return io;
};