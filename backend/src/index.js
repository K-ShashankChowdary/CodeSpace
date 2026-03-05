import dotenv from "dotenv";
import { createServer } from "http";
import connectDB from "./db/index.js";
import { connectRedis } from "./redis/client.js";
import { app } from "./app.js";
import { initializeSockets } from "./services/socketService.js";

dotenv.config({ path: "./.env" });

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();
        
        // wrap Express in a native HTTP server so both REST and WebSockets share the same port
        const httpServer = createServer(app);

        // Initialize WebSockets
        initializeSockets(httpServer);

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