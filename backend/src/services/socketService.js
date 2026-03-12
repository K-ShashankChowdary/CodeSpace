import dotenv from "dotenv";
import { Server } from "socket.io"; 
import jwt from "jsonwebtoken";
import { Room } from "../models/room.model.js";

dotenv.config({ path: "./.env" });

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

    // Authentication Middleware
    io.use((socket, next) => {
        try {
            // 1. Check Auth Payload (LocalStorage Token)
            let token = socket.handshake.auth?.token;

            // 2. Fallback to Cookies
            if (!token && socket.handshake.headers.cookie) {
                const cookies = Object.fromEntries(
                    socket.handshake.headers.cookie.split(';').map(c => c.trim().split('='))
                );
                token = cookies.accessToken;
            }

            if (!token) {
                return next(new Error("Authentication error: Token missing"));
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.data.userId = decoded._id;
            socket.data.username = decoded.username;
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid session"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`🟢 Socket connected: ${socket.id} (User: ${socket.data.username})`);

        socket.on("join-room", async (data) => {
            try {
                const rawRoomCode = typeof data === "string" ? data : data.roomCode;
                const roomCode = String(rawRoomCode).trim(); 
                const username = socket.data.username;
                const userId = socket.data.userId;

                const room = await Room.findOne({ roomCode, isActive: true });
                if (!room) return;

                const isHost = room.host.toString() === userId.toString();

                socket.join(roomCode);
                socket.data.roomCode = roomCode;
                socket.data.isHost = isHost;
                socket.data.username = username;
                socket.data.userId = userId;

                console.log(`👤 User ${username} joined room: ${roomCode}`);
                
                if (userId && !isHost) {
                    socket.to(roomCode).emit("student-joined", { _id: userId, username });
                    await Room.updateOne(
                        { roomCode, isActive: true },
                        { $addToSet: { participants: userId } }
                    );
                }
            } catch (error) {
                console.error("Join Room Error:", error);
            }
        });

        socket.on("student-submission", (data) => {
            const roomCode = String(data.roomCode).trim();
            const { username, status, problemId } = data;
            socket.to(roomCode).emit("leaderboard-update", { username, status, problemId });
        });

        socket.on("host-closed-room", async (rawRoomCode) => {
            const roomCode = String(rawRoomCode).trim();
            socket.to(roomCode).emit("room-closed");
        });

        socket.on("disconnect", async () => {
            console.log(`🔴 Socket disconnected: ${socket.id}`);
            const { roomCode, userId, isHost } = socket.data;
            if (roomCode && userId && isHost) {
                socket.to(roomCode).emit("room-closed");
                await Room.updateOne({ roomCode, isActive: true }, { isActive: false });
            }
        });
    });

    return io;
};