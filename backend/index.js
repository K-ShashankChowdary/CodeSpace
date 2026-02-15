import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { createClient } from "redis";
import asyncHandler from "./middlewares/asyncHandler.js";
import { Problem } from "./models/Problem.js";
import { Submission } from "./models/Submission.js";

const app = express();
app.use(express.json());
app.use(cors());

// --- INITIALIZATION ---

// Initialize Redis Client
const redisClient = createClient();
redisClient.on("error", (err) => console.error("Redis Connection Error", err));

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/codespace")
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.error("Database connection failed", err));

// --- ROUTES ---

/**
 * Route: Create a new problem
 * Description: Populates the database with coding challenges and hidden test cases.
 */
app.post("/problems", asyncHandler(async (req, res) => {
    const { title, description, difficulty, testCases } = req.body;
    
    const problem = await Problem.create({
        title,
        description,
        difficulty,
        testCases
    });

    res.status(201).json(problem);
}));

/**
 * Route: Submit code for a problem
 * Logic: 
 * 1. Checks if the problem exists.
 * 2. Creates a record in the database with status "Pending".
 * 3. Uses the MongoDB ObjectID as the JobID for the worker.
 * 4. Pushes the job to the Redis queue for the Execution Engine.
 */
app.post("/submit", asyncHandler(async (req, res) => {
    const { problemId, code, language } = req.body;

    // Validate Input
    if (!problemId || !code || !language) {
        return res.status(400).json({ error: "Missing required fields: problemId, code, or language" });
    }

    // Check if Problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
        return res.status(404).json({ error: "Problem not found" });
    }

    // Extract the primary test case for execution
    const input = problem.testCases[0]?.input || "";

    // 1. Create Submission record in DB
    const submission = await Submission.create({
        problemId,
        code,
        language,
        status: "Pending"
    });

    // 2. Prepare payload for Redis
    const jobId = submission._id.toString();
    const payload = JSON.stringify({
        jobId,
        code,
        input,
        language
    });

    // 3. Push to Redis "submissions" queue
    await redisClient.lPush("submissions", payload);

    res.status(202).json({ 
        jobId, 
        message: "Submission accepted and queued for execution" 
    });
}));

/**
 * Route: Get submission status
 * Logic: Fetches the verdict from MongoDB. Since the worker updates the DB directly,
 * this route provides the most accurate state.
 */
app.get("/status/:id", asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id)
        .populate("problemId", "title"); // Optional: Include problem title

    if (!submission) {
        return res.status(404).json({ error: "Submission record not found" });
    }

    res.json(submission);
}));

/**
 * Route: List all problems
 * Description: Useful for the frontend dashboard.
 */
app.get("/problems", asyncHandler(async (req, res) => {
    const problems = await Problem.find({}, "title difficulty");
    res.json(problems);
}));

// --- ERROR HANDLING ---

// Global Error Middleware
app.use((err, req, res, next) => {
    console.error("🔥 Global Error Handler:", err.stack);
    res.status(err.status || 500).json({ 
        error: err.message || "Internal Server Error" 
    });
});

// --- SERVER START ---

const start = async () => {
    try {
        await redisClient.connect();
        console.log("✅ Redis connected successfully");
        
        app.listen(5000, () => {
            console.log("🚀 Main Backend API running on port 5000");
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err);
        process.exit(1);
    }
};

start();