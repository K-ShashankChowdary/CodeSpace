import { Router } from "express";
import {
    createSession,
    guestJoin,
    getSessionDetails,
    closeSession,
    getUserSessions,
} from "../controllers/session.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyJWTOrGuest } from "../middlewares/guest-auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createSessionSchema, guestJoinSchema } from "../validators/session.validator.js";

const router = Router();

// Interviewer creates a session (must be logged in)
router.route("/create").post(verifyJWT, validate(createSessionSchema), createSession);

// Guest joins with just a name + session code — fully public
router.route("/guest-join").post(validate(guestJoinSchema), guestJoin);

// Details accessible to both interviewer (regular JWT) and guest (guest JWT)
router.route("/details/:sessionCode").get(verifyJWTOrGuest, getSessionDetails);

// Only the interviewer can close
router.route("/close/:sessionCode").post(verifyJWT, closeSession);

// Get user's recent sessions
router.route("/me").get(verifyJWT, getUserSessions);

export default router;
