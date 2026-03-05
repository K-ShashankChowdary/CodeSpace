import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./db/index.js";
import { connectRedis } from "./redis/client.js";
import { app } from "./app.js";

dotenv.config({ path: "./.env" });

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();
        
        // wrap Express in a native HTTP server so both REST and WebSockets share the same port
        const httpServer = createServer(app);

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
            socket.on("join-room", (data) => {
                // handle both old string format and new object format for backward compatibility
                const roomCode = typeof data === "string" ? data : data.roomCode;
                const username = typeof data === "string" ? "Unknown" : data.username;
                const userId = typeof data === "string" ? null : data.userId;

                socket.join(roomCode);
                socket.roomCode = roomCode;
                socket.username = username;
                socket.userId = userId;

                console.log(`👤 User ${username} joined room: ${roomCode}`);
                
                // broadcast to others in the room
                if (userId) {
                    socket.to(roomCode).emit("student-joined", {
                        _id: userId,
                        username: username
                    });
                }
            });

            // student finished executing code, broadcast result to the teacher
            socket.on("student-submission", (data) => {
                const { roomCode, username, status } = data;
                socket.to(roomCode).emit("leaderboard-update", { username, status });
            });

            // host closes the classroom
            socket.on("host-closed-room", (roomCode) => {
                console.log(`⚠️ Host closed room: ${roomCode}`);
                socket.to(roomCode).emit("room-closed");
            });

            socket.on("disconnect", () => {
                console.log(`🔴 Socket disconnected: ${socket.id} (User: ${socket.username})`);
                if (socket.roomCode && socket.userId) {
                    socket.to(socket.roomCode).emit("student-left", {
                        _id: socket.userId,
                        username: socket.username
                    });
                }
            });
        });

        const port = process.env.PORT || 8000;
        httpServer.listen(port, () => {
            console.log(`\n⚙️ Server & WebSockets running at port: ${port}`);
        });
    } catch (err) {
        console.error("Critical System Failure:", err);
        process.exit(1);
    }
};

startServer();