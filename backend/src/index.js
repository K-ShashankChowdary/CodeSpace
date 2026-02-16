import dotenv from "dotenv";
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
        
        // 3. Start Express Server
        const port = process.env.PORT || 8000;
        app.listen(port, () => {
            console.log(`\nServer is running at port: ${port}`);
        });
    } catch (err) {
        console.error("Critical System Failure:", err);
        process.exit(1);
    }
};

startServer();