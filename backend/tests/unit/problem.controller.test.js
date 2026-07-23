import { jest } from '@jest/globals';
import { getAllProblems, getProblemById, createCustomProblem, deleteCustomProblem, importFromLeetCode } from '../../src/controllers/problem.controller.js';
import { problemService } from '../../src/services/problem.service.js';
import { ApiError } from '../../src/utils/ApiError.js';

describe('Problem Controller Tests', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('getAllProblems', () => {
        it('should fetch all problems', async () => {
            const mockProblems = [{ id: '1', title: 'Two Sum' }];
            jest.spyOn(problemService, 'getAllProblems').mockResolvedValue(mockProblems);

            await getAllProblems(mockReq, mockRes, jest.fn());

            expect(problemService.getAllProblems).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockProblems
            }));
        });
    });

    describe('getProblemById', () => {
        it('should fetch a problem by ID', async () => {
            mockReq.params.id = '123';
            const mockProblem = { id: '123', title: 'Two Sum' };
            jest.spyOn(problemService, 'getProblemById').mockResolvedValue(mockProblem);

            await getProblemById(mockReq, mockRes, jest.fn());

            expect(problemService.getProblemById).toHaveBeenCalledWith('123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockProblem
            }));
        });
    });

    describe('createCustomProblem', () => {
        it('should create a custom problem', async () => {
            mockReq.body = { title: 'New Problem' };
            const mockProblem = { id: '123', title: 'New Problem' };
            jest.spyOn(problemService, 'createCustomProblem').mockResolvedValue(mockProblem);

            await createCustomProblem(mockReq, mockRes, jest.fn());

            expect(problemService.createCustomProblem).toHaveBeenCalledWith(mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockProblem
            }));
        });
    });

    describe('deleteCustomProblem', () => {
        it('should delete a custom problem', async () => {
            mockReq.params.id = '123';
            jest.spyOn(problemService, 'deleteCustomProblem').mockResolvedValue();

            await deleteCustomProblem(mockReq, mockRes, jest.fn());

            expect(problemService.deleteCustomProblem).toHaveBeenCalledWith('123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('importFromLeetCode', () => {
        it('should call next with ApiError if URL is missing', async () => {
            mockReq.body = {};
            const next = jest.fn();
            await importFromLeetCode(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });

        it('should import problem from LeetCode', async () => {
            mockReq.body = { url: 'https://leetcode.com/problems/two-sum/' };
            const mockProblem = { id: '123', title: 'Two Sum' };
            jest.spyOn(problemService, 'importFromLeetCode').mockResolvedValue(mockProblem);

            await importFromLeetCode(mockReq, mockRes, jest.fn());

            expect(problemService.importFromLeetCode).toHaveBeenCalledWith('https://leetcode.com/problems/two-sum/');
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockProblem
            }));
        });
    });
});
