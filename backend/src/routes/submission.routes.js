import { Router } from "express";
import { submitCode, getSubmissionStatus } from "../controllers/submission.controller.js";

const router = Router();

// POST /api/v1/submissions/submit
router.route("/submit").post(submitCode);

// GET /api/v1/submissions/status/:id
router.route("/status/:id").get(getSubmissionStatus);

export default router;