import { Router } from "express";
import { 
    submitCode, 
    getSubmissionStatus, 
    getUserSubmissions 
} from "../controllers/submission.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Applying JWT verification to all routes here
router.use(verifyJWT);

router.route("/submit").post(submitCode);
router.route("/status/:id").get(getSubmissionStatus);
router.route("/history/:problemId").get(getUserSubmissions); 

export default router;