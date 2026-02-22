import { Router } from "express";
import { getAllProblems, getProblemById } from "../controllers/problem.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Fetch all problems for the dashboard
router.route("/").get(verifyJWT, getAllProblems);

// Fetch a specific problem by its ID for the IDE workspace
router.route("/:id").get(verifyJWT, getProblemById);

export default router;