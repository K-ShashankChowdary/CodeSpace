import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// public routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken); // no auth needed since access token may be expired

// protected routes (require valid JWT)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWT, getCurrentUser);             // used by App.jsx to check if session is valid
router.route("/current-user").get(verifyJWT, getCurrentUser);   // used by IDE to get username for leaderboard

export default router;
