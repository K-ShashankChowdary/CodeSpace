import { Router } from "express";
import { 
    submitCode, 
    getSubmissionStatus, 
    getUserSubmissions 
} from "../controllers/submission.controller.js";
import { verifyJWTOrGuest } from "../middlewares/guest-auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { runSubmitSchema } from "../validators/submission.validator.js";

const router = Router();

// all submission routes require authentication
router.use(verifyJWTOrGuest);

router.route("/submit").post(validate(runSubmitSchema), submitCode);                  // queues code for execution
router.route("/status/:id").get(getSubmissionStatus);      // frontend polls this until result is ready
router.route("/history/:problemId").get(getUserSubmissions); // past submissions for a specific problem

export default router;