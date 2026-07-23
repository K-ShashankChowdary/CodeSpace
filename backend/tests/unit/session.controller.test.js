import { jest } from '@jest/globals';
import { createSession, guestJoin, getSessionDetails, closeSession, getUserSessions } from '../../src/controllers/session.controller.js';
import { sessionService } from '../../src/services/session.service.js';

describe('Session Controller Tests', () => {
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

    describe('createSession', () => {
        it('should successfully create a session', async () => {
            mockReq.body.problemIds = ['prob1', 'prob2'];
            mockReq.user._id = 'user123';
            
            const mockSession = {
                sessionCode: 'ABCDEF',
                _id: 'session123',
                problemIds: ['prob1', 'prob2'],
                activeProblem: 'prob1'
            };
            
            jest.spyOn(sessionService, 'createSession').mockResolvedValue(mockSession);

            await createSession(mockReq, mockRes, jest.fn());

            expect(sessionService.createSession).toHaveBeenCalledWith('user123', ['prob1', 'prob2']);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ sessionCode: 'ABCDEF' })
            }));
        });
    });

    describe('guestJoin', () => {
        it('should allow a guest to join', async () => {
            mockReq.body = { name: 'Guest User', sessionCode: 'ABCDEF' };
            
            const mockResult = {
                guestToken: 'token123',
                candidateName: 'Guest User',
                session: {
                    sessionCode: 'ABCDEF',
                    _id: 'session123',
                    problemIds: ['prob1'],
                    activeProblem: 'prob1'
                }
            };
            
            jest.spyOn(sessionService, 'guestJoin').mockResolvedValue(mockResult);

            await guestJoin(mockReq, mockRes, jest.fn());

            expect(sessionService.guestJoin).toHaveBeenCalledWith('Guest User', 'ABCDEF');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ guestToken: 'token123' })
            }));
        });

        it('should fallback to first problemId if activeProblem is null', async () => {
            mockReq.body = { name: 'Guest User', sessionCode: 'ABCDEF' };
            const mockResult = {
                guestToken: 'token123',
                candidateName: 'Guest User',
                session: {
                    sessionCode: 'ABCDEF',
                    _id: 'session123',
                    problemIds: ['prob1'],
                    activeProblem: null
                }
            };
            jest.spyOn(sessionService, 'guestJoin').mockResolvedValue(mockResult);

            await guestJoin(mockReq, mockRes, jest.fn());
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ activeProblem: 'prob1' })
            }));
        });
    });

    describe('getSessionDetails', () => {
        it('should fetch session details', async () => {
            mockReq.params.sessionCode = 'ABCDEF';
            jest.spyOn(sessionService, 'getSessionDetails').mockResolvedValue({ sessionCode: 'ABCDEF' });

            await getSessionDetails(mockReq, mockRes, jest.fn());

            expect(sessionService.getSessionDetails).toHaveBeenCalledWith('ABCDEF');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('closeSession', () => {
        it('should close a session', async () => {
            mockReq.params.sessionCode = 'ABCDEF';
            mockReq.user._id = 'user123';
            jest.spyOn(sessionService, 'closeSession').mockResolvedValue();

            await closeSession(mockReq, mockRes, jest.fn());

            expect(sessionService.closeSession).toHaveBeenCalledWith('ABCDEF', 'user123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('getUserSessions', () => {
        it('should fetch user sessions', async () => {
            mockReq.user._id = 'user123';
            jest.spyOn(sessionService, 'getUserSessions').mockResolvedValue([{ sessionCode: 'ABCDEF' }]);

            await getUserSessions(mockReq, mockRes, jest.fn());

            expect(sessionService.getUserSessions).toHaveBeenCalledWith('user123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });
});
