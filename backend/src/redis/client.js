import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config({path:"./.env"});
// singleton Redis client - used as a job queue for code submissions
// backend pushes jobs with LPUSH, C++ worker pops them with BRPOP
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