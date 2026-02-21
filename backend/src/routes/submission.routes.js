import { Router } from "express";
import { submitCode, getSubmissionStatus } from "../controllers/submission.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// I apply the verifyJWT middleware to block unauthenticated code execution requests
router.route("/submit").post(verifyJWT, submitCode);

// I apply the verifyJWT middleware to ensure only authenticated users can poll execution results
router.route("/status/:id").get(verifyJWT, getSubmissionStatus);

export default router;