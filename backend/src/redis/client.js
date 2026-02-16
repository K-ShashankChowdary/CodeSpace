import { createClient } from "redis";

/**
 * Redis Client Singleton
 * We create the client here and export it to be used across the app.
 * This prevents opening multiple unnecessary connections.
 */
const redisClient = createClient({
    url: process.env.REDIS_URI || "redis://localhost:6379"
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log("⚡ Redis Connected!");
    }
};

export { redisClient, connectRedis };