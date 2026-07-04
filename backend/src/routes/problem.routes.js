import { Router } from "express";
import { getAllProblems, getProblemById, createCustomProblem } from "../controllers/problem.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyJWTOrGuest } from "../middlewares/guestAuth.middleware.js";

const router = Router();

router.route("/")
    .get(verifyJWT, getAllProblems)    // lightweight list for the Dashboard
    .post(verifyJWT, createCustomProblem); // create custom problem

router.route("/:id").get(verifyJWTOrGuest, getProblemById); // full details for the IDE

export default router;