import { checkQueueCapacity } from '../../src/middlewares/queueCapacity.middleware.js';
import { redisClient } from '../../src/redis/client.js';
import { ApiError } from '../../src/utils/ApiError.js';
import { jest } from '@jest/globals';

describe('Queue Capacity Middleware Unit Tests', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
        mockReq = {};
        mockRes = {};
        nextFunction = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Should call next() if queue size is under 500', async () => {
        jest.spyOn(redisClient, 'isOpen', 'get').mockReturnValue(true);
        jest.spyOn(redisClient, 'lLen').mockResolvedValue(400);

        await checkQueueCapacity(mockReq, mockRes, nextFunction);
        
        expect(redisClient.lLen).toHaveBeenCalledWith('submissions');
        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(nextFunction).toHaveBeenCalledWith();
    });

    test('Should throw ApiError(503) if queue size is at or over 500', async () => {
        jest.spyOn(redisClient, 'isOpen', 'get').mockReturnValue(true);
        jest.spyOn(redisClient, 'lLen').mockResolvedValue(500);

        await checkQueueCapacity(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        const err = nextFunction.mock.calls[0][0];
        expect(err).toBeInstanceOf(ApiError);
        expect(err.statusCode).toBe(503);
        expect(err.message).toContain('Server is currently');
    });

    test('Should respect custom process.env.MAX_QUEUE_SIZE limit', async () => {
        process.env.MAX_QUEUE_SIZE = '100';
        jest.spyOn(redisClient, 'isOpen', 'get').mockReturnValue(true);
        jest.spyOn(redisClient, 'lLen').mockResolvedValue(150);

        await checkQueueCapacity(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        const err = nextFunction.mock.calls[0][0];
        expect(err).toBeInstanceOf(ApiError);
        expect(err.statusCode).toBe(503);
        
        delete process.env.MAX_QUEUE_SIZE; // cleanup
    });

    test('Should fail-open if Redis client is not open', async () => {
        jest.spyOn(redisClient, 'isOpen', 'get').mockReturnValue(false);
        
        await checkQueueCapacity(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(redisClient.lLen).not.toHaveBeenCalled();
    });

    test('Should catch unexpected redis errors and fail-open', async () => {
        jest.spyOn(redisClient, 'isOpen', 'get').mockReturnValue(true);
        jest.spyOn(redisClient, 'lLen').mockRejectedValue(new Error('Redis connection lost'));

        await checkQueueCapacity(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(nextFunction).toHaveBeenCalledWith();
    });
});
