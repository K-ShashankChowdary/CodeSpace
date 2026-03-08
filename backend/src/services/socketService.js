import dotenv from "dotenv"
import { Server } from "socket.io";
import { Room } from "../models/room.model.js";

dotenv.config({path:"./.env"});

export const initializeSockets = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true
        }
    });

    // WebSocket events for the classroom feature
    io.on("connection", (socket) => {
        console.log(`🟢 Socket connected: ${socket.id}`);

        // student joins a classroom room by code
        socket.on("join-room", async (data) => {
            // handle both old string format and new object format for backward compatibility
            const roomCode = typeof data === "string" ? data : data.roomCode;
            const username = typeof data === "string" ? "Unknown" : data.username;
            const userId = typeof data === "string" ? null : data.userId;
            const isHost = data.isHost || false;

            socket.join(roomCode);
            socket.data.roomCode = roomCode;
            socket.data.username = username;
            socket.data.userId = userId;
            socket.data.isHost = isHost;

            console.log(`👤 User ${username} joined room: ${roomCode}`);
            
            // broadcast to others in the room
            if (userId) {
                // INSTANT REAL-TIME UPDATE: Tell teacher a student joined
                socket.to(roomCode).emit("student-joined", {
                    _id: userId,
                    username: username
                });

                // Update DB so active socket presence precisely mirrors database state
                if (!isHost) {
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

        // student finished executing code, broadcast result to the teacher
        socket.on("student-submission", (data) => {
            const { roomCode, username, status } = data;
            socket.to(roomCode).emit("leaderboard-update", { username, status });
        });

        // student explicitly leaves a room
        socket.on("leave-room", async (roomCode) => {
            console.log(`👤 User ${socket.data.username} left room: ${roomCode}`);
            socket.leave(roomCode);
            if (socket.data.userId && socket.data.roomCode === roomCode) {
                // if host explicitly leaves via the exit button, broadcast to close
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
                    // check if they have other open tabs/sockets before kicking them completely
                    const activeSockets = await io.in(roomCode).fetchSockets();
                    const hasOtherConnections = activeSockets.some(s => s.data.userId === socket.data.userId);

                    if (!hasOtherConnections) {
                        // INSTANT REAL-TIME UPDATE: Tell teacher student left
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
                socket.data.roomCode = null; // prevents double-emit on natural disconnect
            }
        });

        // host clicks close room button
        socket.on("host-closed-room", async (roomCode) => {
            console.log(`⚠️ Host closed room: ${roomCode}`);
            socket.to(roomCode).emit("room-closed");
        });

        socket.on("disconnect", async () => {
            console.log(`🔴 Socket disconnected: ${socket.id} (User: ${socket.data.username || 'Unknown'})`);
            
            if (socket.data.roomCode && socket.data.userId) {
                // 🚨 CRITICAL FIX: Only students trigger leave events on disconnect. 
                // If the teacher disconnects/refreshes, the room survives!
                if (!socket.data.isHost) {
                    // socket is already out of the room at this point, so checking io.in() works perfectly
                    const activeSockets = await io.in(socket.data.roomCode).fetchSockets();
                    const hasOtherConnections = activeSockets.some(s => s.data.userId === socket.data.userId);

                    if (!hasOtherConnections) {
                        // INSTANT REAL-TIME UPDATE: Tell teacher student disconnected
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
