import { slidingWindowRateLimiter } from '../../src/middlewares/rateLimit.middleware.js';
import { redisClient } from '../../src/redis/client.js';
import { ApiError } from '../../src/utils/ApiError.js';
import { jest } from '@jest/globals';

describe('Rate Limit Middleware Unit Tests', () => {
    let mockReq;
    let mockRes;
    let nextFunction;
    let mockExec;

    beforeEach(() => {
        mockReq = {
            user: { _id: 'test_user_id' },
            ip: '127.0.0.1'
        };
        mockRes = {};
        nextFunction = jest.fn();

        // Setup the Redis multi() chain
        mockExec = jest.fn();
        const multiMock = {
            zRemRangeByScore: jest.fn().mockReturnThis(),
            zCard: jest.fn().mockReturnThis(),
            zAdd: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: mockExec
        };
        
        jest.spyOn(redisClient, 'isOpen', 'get').mockReturnValue(true);
        jest.spyOn(redisClient, 'multi').mockReturnValue(multiMock);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Should call next() if under rate limit', async () => {
        // exec() returns an array where replies[1] is the zCard result
        mockExec.mockResolvedValue([null, 5, null, null]);

        await slidingWindowRateLimiter(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(nextFunction).toHaveBeenCalledWith();
    });

    test('Should throw ApiError(429) if at or above limit', async () => {
        mockExec.mockResolvedValue([null, 10, null, null]);

        await slidingWindowRateLimiter(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        const err = nextFunction.mock.calls[0][0];
        expect(err).toBeInstanceOf(ApiError);
        expect(err.statusCode).toBe(429);
        expect(err.message).toContain('too quickly');
    });

    test('Should bypass rate limiter (fail-open) if Redis client is not open', async () => {
        jest.spyOn(redisClient, 'isOpen', 'get').mockReturnValue(false);
        
        await slidingWindowRateLimiter(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(redisClient.multi).not.toHaveBeenCalled();
    });

    test('Should catch unexpected redis errors and fail-open', async () => {
        mockExec.mockRejectedValue(new Error('Redis connection lost'));

        await slidingWindowRateLimiter(mockReq, mockRes, nextFunction);
        
        // It catches the error and still calls next() to not drop the request if Redis goes down
        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(nextFunction).toHaveBeenCalledWith();
    });
});
