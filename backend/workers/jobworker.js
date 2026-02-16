import { createClient } from "redis";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { Submission } from "../src/models/submission.model.js";

// I load environment variables here because the worker runs as a standalone process
dotenv.config();

// Redis Connection
// I use a separate client for the worker to avoid conflicts with the main API
const redisClient = createClient({
    url: process.env.REDIS_URI || "redis://localhost:6379"
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

/**
 * C++ Execution Wrapper
 * I created this function to bridge the gap between Node.js and my C++ binary.
 * It executes the binary located in ../engine/executor and returns a Promise.
 */
const runCpp = (jobId, code, input) => {
    return new Promise((resolve, reject) => {
        const fileName = `${jobId}.cpp`;
        const inputName = `${jobId}.txt`;
        
        // I resolve the 'temp' directory relative to the backend root
        // This ensures I always know where the files are, regardless of where I start the worker
        const tempDir = path.resolve("temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const filePath = path.join(tempDir, fileName);
        const inputPath = path.join(tempDir, inputName);

        // I write the user's code and input to the disk so the C++ engine can read them
        fs.writeFileSync(filePath, code);
        fs.writeFileSync(inputPath, input);

        // Command Construction:
        // I point to the sibling 'engine' directory. 
        // IMPORTANT: I pass the Job ID as the argument, not the file path.
        // The C++ engine handles the path resolution logic internally.
        const command = `../engine/executor ${jobId}`;

        console.log(`Executing Job: ${jobId}`);

        exec(command, (error, stdout, stderr) => {
            // Cleanup: I delete the files immediately after execution to keep the server clean.
            // I wrap this in a try-catch to prevent crashing if the files were already deleted.
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            } catch (cleanupErr) {
                console.error("Cleanup failed:", cleanupErr);
            }

            if (error) {
                console.error(`Execution Error: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                // If the engine prints to stderr, it usually means a catastrophic failure (like a missing binary)
                console.error(`Execution Stderr: ${stderr}`);
                return reject(new Error(stderr));
            }

            // --- JSON Parsing Strategy ---
            // My C++ engine prints a clean JSON string to stdout (e.g., {"status":"AC", ...})
            // I parse this to get the structured result object.
            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (parseError) {
                console.error("Malformed JSON from Engine:", stdout);
                reject(new Error("Engine output malformed"));
            }
        });
    });
};

/**
 * Submission Processor
 * This is the core logic that orchestrates the entire flow:
 * 1. Parse the payload from Redis.
 * 2. Select the correct language runner (currently C++).
 * 3. Update the MongoDB document with the final verdict.
 */
const processSubmission = async (submissionStr) => {
    const submission = JSON.parse(submissionStr);
    console.log(`Processing ${submission.jobId}...`);

    try {
        const { jobId, code, input, language } = submission;

        let result;
        if (language === "cpp") {
            result = await runCpp(jobId, code, input);
        } else {
            // I leave this extensible for Python/Java in the future
            result = { status: "IE", output: "Language not supported yet" };
        }

        // I update the database with the Status, Output, and Execution Time.
        // This makes the result immediately available to the polling API.
        await Submission.findByIdAndUpdate(jobId, {
            status: result.status,
            output: result.output,
            // Note: Ensure your Schema has a 'timeTaken' field if you want to store this
            // timeTaken: result.time_ms 
        });

        console.log(`Job ${jobId} Completed: ${result.status}`);

    } catch (error) {
        console.error(`Job Failed: ${error}`);
        
        // Fallback: If anything crashes here, I mark the submission as an Internal Error
        // so the user isn't stuck in "Pending" forever.
        await Submission.findByIdAndUpdate(submission.jobId, {
            status: "IE", 
            output: "System Error: " + error.message
        });
    }
};

/**
 * Worker Entry Point
 * I initialize the database connections first. If they fail, I don't start the worker.
 */
const startWorker = async () => {
    try {
        await redisClient.connect();
        console.log("⚡ Worker connected to Redis.");

        await mongoose.connect(process.env.MONGODB_URI + "/codespace");
        console.log("💾 Worker connected to Mongo.");

        // I use an infinite loop with 'brPop' (Blocking Pop).
        // This is efficient because it puts the process to sleep until a job arrives,
        // rather than constantly checking (busy waiting).
        while (true) {
            try {
                const submission = await redisClient.brPop("submissions", 0);
                // @ts-ignore
                await processSubmission(submission.element);
            } catch (err) {
                console.error("Error processing submission:", err);
            }
        }
    } catch (err) {
        console.error("Worker failed to start:", err);
    }
};

startWorker();