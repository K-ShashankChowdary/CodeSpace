import dotenv from "dotenv";
import { createServer } from "http";
import connectDB from "./db/index.js";
import { connectRedis } from "./redis/client.js";
import { app } from "./app.js";
import { initializeSockets } from "./services/socketService.js";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";

dotenv.config({ path: "./.env" });

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();
        
        // wrap Express in a native HTTP server so both REST and WebSockets share the same port
        const httpServer = createServer(app);

        // Initialize WebSockets (Socket.io for chat/execution/rooms)
        initializeSockets(httpServer);

        // Initialize native WebSocket server for Yjs (CRDT collaborative editor)
        const wss = new WebSocketServer({ noServer: true });
        
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
        httpServer.listen(port, () => {
            console.log(`\n⚙️ Server & WebSockets running at port: ${port}`);
        });
    } catch (err) {
        console.error("Critical System Failure:", err);
        process.exit(1);
    }
};

startServer();