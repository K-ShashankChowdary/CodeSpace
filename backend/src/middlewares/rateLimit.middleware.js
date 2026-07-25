import { redisClient } from "../redis/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Distributed Sliding Window Rate Limiter using Redis Sorted Sets.
 * Limits users to 10 submissions per minute.
 */
export const slidingWindowRateLimiter = asyncHandler(async (req, res, next) => {
    if (!redisClient.isOpen) {
        return next();
    }

    try {
        const identifier = req.user?._id?.toString() || req.ip;
        const key = `ratelimit:submissions:${identifier}`;
        
        const currentTimestamp = Date.now();
        const windowStart = currentTimestamp - (60 * 1000); // 1 minute window
        const limit = 10;
        
        // We use Redis transactions (MULTI/EXEC) to ensure atomicity
        const replies = await redisClient.multi()
            // 1. Remove all old requests outside the 1 minute window
            .zRemRangeByScore(key, 0, windowStart)
            // 2. Count the remaining requests in the window
            .zCard(key)
            // 3. Add the current request
            .zAdd(key, { score: currentTimestamp, value: `${currentTimestamp}-${Math.random()}` })
            // 4. Set TTL to prevent stale keys from lingering in Redis forever
            .expire(key, 60)
            .exec();

        // replies[1] is the result of zCard (number of requests BEFORE adding the current one)
        const requestCount = replies[1];

        if (requestCount >= limit) {
            console.warn(`[Rate Limiter] Blocked request from ${identifier}. Exceeded ${limit} req/min.`);
            throw new ApiError(429, "You are running code too quickly. Please wait a minute and try again.");
        }

        next();
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }
        console.error("Rate limiter check failed:", err);
        // Fail-open so a Redis crash doesn't take down the API
        next();
    }
});
