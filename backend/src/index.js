import dotenv from "dotenv";
import { createServer } from "http"; // <-- 1. Import native HTTP module
import { Server } from "socket.io";  // <-- 2. Import Socket.io
import connectDB from "./db/index.js";
import { connectRedis } from "./redis/client.js";
import { app } from "./app.js";

// Load environment variables immediately
dotenv.config({ path: "./.env" });

const startServer = async () => {
    try {
        // 1. Connect to Database
        await connectDB();
        
        // 2. Connect to Redis Queue
        await connectRedis();
        
        // 3. Create a native HTTP server wrapping the Express app
        const httpServer = createServer(app);

        // 4. Initialize Socket.io on that HTTP server
        const io = new Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN,
                credentials: true
            }
        });

        // 5. Setup the WebSocket event listeners for the Classroom
        io.on("connection", (socket) => {
            console.log(`🟢 Socket connected: ${socket.id}`);

            // When a user opens the IDE with ?room=CODE
            socket.on("join-room", (roomCode) => {
                socket.join(roomCode);
                console.log(`👤 User joined room: ${roomCode}`);
            });

            // When a student gets a result from the C++ worker
            socket.on("student-submission", (data) => {
                const { roomCode, username, status } = data;
                // Broadcast this update to the teacher in that specific room
                socket.to(roomCode).emit("leaderboard-update", { username, status });
            });

            socket.on("disconnect", () => {
                console.log(`🔴 Socket disconnected: ${socket.id}`);
            });
        });

        // 6. Start the httpServer (NOT app.listen)
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