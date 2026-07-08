import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { problemService } from "../services/problem.service.js";
import { ApiError } from "../utils/ApiError.js";

const getAllProblems = asyncHandler(async (req, res) => {
    const problems = await problemService.getAllProblems();
    return res.status(200).json(new ApiResponse(200, problems, "Problems fetched successfully"));
});

const getProblemById = asyncHandler(async (req, res) => {
    const problem = await problemService.getProblemById(req.params.id);
    return res.status(200).json(new ApiResponse(200, problem, "Problem fetched successfully"));
});

const createCustomProblem = asyncHandler(async (req, res) => {
    const problem = await problemService.createCustomProblem(req.body);
    return res.status(201).json(new ApiResponse(201, problem, "Custom problem created"));
});

const deleteCustomProblem = asyncHandler(async (req, res) => {
    await problemService.deleteCustomProblem(req.params.id);
    return res.status(200).json(new ApiResponse(200, null, "Problem deleted successfully"));
});

const importFromLeetCode = asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url) throw new ApiError(400, "URL is required");
    
    const problem = await problemService.importFromLeetCode(url);
    return res.status(201).json(new ApiResponse(201, problem, "Problem imported successfully"));
});

export { getAllProblems, getProblemById, createCustomProblem, deleteCustomProblem, importFromLeetCode };