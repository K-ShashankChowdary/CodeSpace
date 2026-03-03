import { Router } from "express";
import { getAllProblems, getProblemById } from "../controllers/problem.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(verifyJWT, getAllProblems);    // lightweight list for the Dashboard
router.route("/:id").get(verifyJWT, getProblemById); // full details for the IDE

export default router;