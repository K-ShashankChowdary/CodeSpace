import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyJWTOrGuest } from "../middlewares/guestAuth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerSchema, loginSchema } from "../validators/user.validator.js";

const router = Router();

// public routes
router.route("/register").post(validate(registerSchema), registerUser);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/refresh-token").post(refreshAccessToken); // no auth needed since access token may be expired

// protected routes (require valid JWT)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWTOrGuest, getCurrentUser);             // used by App.jsx to check if session is valid
router.route("/current-user").get(verifyJWTOrGuest, getCurrentUser);   // used by IDE to get username for leaderboard

export default router;
