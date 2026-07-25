import dotenv from "dotenv";
import { createServer } from "http";
import mongoose from "mongoose";
import { z } from "zod";
import connectDB from "./db/index.js";
import { connectRedis, redisClient } from "./redis/client.js";
import { app } from "./app.js";
import { initializeSockets } from "./services/socketService.js";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";

dotenv.config({ path: "./.env" });

// Strict Environment Variable Validation
const envSchema = z.object({
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    PORT: z.string().optional(),
    REDIS_URI: z.string().optional(),
});

try {
    envSchema.parse(process.env);
} catch (error) {
    console.error("❌ Invalid environment variables:", error.errors);
    process.exit(1);
}

// Unhandled Exception & Rejection Trapping
process.on("uncaughtException", (err) => {
    console.error("💥 UNCAUGHT EXCEPTION! Shutting down...", err);
    process.exit(1);
});

process.on("unhandledRejection", (err) => {
    console.error("💥 UNHANDLED REJECTION! Shutting down...", err);
    process.exit(1);
});

let httpServer;
let io;
let wss;

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();
        
        // wrap Express in a native HTTP server so both REST and WebSockets share the same port
        httpServer = createServer(app);

        // Initialize WebSockets (Socket.io for chat/execution/rooms)
        io = initializeSockets(httpServer);

        // Initialize native WebSocket server for Yjs (CRDT collaborative editor)
        wss = new WebSocketServer({ noServer: true });
        
        httpServer.on("upgrade", (request, socket, head) => {
            if (request.url.startsWith("/yjs")) {
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit("connection", ws, request);
                });
            }
            // Socket.io handles its own upgrade process internally for other routes.
        });

        wss.on("connection", (ws, req) => {
            // Document name is extracted from the URL, e.g. /yjs/ROOM_CODE
            const docName = req.url.slice(1).split('/')[1] || 'default-room';
            setupWSConnection(ws, req, { docName });
        });

        const port = process.env.PORT || 8000;
        httpServer.listen(port, "0.0.0.0", () => {
            console.log(`\n⚙️ Server & WebSockets running at port: ${port}`);
        });
    } catch (err) {
        console.error("Critical System Failure:", err);
        process.exit(1);
    }
};

startServer();

// Graceful Server Shutdown
const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    // Failsafe timeout: if shutdown takes longer than 10 seconds, forcefully exit
    const failsafe = setTimeout(() => {
        console.error("Forcefully shutting down due to timeout...");
        process.exit(1);
    }, 10000);

    try {
        if (wss) {
            console.log("Closing Yjs WebSockets...");
            for (const ws of wss.clients) {
                ws.terminate();
            }
            wss.close();
        }

        if (io) {
            console.log("Closing Socket.io connections...");
            if (io.redisSubscriber) {
                await io.redisSubscriber.quit();
            }
            io.close();
        }

        if (httpServer) {
            httpServer.close(() => console.log("HTTP server closed."));
        }
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
        
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log("Redis connection closed.");
        }
        
        clearTimeout(failsafe);
        process.exit(0);
    } catch (err) {
        console.error("Error during shutdown:", err);
        clearTimeout(failsafe);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));