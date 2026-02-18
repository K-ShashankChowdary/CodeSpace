import { createClient } from "redis";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Submission } from "../src/models/submission.model.js";

// I need these to handle file paths reliably across different operating systems
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// I load my environment variables from the parent directory where the .env file lives
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Redis Configuration
 * I'm using the standard Redis port. The worker connects here to pull jobs from the queue.
 */
const redisClient = createClient({
    url: process.env.REDIS_URI || "redis://localhost:6379"
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

/**
 * C++ Runner Function
 * This function handles the disk I/O and triggers the C++ executor binary.
 */
const runCpp = (jobId, code, input) => {
    return new Promise((resolve, reject) => {
        const fileName = `${jobId}.cpp`;
        const inputName = `${jobId}.txt`;

        // I create a temp folder inside the workers directory to store the source and input files
        const tempDir = path.resolve(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const filePath = path.join(tempDir, fileName);
        const inputPath = path.join(tempDir, inputName);

        // Writing the user code and input to disk before execution
        fs.writeFileSync(filePath, code);
        fs.writeFileSync(inputPath, input);

        // I go up two levels to find the engine folder at the project root
        const enginePath = path.resolve(__dirname, "../../engine/executor");
        
        // Command Construction: I pass the JobID and the absolute temp path to my C++ engine
        const command = `${enginePath} ${jobId} "${tempDir}"`;

        console.log(`Executing Job: ${jobId}`);

        exec(command, (error, stdout, stderr) => {
            // I always delete the files after execution to prevent disk clutter
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
                console.error(`Execution Stderr: ${stderr}`);
                return reject(new Error(stderr));
            }

            // My C++ engine returns a JSON string which I parse here
            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (parseError) {
                console.error("Malformed JSON:", stdout);
                reject(new Error("Engine output malformed"));
            }
        });
    });
};

/**
 * Main Processing Logic
 * This function determines the verdict and updates the database.
 */
const processSubmission = async (submissionStr) => {
    const submission = JSON.parse(submissionStr);
    console.log(`Processing ${submission.jobId}...`);

    try {
        const { jobId, code, language } = submission;
        const expectedOutput = submission.expectedOutput ? submission.expectedOutput.trim() : "";
        const input = submission.input || "";

        let result;
        if (language === "cpp") {
            result = await runCpp(jobId, code, input);
        } else {
            result = { status: "IE", output: "Language not supported yet" };
        }

        // --- Result Verification ---
        // If the code ran successfully (AC), I still need to check if the output matches the answer key
        if (result.status === "AC") {
            const userOutput = result.output ? result.output.trim() : "";
            
            // I normalize line endings to prevent "invisible" mismatches between different OS environments
            const normalizedUser = userOutput.replace(/\r\n/g, "\n").trim();
            const normalizedExpected = expectedOutput.replace(/\r\n/g, "\n").trim();
            
            if (normalizedUser !== normalizedExpected) {
                result.status = "WA";
            }
        }

        // Updating the MongoDB record so the frontend can see the final verdict
        await Submission.findByIdAndUpdate(jobId, {
            status: result.status,
            output: result.output,
            timeTaken: result.time_ms || 0
        });

        console.log(`Job ${jobId} Completed: ${result.status}`);
    } catch (error) {
        console.error(`Job Failed: ${error}`);
        // If an internal crash happens, I mark it as IE so the user doesn't wait forever
        await Submission.findByIdAndUpdate(submission.jobId, {
            status: "IE",
            output: "System Error: " + error.message
        });
    }
};

/**
 * Worker Entry Point
 * This starts the infinite loop that listens for new submissions in Redis.
 */
const startWorker = async () => {
    try {
        await redisClient.connect();
        console.log("⚡ Worker connected to Redis.");

        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing in .env");
        await mongoose.connect(`${process.env.MONGODB_URI}/codespace`);
        console.log("💾 Worker connected to Mongo.");

        // Blocking Pop: This waits until there is at least one item in the 'submissions' list
        while (true) {
            try {
                const submission = await redisClient.brPop("submissions", 0);
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