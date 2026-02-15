import { createClient } from "redis";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { Submission } from "../models/Submission.js";

// Setup for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Connection
mongoose.connect("mongodb://localhost:27017/codespace")
    .then(() => console.log("📦 Worker connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Redis Connection
const client = createClient();
client.on("error", (err) => console.error("❌ Redis Error:", err));

/**
 * PROCESS JOB
 * 1. Parses the job from Redis.
 * 2. Prepares temporary files for the C++ executor.
 * 3. Runs the executor and captures structured JSON output.
 * 4. Updates MongoDB with the verdict and cleans up files.
 */
async function processJob(submission) {
    let jobData;
    try {
        jobData = JSON.parse(submission);
    } catch (parseError) {
        console.error("❌ Failed to parse submission JSON:", parseError);
        return;
    }

    const { jobId, code, input } = jobData;
    const jobDir = path.join(__dirname, "../temp", jobId);

    try {
        // Create job workspace
        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir, { recursive: true });
        }

        const codePath = path.join(jobDir, "Main.cpp");
        const inputPath = path.join(jobDir, "input.txt");

        fs.writeFileSync(codePath, code);
        fs.writeFileSync(inputPath, input || "");

        const executorPath = path.join(__dirname, "../executor");

        // Execute the C++ Judge Binary
        execFile(executorPath, [codePath, inputPath], async (error, stdout, stderr) => {
            console.log(`\n--- Engine Output for ${jobId} ---`);
            
            let result;
            try {
                // Attempt to parse JSON from the C++ Engine's stdout
                result = JSON.parse(stdout.trim());
                console.log("Verdict:", result.status);
            } catch (jsonError) {
                console.error("❌ Engine output was not valid JSON. Raw output:", stdout);
                result = { 
                    status: "RE", 
                    output: stderr || "Internal Engine Crash or Timeout", 
                    time_ms: 0 
                };
            }

            try {
                // Update the persistent record in MongoDB
                await Submission.findByIdAndUpdate(jobId, {
                    status: result.status,
                    output: result.output,
                    time_ms: result.time_ms,
                });

                // Set result in Redis for fast access (Status polling)
                await client.set(`job:${jobId}`, JSON.stringify(result), { EX: 3600 });
                
                console.log(`✅ DB and Redis updated for job ${jobId}`);
            } catch (dbError) {
                console.error(`❌ Database update failed for job ${jobId}:`, dbError);
            }

            // Cleanup: Delete the temp folder and files
            fs.rm(jobDir, { recursive: true, force: true }, (err) => {
                if (err) console.error(`⚠️ Cleanup failed for ${jobId}:`, err);
            });
        });

    } catch (err) {
        console.error("❌ Worker Logic Error:", err);
        // Fallback: Update DB to RE status so the user isn't stuck on "Pending"
        await Submission.findByIdAndUpdate(jobId, { status: "RE", output: "Worker Logic Failure" });
    }
}

/**
 * WORKER LOOP
 * Blocks on the Redis queue until a new job is pushed.
 */
async function startWorker() {
    try {
        await client.connect();
        console.log("🚀 Worker Ready and listening for jobs...");

        while (true) {
            // brPop is blocking; it stays here until a job exists in 'submissions'
            const submission = await client.brPop("submissions", 0);
            if (submission) {
                await processJob(submission.element);
            }
        }
    } catch (criticalError) {
        console.error("❌ Critical Worker Failure:", criticalError);
        process.exit(1);
    }
}

startWorker();