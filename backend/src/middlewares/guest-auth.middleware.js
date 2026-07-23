import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

dotenv.config({ path: "./.env" });

// Accepts EITHER a regular user JWT OR a guest JWT (type: "guest").
// Normalizes both into a consistent req.user shape for downstream use.
export const verifyJWTOrGuest = asyncHandler(async (req, _, next) => {
    // Try cookie first (regular logged-in user), then Authorization header (guest)
    const cookieToken = req.cookies?.accessToken;
    const headerToken = req.header("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
        throw new ApiError(401, "Authentication required");
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (_err) {
        throw new ApiError(401, "Invalid or expired token");
    }

    if (decoded.type === "guest") {
        // Guest token — no User document exists, build a lightweight user object
        req.user = {
            _id: null,
            username: decoded.name,
            role: "candidate",
            isGuest: true,
            sessionCode: decoded.sessionCode,
            sessionId: decoded.sessionId,
        };
    } else {
        // Regular user JWT — fetch from DB (same as verifyJWT middleware)
        const { User } = await import("../models/user.model.js");
        const user = await User.findById(decoded._id).select("-password -refreshToken");
        if (!user) throw new ApiError(401, "Invalid access token");
        req.user = user;
    }

    next();
});
