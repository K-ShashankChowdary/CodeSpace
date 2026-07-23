import { jest } from '@jest/globals';
import { registerUser, loginUser, logoutUser, getCurrentUser, refreshAccessToken, oauthCallback } from '../../src/controllers/user.controller.js';
import { User } from '../../src/models/user.model.js';
import { ApiError } from '../../src/utils/ApiError.js';
import jwt from 'jsonwebtoken';

describe('User Controller Tests', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            cookies: {},
            user: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        };
        
        process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
        process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
        
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should call next with ApiError for missing fields', async () => {
            mockReq.body = { username: 'test' };
            const next = jest.fn();
            await registerUser(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should call next with ApiError for existing user', async () => {
            mockReq.body = { username: 'test', email: 'test@test.com', password: 'password' };
            jest.spyOn(User, 'findOne').mockResolvedValue({ id: 'existing' });
            const next = jest.fn();
            await registerUser(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should register successfully', async () => {
            mockReq.body = { username: 'test', email: 'test@test.com', password: 'password' };
            jest.spyOn(User, 'findOne').mockResolvedValue(null);
            
            const mockUser = {
                _id: '123',
                generateAccessToken: jest.fn().mockReturnValue('access'),
                generateRefreshToken: jest.fn().mockReturnValue('refresh'),
                save: jest.fn().mockResolvedValue(),
                toObject: jest.fn().mockReturnValue({ username: 'test' })
            };
            
            jest.spyOn(User, 'create').mockResolvedValue(mockUser);

            await registerUser(mockReq, mockRes, jest.fn());

            expect(User.create).toHaveBeenCalled();
            expect(mockRes.cookie).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ accessToken: 'access' })
            }));
        });

        it('should call next with ApiError if token generation fails', async () => {
            mockReq.body = { username: 'test', email: 'test@test.com', password: 'password' };
            jest.spyOn(User, 'findOne').mockResolvedValue(null);
            
            const mockUser = {
                _id: '123',
                generateAccessToken: jest.fn().mockImplementation(() => { throw new Error('JWT failed'); }),
                generateRefreshToken: jest.fn().mockReturnValue('refresh'),
                save: jest.fn().mockResolvedValue(),
                toObject: jest.fn().mockReturnValue({ username: 'test' })
            };
            
            jest.spyOn(User, 'create').mockResolvedValue(mockUser);

            const next = jest.fn();
            await registerUser(mockReq, mockRes, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(next.mock.calls[0][0].statusCode).toBe(500);
        });
    });

    describe('loginUser', () => {
        it('should call next with ApiError for missing username/email', async () => {
            mockReq.body = { password: 'password' };
            const next = jest.fn();
            await loginUser(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should call next with ApiError for invalid user', async () => {
            mockReq.body = { email: 'test@test.com', password: 'password' };
            jest.spyOn(User, 'findOne').mockResolvedValue(null);
            const next = jest.fn();
            await loginUser(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should call next with ApiError for invalid password', async () => {
            mockReq.body = { email: 'test@test.com', password: 'wrong' };
            const mockUser = { isPasswordCorrect: jest.fn().mockResolvedValue(false) };
            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
            const next = jest.fn();
            await loginUser(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should login successfully', async () => {
            mockReq.body = { email: 'test@test.com', password: 'password' };
            const mockUser = { 
                isPasswordCorrect: jest.fn().mockResolvedValue(true),
                generateAccessToken: jest.fn().mockReturnValue('access'),
                generateRefreshToken: jest.fn().mockReturnValue('refresh'),
                save: jest.fn().mockResolvedValue(),
                toObject: jest.fn().mockReturnValue({ username: 'test' })
            };
            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

            const next = jest.fn();
            await loginUser(mockReq, mockRes, next);
            if (next.mock.calls.length > 0) {
                console.log("LOGIN ERROR:", next.mock.calls[0][0]);
            }

            expect(mockRes.cookie).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('logoutUser', () => {
        it('should logout and clear cookies', async () => {
            mockReq.user = { _id: '123' };
            jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue();

            await logoutUser(mockReq, mockRes, jest.fn());

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('123', expect.any(Object));
            expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getCurrentUser', () => {
        it('should return req.user', async () => {
            mockReq.user = { username: 'test' };
            await getCurrentUser(mockReq, mockRes, jest.fn());
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: { username: 'test' }
            }));
        });
    });

    describe('refreshAccessToken', () => {
        it('should call next with ApiError if no refresh token', async () => {
            const next = jest.fn();
            await refreshAccessToken(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should call next with ApiError if invalid token', async () => {
            mockReq.cookies.refreshToken = 'invalid';
            jest.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('Invalid'); });
            const next = jest.fn();
            await refreshAccessToken(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should call next with ApiError if token doesn\'t match DB', async () => {
            mockReq.cookies.refreshToken = 'token';
            jest.spyOn(jwt, 'verify').mockReturnValue({ _id: '123' });
            jest.spyOn(User, 'findById').mockResolvedValue({ refreshToken: 'different' });
            
            const next = jest.fn();
            await refreshAccessToken(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should successfully refresh tokens', async () => {
            mockReq.cookies.refreshToken = 'valid';
            jest.spyOn(jwt, 'verify').mockReturnValue({ _id: '123' });
            const mockUser = {
                refreshToken: 'valid',
                generateAccessToken: jest.fn().mockReturnValue('new_access'),
                generateRefreshToken: jest.fn().mockReturnValue('new_refresh'),
                save: jest.fn().mockResolvedValue()
            };
            jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

            await refreshAccessToken(mockReq, mockRes, jest.fn());

            expect(mockRes.cookie).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('oauthCallback', () => {
        it('should redirect if no user in req', async () => {
            mockReq.user = null;
            await oauthCallback(mockReq, mockRes, jest.fn());
            expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('OAuthFailed'));
        });

        it('should issue tokens and redirect', async () => {
            const mockUser = {
                _id: '123',
                generateAccessToken: jest.fn().mockReturnValue('access'),
                generateRefreshToken: jest.fn().mockReturnValue('refresh'),
                save: jest.fn().mockResolvedValue(),
                toObject: jest.fn().mockReturnValue({ username: 'test' })
            };
            mockReq.user = mockUser;

            await oauthCallback(mockReq, mockRes, jest.fn());

            expect(mockRes.cookie).toHaveBeenCalledTimes(2);
            expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('oauth-callback?token=access'));
        });
    });
});
