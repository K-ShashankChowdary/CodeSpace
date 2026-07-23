import { jest } from '@jest/globals';
import { submitCode, getSubmissionStatus, getUserSubmissions } from '../../src/controllers/submission.controller.js';
import { Submission } from '../../src/models/submission.model.js';
import { Problem } from '../../src/models/problem.model.js';
import { redisClient } from '../../src/redis/client.js';
import { ApiError } from '../../src/utils/ApiError.js';
import mongoose from 'mongoose';

describe('Submission Controller Tests', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            user: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('submitCode', () => {
        it('should call next with ApiError if problemId is invalid', async () => {
            mockReq.body = { problemId: 'invalid', code: 'print()', language: 'python', executionType: 'run' };
            const next = jest.fn();
            await submitCode(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should call next with ApiError if fields are missing', async () => {
            mockReq.body = { problemId: new mongoose.Types.ObjectId().toString(), code: '', language: 'python', executionType: 'run' };
            const next = jest.fn();
            await submitCode(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should call next with ApiError if problem not found', async () => {
            const validId = new mongoose.Types.ObjectId().toString();
            mockReq.body = { problemId: validId, code: 'print()', language: 'python', executionType: 'run' };
            jest.spyOn(Problem, 'findById').mockResolvedValue(null);
            
            const next = jest.fn();
            await submitCode(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should successfully submit code and push to Redis', async () => {
            const validId = new mongoose.Types.ObjectId().toString();
            mockReq.body = { problemId: validId, code: 'print()', language: 'python', executionType: 'run' };
            mockReq.user = { _id: 'user123' };

            const mockProblem = { _id: validId, testCases: [{ isHidden: false }, { isHidden: true }] };
            const mockSubmission = { _id: new mongoose.Types.ObjectId() };

            jest.spyOn(Problem, 'findById').mockResolvedValue(mockProblem);
            jest.spyOn(Submission, 'create').mockResolvedValue(mockSubmission);
            jest.spyOn(redisClient, 'lPush').mockResolvedValue(1);

            const next = jest.fn();
            await submitCode(mockReq, mockRes, next);

            if (next.mock.calls.length > 0) {
                console.log("NEXT WAS CALLED WITH:", next.mock.calls[0][0]);
            }

            expect(Problem.findById).toHaveBeenCalledWith(validId);
            expect(Submission.create).toHaveBeenCalled();
            expect(redisClient.lPush).toHaveBeenCalledWith('submissions', expect.any(String));
            expect(mockRes.status).toHaveBeenCalledWith(202);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ jobId: mockSubmission._id })
            }));
        });

        it('should successfully submit code with executionType submit as a guest user', async () => {
            const validId = new mongoose.Types.ObjectId().toString();
            mockReq.body = { problemId: validId, code: 'print()', language: 'python', executionType: 'submit' };
            mockReq.user = { sessionId: 'session123' };

            const mockProblem = { _id: validId, testCases: [{ isHidden: false }, { isHidden: true }] };
            const mockSubmission = { _id: new mongoose.Types.ObjectId() };

            jest.spyOn(Problem, 'findById').mockResolvedValue(mockProblem);
            jest.spyOn(Submission, 'create').mockResolvedValue(mockSubmission);
            jest.spyOn(redisClient, 'lPush').mockResolvedValue(1);

            const next = jest.fn();
            await submitCode(mockReq, mockRes, next);

            expect(Submission.create).toHaveBeenCalledWith(expect.objectContaining({
                sessionId: 'session123',
                userId: undefined
            }));
            
            const payload = JSON.parse(redisClient.lPush.mock.calls[0][1]);
            expect(payload.testCases.length).toBe(2);
            
            expect(mockRes.status).toHaveBeenCalledWith(202);
        });
    });

    describe('getSubmissionStatus', () => {
        it('should call next with ApiError if not found', async () => {
            mockReq.params.id = new mongoose.Types.ObjectId().toString();
            jest.spyOn(Submission, 'findById').mockResolvedValue(null);

            const next = jest.fn();
            await getSubmissionStatus(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should block IDOR attempt to view another users submission', async () => {
            mockReq.params.id = new mongoose.Types.ObjectId().toString();
            mockReq.user = { _id: 'hacker', sessionId: 'hacker-session' };
            jest.spyOn(Submission, 'findById').mockResolvedValue({ 
                userId: { toString: () => 'victim' },
                sessionId: { toString: () => 'victim-session' }
            });

            const next = jest.fn();
            await getSubmissionStatus(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should return submission status for owner', async () => {
            mockReq.params.id = new mongoose.Types.ObjectId().toString();
            mockReq.user = { _id: 'user123' };
            jest.spyOn(Submission, 'findById').mockResolvedValue({ 
                userId: { toString: () => 'user123' }, 
                status: 'Accepted' 
            });

            await getSubmissionStatus(mockReq, mockRes, jest.fn());

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'Accepted' })
            }));
        });
    });

    describe('getUserSubmissions', () => {
        it('should call next with ApiError on invalid problemId', async () => {
            mockReq.params.problemId = 'invalid';
            const next = jest.fn();
            await getUserSubmissions(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should fetch user submissions', async () => {
            const validId = new mongoose.Types.ObjectId().toString();
            const validUserId = new mongoose.Types.ObjectId().toString();
            mockReq.params.problemId = validId;
            mockReq.user = { _id: validUserId };

            const mockSubmissions = [{ id: 'sub1' }];
            jest.spyOn(Submission, 'find').mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSubmissions)
            });

            const next = jest.fn();
            await getUserSubmissions(mockReq, mockRes, next);

            expect(next).not.toHaveBeenCalled();
            expect(Submission.find).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockSubmissions
            }));
        });

        it('should fetch guest submissions using sessionId', async () => {
            const validId = new mongoose.Types.ObjectId().toString();
            mockReq.params.problemId = validId;
            mockReq.user = { sessionId: 'session-123' };

            const mockSubmissions = [{ id: 'sub2' }];
            jest.spyOn(Submission, 'find').mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSubmissions)
            });

            const next = jest.fn();
            await getUserSubmissions(mockReq, mockRes, next);

            expect(next).not.toHaveBeenCalled();
            expect(Submission.find).toHaveBeenCalledWith(expect.objectContaining({
                sessionId: 'session-123'
            }));
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockSubmissions
            }));
        });
    });
});
