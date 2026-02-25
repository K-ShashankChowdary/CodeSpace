import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//route the POST request for user registration to the registerUser controller
router.route("/register").post(registerUser);

// route the POST request for user login to the loginUser controller
router.route("/login").post(loginUser);

// apply the verifyJWT middleware to ensure only authenticated users can access the logout route
router.route("/logout").post(verifyJWT, logoutUser);

//create a strictly protected route for the frontend to verify active sessions on initial page load
router.route("/me").get(verifyJWT, getCurrentUser);

//route to get current-user that is logged in
router.route("/current-user").get(verifyJWT, getCurrentUser);

export default router;
