import { Problem } from "../models/problem.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const getAllProblems = asyncHandler(async (req, res) => {
    // exclude heavy fields for the Dashboard list view
    const problems = await Problem.find({}).select("-description -testCases").lean();

    return res.status(200).json(
        new ApiResponse(200, problems, "Problems retrieved successfully")
    );
});

const getProblemById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid problem ID format");
    }

    const problem = await Problem.findById(id).lean();

    if (!problem) {
        throw new ApiError(404, "Problem not found");
    }

    // strip hidden test cases so users never see them in the IDE
    problem.testCases = problem.testCases.filter(tc => !tc.isHidden);

    return res.status(200).json(
        new ApiResponse(200, problem, "Problem retrieved successfully")
    );
});

const createCustomProblem = asyncHandler(async (req, res) => {
    const { title, description, difficulty, timeLimit, memoryLimit, testCases } = req.body;

    if ([title, description, difficulty].some(field => !field || field.trim() === "")) {
        throw new ApiError(400, "Title, description, and difficulty are required");
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
        throw new ApiError(400, "At least one test case is required");
    }

    const problem = await Problem.create({
        title,
        description,
        difficulty,
        timeLimit: timeLimit || 2000,
        memoryLimit: memoryLimit || 256,
        testCases
    });

    return res.status(201).json(
        new ApiResponse(201, problem, "Custom problem created successfully")
    );
});

export { getAllProblems, getProblemById, createCustomProblem };