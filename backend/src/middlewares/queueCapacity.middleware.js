import { redisClient } from "../redis/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const checkQueueCapacity = asyncHandler(async (req, res, next) => {
    // If Redis is not connected, fail-open to not block executions
    if (!redisClient.isOpen) {
        return next();
    }

    try {
        const queueLength = await redisClient.lLen("submissions");
        
        // Default to 500 max queue size.
        const maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE || "500", 10);
        
        if (queueLength >= maxQueueSize) {
            console.warn(`[Capacity Limiter] Dropping execution request. Queue depth (${queueLength}) exceeds max (${maxQueueSize}).`);
            throw new ApiError(503, "Server is currently experiencing unusually high load. Please try again in a few moments.");
        }
        
        next();
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }
        console.error("Queue capacity check failed:", err);
        // Fail open if there's a redis issue parsing length
        next();
    }
});
