import { Problem } from "../models/problem.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getAllProblems = asyncHandler(async (req, res) => {
    // exclude heavy fields for the Dashboard list view
    const problems = await Problem.find({}).select("-description -testCases").lean();

    return res.status(200).json(
        new ApiResponse(200, problems, "Problems retrieved successfully")
    );
});

const getProblemById = asyncHandler(async (req, res) => {
    const { id } = req.params;
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

export { getAllProblems, getProblemById };