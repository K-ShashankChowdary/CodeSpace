import { Router } from "express";
import passport from "passport";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  oauthCallback,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyJWTOrGuest } from "../middlewares/guest-auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerSchema, loginSchema } from "../validators/user.validator.js";

const router = Router();

// public routes
router.route("/register").post(validate(registerSchema), registerUser);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/refresh-token").post(refreshAccessToken); // no auth needed since access token may be expired

// OAuth routes
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth" }),
  oauthCallback
);

router.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/auth" }),
  oauthCallback
);

// protected routes (require valid JWT)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWTOrGuest, getCurrentUser);             // used by App.jsx to check if session is valid
router.route("/current-user").get(verifyJWTOrGuest, getCurrentUser);   // used by IDE to get username for leaderboard

export default router;
