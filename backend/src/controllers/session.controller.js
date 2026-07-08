import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sessionService } from "../services/session.service.js";

const createSession = asyncHandler(async (req, res) => {
    const { problemIds } = req.body;
    const session = await sessionService.createSession(req.user._id, problemIds);

    return res.status(201).json(
        new ApiResponse(201, {
            sessionCode: session.sessionCode,
            sessionId: session._id,
            inviteLink: `/join/${session.sessionCode}`,
            problemIds: session.problemIds,
            activeProblem: session.activeProblem,
        }, "Session created successfully")
    );
});

const guestJoin = asyncHandler(async (req, res) => {
    const { name, sessionCode } = req.body;
    const result = await sessionService.guestJoin(name, sessionCode);

    return res.status(200).json(
        new ApiResponse(200, {
            guestToken: result.guestToken,
            sessionCode: result.session.sessionCode,
            sessionId: result.session._id,
            candidateName: result.candidateName,
            activeProblem: result.session.activeProblem || result.session.problemIds[0],
            problemIds: result.session.problemIds,
        }, "Joined session successfully")
    );
});

const getSessionDetails = asyncHandler(async (req, res) => {
    const { sessionCode } = req.params;
    const session = await sessionService.getSessionDetails(sessionCode);

    return res.status(200).json(
        new ApiResponse(200, session, "Session details fetched")
    );
});

const closeSession = asyncHandler(async (req, res) => {
    const { sessionCode } = req.params;
    await sessionService.closeSession(sessionCode, req.user._id);

    return res.status(200).json(
        new ApiResponse(200, null, "Session closed and data cleaned successfully")
    );
});

const getUserSessions = asyncHandler(async (req, res) => {
    const sessions = await sessionService.getUserSessions(req.user._id);

    return res.status(200).json(
        new ApiResponse(200, sessions, "User sessions fetched successfully")
    );
});

export { createSession, guestJoin, getSessionDetails, closeSession, getUserSessions };
