import { Router } from "express";
import {
    createSession,
    guestJoin,
    getSessionDetails,
    closeSession,
} from "../controllers/session.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyJWTOrGuest } from "../middlewares/guestAuth.middleware.js";

const router = Router();

// Interviewer creates a session (must be logged in)
router.route("/create").post(verifyJWT, createSession);

// Guest joins with just a name + session code — fully public
router.route("/guest-join").post(guestJoin);

// Details accessible to both interviewer (regular JWT) and guest (guest JWT)
router.route("/details/:sessionCode").get(verifyJWTOrGuest, getSessionDetails);

// Only the interviewer can close
router.route("/close/:sessionCode").post(verifyJWT, closeSession);

export default router;
