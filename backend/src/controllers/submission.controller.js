import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Submission } from "../models/submission.model.js";
import { Problem } from "../models/problem.model.js";
import { redisClient } from "../redis/client.js";
import mongoose from "mongoose";

const submitCode = asyncHandler(async (req, res) => {
    const { problemId, code, language, executionType } = req.body;

    if ([problemId, code, language].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
        throw new ApiError(404, "Problem not found");
    }

    // "run" only tests visible cases, "submit" tests all including hidden ones
    const testCasesToRun = executionType === "run" 
        ? problem.testCases.filter(tc => !tc.isHidden)
        : problem.testCases;

    // create a pending submission record, the C++ worker updates it once done
    const submission = await Submission.create({
        problemId,
        userId: req.user._id,
        code,
        language,
        status: "Pending"
    });

    // push the job onto the Redis queue for the C++ worker to pick up
    const payload = JSON.stringify({
        jobId: submission._id.toString(),
        code,
        language,
        testCases: testCasesToRun,
        timeLimit: problem.timeLimit || 2000,
        memoryLimit: problem.memoryLimit || 256
    });

    await redisClient.lPush("submissions", payload);

    // 202 = accepted but not yet processed, frontend polls for the result
    return res.status(202).json(
        new ApiResponse(202, { jobId: submission._id }, "Submission queued")
    );
});

const getSubmissionStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // frontend polls this every 1.5s until status changes from "Pending"
    const submission = await Submission.findById(id);

    if (!submission) {
        throw new ApiError(404, "Submission record not found");
    }

    return res.status(200).json(
        new ApiResponse(200, submission, "Status fetched")
    );
});

const getUserSubmissions = asyncHandler(async (req, res) => {
    const { problemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
        throw new ApiError(400, "Invalid problem ID format");
    }

    // explicit ObjectId casting to prevent string-vs-ObjectId mismatches
    const submissions = await Submission.find({
        problemId: new mongoose.Types.ObjectId(problemId),
        userId: new mongoose.Types.ObjectId(req.user._id)
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, submissions, "History fetched")
    );
});

export { submitCode, getSubmissionStatus, getUserSubmissions };