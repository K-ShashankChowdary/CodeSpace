import { verifyJWTOrGuest } from '../../src/middlewares/guest-auth.middleware.js';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../src/utils/ApiError.js';
import { jest } from '@jest/globals';

describe('Guest Auth Middleware Unit Tests', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
        mockReq = {
            cookies: {},
            header: jest.fn().mockReturnValue(undefined)
        };
        mockRes = {};
        nextFunction = jest.fn();
        process.env.ACCESS_TOKEN_SECRET = 'test_secret';
    });

    test('Should pass ApiError(401) to next if no token provided', async () => {
        await verifyJWTOrGuest(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        const err = nextFunction.mock.calls[0][0];
        expect(err).toBeInstanceOf(ApiError);
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe("Authentication required");
    });

    test('Should pass ApiError(401) to next if token is invalid or expired', async () => {
        mockReq.header.mockReturnValue('Bearer invalid_token_123');
        
        await verifyJWTOrGuest(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalledTimes(1);
        const err = nextFunction.mock.calls[0][0];
        expect(err).toBeInstanceOf(ApiError);
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe("Invalid or expired token");
    });

    test('Should parse valid guest token and populate req.user', async () => {
        const validGuestToken = jwt.sign({
            type: "guest",
            name: "TestGuest",
            sessionCode: "CODE123",
            sessionId: "session-id"
        }, process.env.ACCESS_TOKEN_SECRET);

        mockReq.header.mockReturnValue(`Bearer ${validGuestToken}`);

        await verifyJWTOrGuest(mockReq, mockRes, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.isGuest).toBe(true);
        expect(mockReq.user.username).toBe("TestGuest");
        expect(mockReq.user.sessionCode).toBe("CODE123");
    });
});
