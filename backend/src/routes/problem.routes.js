import { Router } from "express";
import { getAllProblems, getProblemById, createCustomProblem, importFromLeetCode, deleteCustomProblem } from "../controllers/problem.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyJWTOrGuest } from "../middlewares/guestAuth.middleware.js";

const router = Router();

router.route("/")
    .get(verifyJWT, getAllProblems)    // lightweight list for the Dashboard
    .post(verifyJWT, createCustomProblem); // create custom problem

router.route("/leetcode").post(verifyJWT, importFromLeetCode);

router.route("/:id")
    .get(verifyJWTOrGuest, getProblemById) // full details for the IDE
    .delete(verifyJWT, deleteCustomProblem); // delete a custom problem

export default router;