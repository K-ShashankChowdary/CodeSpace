import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Submission } from "../models/submission.model.js";
import { Problem } from "../models/problem.model.js";
import { redisClient } from "../redis/client.js";

/**
 * Controller: Submit Code
 * 1. Validates input.
 * 2. Fetches the problem to get the hidden input.
 * 3. Creates a 'Pending' submission in MongoDB.
 * 4. Pushes the job to the Redis 'submissions' queue.
 */
const submitCode = asyncHandler(async (req, res) => {
    const { problemId, code, language } = req.body;

    // Check for empty fields
    if ([problemId, code, language].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields (problemId, code, language) are required");
    }

    // Verify problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
        throw new ApiError(404, "Problem not found");
    }

    // Create MongoDB Record
    const submission = await Submission.create({
        problemId,
        code,
        language,
        status: "Pending"
    });

    // Prepare Redis Payload
    // We send the 'input' from the first test case for the worker to execute against
    const payload = JSON.stringify({
        jobId: submission._id.toString(),
        code,
        input: problem.testCases[0]?.input || "",
        language
    });

    // Push to Queue
    await redisClient.lPush("submissions", payload);

    // Return Success Response
    return res
        .status(202)
        .json(
            new ApiResponse(
                202, 
                { jobId: submission._id }, 
                "Submission accepted and queued"
            )
        );
});

/**
 * Controller: Get Submission Status
 * Used for polling. Fetches the latest status from MongoDB.
 */
const getSubmissionStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const submission = await Submission.findById(id);

    if (!submission) {
        throw new ApiError(404, "Submission record not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                submission, 
                "Submission status fetched successfully"
            )
        );
});

export { submitCode, getSubmissionStatus };