import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Session } from "../models/session.model.js";
import { Problem } from "../models/problem.model.js";
import crypto from "crypto";

dotenv.config({ path: "./.env" });

// Interviewer creates a new 1-to-1 session and gets back an invite link
const createSession = asyncHandler(async (req, res) => {
    const { problemIds } = req.body;

    if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) {
        throw new ApiError(400, "At least one problem must be selected");
    }

    // Verify all provided problem IDs exist
    const problems = await Problem.find({ _id: { $in: problemIds } }).select("_id");
    if (problems.length !== problemIds.length) {
        throw new ApiError(400, "One or more problem IDs are invalid");
    }

    // Generate a unique 6-char session code with collision retry
    let sessionCode;
    for (let attempt = 0; attempt < 5; attempt++) {
        sessionCode = crypto.randomBytes(3).toString("hex").toUpperCase();
        const existing = await Session.findOne({ sessionCode, status: { $ne: "ended" } });
        if (!existing) break;
        if (attempt === 4) throw new ApiError(500, "Failed to generate unique session code");
    }

    const session = await Session.create({
        sessionCode,
        interviewer: req.user._id,
        problemIds,
        status: "waiting",
    });

    return res.status(201).json(
        new ApiResponse(201, {
            sessionCode: session.sessionCode,
            sessionId: session._id,
            // Frontend constructs the full invite URL using this code
            inviteLink: `/join/${session.sessionCode}`,
            problemIds: session.problemIds,
        }, "Session created successfully")
    );
});

// Guest candidate joins with just a name — no account needed
const guestJoin = asyncHandler(async (req, res) => {
    const { name, sessionCode } = req.body;

    if (!name || !name.trim()) {
        throw new ApiError(400, "Name is required to join the session");
    }
    if (!sessionCode) {
        throw new ApiError(400, "Session code is required");
    }

    const session = await Session.findOne({
        sessionCode: sessionCode.trim().toUpperCase(),
    });

    if (!session) {
        throw new ApiError(404, "Session not found. Check the invite link.");
    }

    if (session.status === "ended") {
        throw new ApiError(410, "This interview session has ended.");
    }

    const candidateName = name.trim();

    // Issue a scoped guest JWT — 8h expiry, same secret as regular JWTs
    const guestToken = jwt.sign(
        {
            sessionCode: session.sessionCode,
            sessionId: session._id.toString(),
            name: candidateName,
            role: "candidate",
            type: "guest", // distinguishes from regular user JWTs
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "8h" }
    );

    // Store candidate info + mark session active
    session.candidate = { name: candidateName, guestToken };
    session.status = "active";
    session.startedAt = session.startedAt || new Date();
    await session.save();

    // Return the guest token and the first problem to navigate to
    return res.status(200).json(
        new ApiResponse(200, {
            guestToken,
            sessionCode: session.sessionCode,
            sessionId: session._id,
            candidateName,
            // Guest lands on the first problem in the session
            firstProblemId: session.problemIds[0] || null,
            problemIds: session.problemIds,
        }, "Joined session successfully")
    );
});

// Fetch session details — usable by interviewer (JWT) or guest (guest JWT)
const getSessionDetails = asyncHandler(async (req, res) => {
    const { sessionCode } = req.params;

    const session = await Session.findOne({
        sessionCode: sessionCode.toUpperCase(),
    })
        .populate("interviewer", "username email")
        .populate("problemIds", "title difficulty");

    if (!session) {
        throw new ApiError(404, "Session not found");
    }

    return res.status(200).json(
        new ApiResponse(200, session, "Session details fetched")
    );
});

// Interviewer ends the session
const closeSession = asyncHandler(async (req, res) => {
    const { sessionCode } = req.params;

    const session = await Session.findOne({
        sessionCode: sessionCode.toUpperCase(),
    });

    if (!session) {
        throw new ApiError(404, "Session not found");
    }

    if (!session.interviewer.equals(req.user._id)) {
        throw new ApiError(403, "Only the interviewer can close this session");
    }

    if (session.status === "ended") {
        throw new ApiError(400, "Session is already ended");
    }

    session.status = "ended";
    session.endedAt = new Date();
    await session.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Session closed successfully")
    );
});

export { createSession, guestJoin, getSessionDetails, closeSession };
