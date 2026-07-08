import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Session } from "../models/session.model.js";
import { Problem } from "../models/problem.model.js";
import { Submission } from "../models/submission.model.js";
import { ApiError } from "../utils/ApiError.js";

class SessionService {
  async createSession(interviewerId, problemIds) {
    const problems = await Problem.find({ _id: { $in: problemIds } }).select("_id");
    if (problems.length !== problemIds.length) {
      throw new ApiError(400, "One or more problem IDs are invalid");
    }

    let sessionCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      sessionCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      const existing = await Session.findOne({ sessionCode, status: { $ne: "ended" } });
      if (!existing) break;
      if (attempt === 4) throw new ApiError(500, "Failed to generate unique session code");
    }

    const session = await Session.create({
      sessionCode,
      interviewer: interviewerId,
      problemIds,
      activeProblem: problemIds[0],
      status: "waiting",
    });

    return session;
  }

  async guestJoin(name, sessionCode) {
    const session = await Session.findOne({
      sessionCode: sessionCode.trim().toUpperCase(),
    });

    if (!session) throw new ApiError(404, "Session not found. Check the invite link.");
    if (session.status === "ended") throw new ApiError(410, "This interview session has ended.");

    const candidateName = name.trim();

    const guestToken = jwt.sign(
      {
        sessionCode: session.sessionCode,
        sessionId: session._id.toString(),
        name: candidateName,
        role: "candidate",
        type: "guest",
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "8h" }
    );

    session.candidate = { name: candidateName, guestToken };
    session.status = "active";
    session.startedAt = session.startedAt || new Date();
    await session.save();

    return { session, guestToken, candidateName };
  }

  async getSessionDetails(sessionCode) {
    const session = await Session.findOne({ sessionCode: sessionCode.toUpperCase() })
      .populate("interviewer", "username email")
      .populate("problemIds", "title difficulty");

    if (!session) throw new ApiError(404, "Session not found");
    return session;
  }

  async closeSession(sessionCode, interviewerId) {
    const session = await Session.findOne({ sessionCode: sessionCode.toUpperCase() });

    if (!session) throw new ApiError(404, "Session not found");
    if (!session.interviewer.equals(interviewerId)) {
      throw new ApiError(403, "Only the interviewer can close this session");
    }

    if (session.problemIds && session.problemIds.length > 0) {
      await Problem.deleteMany({
        _id: { $in: session.problemIds },
        isCustom: true
      });
    }

    await Submission.deleteMany({ sessionId: session._id.toString() });
    await session.deleteOne();
  }

  async getUserSessions(interviewerId) {
    return await Session.find({ interviewer: interviewerId })
      .populate("problemIds", "title difficulty")
      .sort({ createdAt: -1 })
      .limit(20);
  }
}

export const sessionService = new SessionService();
