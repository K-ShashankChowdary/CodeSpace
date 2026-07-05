import { Problem } from "../models/problem.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const getAllProblems = asyncHandler(async (req, res) => {
    const problems = await Problem.find().select("-testCases");

    return res.status(200).json(
        new ApiResponse(200, problems, "Problems fetched successfully")
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
        testCases,
        isCustom: true
    });

    return res.status(201).json(
        new ApiResponse(201, problem, "Custom problem created successfully")
    );
});

const htmlToText = (html) => {
    if (!html) return "";
    let text = html;
    
    // First, convert HTML to plain text
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<li>/gi, '• ');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<[^>]*>?/gm, ''); // Strip all remaining tags
    
    // Decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&le;/g, '≤');
    text = text.replace(/&ge;/g, '≥');

    // Now safely slice out the Examples section, while preserving Constraints
    const exampleRegex = /Example\s*1:/i;
    const constraintRegex = /Constraints:/i;

    const exampleMatch = text.match(exampleRegex);
    const constraintMatch = text.match(constraintRegex);

    if (exampleMatch) {
        if (constraintMatch && constraintMatch.index > exampleMatch.index) {
            // Keep Description + Constraints, but skip the middle (Examples)
            const descriptionPart = text.substring(0, exampleMatch.index).trim();
            const constraintPart = text.substring(constraintMatch.index).trim();
            text = descriptionPart + "\n\n" + constraintPart;
        } else {
            // No constraints, just strip from Example 1 onwards
            text = text.substring(0, exampleMatch.index).trim();
        }
    }

    // Clean up excessive newlines (including those with spaces/tabs)
    return text.replace(/(\n\s*){2,}/g, '\n\n').trim();
};

const importFromLeetCode = asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url) {
        throw new ApiError(400, "LeetCode URL is required");
    }

    let titleSlug;
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const problemsIndex = pathParts.indexOf('problems');
        if (problemsIndex === -1 || !pathParts[problemsIndex + 1]) {
            throw new Error("Invalid URL structure");
        }
        titleSlug = pathParts[problemsIndex + 1];
    } catch (error) {
        // Fallback if they just pass the slug
        titleSlug = url.trim().replace(/\/$/, '').split('/').pop();
    }

    if (!titleSlug) {
        throw new ApiError(400, "Could not extract title slug from URL");
    }

    const query = `
        query consolePanelConfig($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                title
                difficulty
                content
                exampleTestcaseList
            }
        }
    `;

    const response = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query,
            variables: { titleSlug }
        })
    });

    const data = await response.json();
    const question = data?.data?.question;

    if (!question) {
        throw new ApiError(404, "Problem not found on LeetCode");
    }

    // Process test cases
    const testCases = [];
    if (question.exampleTestcaseList && Array.isArray(question.exampleTestcaseList)) {
        // Try to extract outputs from the content HTML
        // Format is typically: <strong>Output:</strong> [0,1]
        const outputRegex = /Output:.*?<\/strong>\s*(.*?)(?=\n|\r|<)/gi;
        const matches = [];
        let match;
        while ((match = outputRegex.exec(question.content || "")) !== null) {
            // Strip any remaining HTML tags from the output string (like <sup>, <i>, etc if present)
            matches.push(match[1].replace(/<\/?[^>]+(>|$)/g, "").trim());
        }

        question.exampleTestcaseList.forEach((tcInput, index) => {
            let rawInput = (tcInput || "").trim();
            let rawOutput = (matches[index] || "").trim();

            // Strip brackets, quotes, and commas to make it standard competitive programming input
            let cleanInput = rawInput.replace(/[\[\],"]/g, ' ').replace(/\s+/g, ' ').trim();
            let cleanOutput = rawOutput.replace(/[\[\],"]/g, ' ').replace(/\s+/g, ' ').trim();

            testCases.push({
                input: cleanInput,
                output: cleanOutput
            });
        });
    }

    return res.status(200).json(
        new ApiResponse(200, {
            title: question.title,
            difficulty: question.difficulty,
            description: htmlToText(question.content),
            testCases
        }, "LeetCode problem fetched successfully")
    );
});

const deleteCustomProblem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const problem = await Problem.findById(id);
    if (!problem) {
        throw new ApiError(404, "Problem not found");
    }
    if (!problem.isCustom) {
        throw new ApiError(403, "Cannot delete standard problems");
    }
    await problem.deleteOne();
    return res.status(200).json(new ApiResponse(200, {}, "Custom problem deleted successfully"));
});

export { getAllProblems, getProblemById, createCustomProblem, importFromLeetCode, deleteCustomProblem };