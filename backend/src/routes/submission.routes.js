import { Router } from "express";
import { 
    submitCode, 
    getSubmissionStatus, 
    getUserSubmissions 
} from "../controllers/submission.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// all submission routes require authentication
router.use(verifyJWT);

router.route("/submit").post(submitCode);                  // queues code for execution
router.route("/status/:id").get(getSubmissionStatus);      // frontend polls this until result is ready
router.route("/history/:problemId").get(getUserSubmissions); // past submissions for a specific problem

export default router;