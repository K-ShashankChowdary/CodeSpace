import { createClient } from "redis";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Submission } from "../src/models/submission.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const redisUrl = process.env.REDIS_URI || "redis://localhost:6379";

const redisClient = createClient({
    url: redisUrl,
    pingInterval: 10000,
    socket: {
        keepAlive: 10000
    }
});

const redisPublisher = createClient({
    url: redisUrl,
    pingInterval: 10000,
    socket: {
        keepAlive: 10000
    }
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

const runCode = async (jobId, code, input, testIndex, language) => {
    if (!/^[a-f0-9]+$/i.test(jobId)) {
        return { status: "IE", output: "Invalid job ID format" };
    }

    const uniqueId = `${jobId}_tc${testIndex}`;
    const baseTempDir = process.env.TEMP_DIR || path.resolve(__dirname, "temp");
    const jobTempDir = path.join(baseTempDir, uniqueId);

    try {
        await fs.promises.mkdir(jobTempDir, { recursive: true });
    } catch (_e) {
        // Directory may already exist
    }

    let ext = ".cpp";
    if (language === "c") ext = ".c";
    else if (language === "python") ext = ".py";
    else if (language === "java") ext = ".java";
    else if (language === "javascript") ext = ".js";

    let fileName = language === "java" ? "Main.java" : `${uniqueId}${ext}`;
    
    const filePath = path.join(jobTempDir, fileName);
    const inputPath = path.join(jobTempDir, "input.txt"); // unified input naming

    await fs.promises.writeFile(filePath, code);
    await fs.promises.writeFile(inputPath, input);

    const enginePath = path.resolve(__dirname, "../../engine/executor");
    const command = `${enginePath} ${uniqueId} "${jobTempDir}" ${language}`;

    return new Promise((resolve) => {
        exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
            try {
                await fs.promises.rm(jobTempDir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error(`[Job ${jobId}] Cleanup failed:`, cleanupErr);
            }

            if (error) return resolve({ status: "RE", output: stderr || error.message });
            
            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (_parseError) {
                resolve({ status: "IE", output: "Engine output malformed" });
            }
        });
    });
};

const processSubmission = async (submissionStr) => {
    const submission = JSON.parse(submissionStr);
    const { jobId, code, language, testCases, timeLimit = 2000 } = submission;
    
    console.log(`\n========================================`);
    console.log(`[Job ${jobId}] Processing started.`);
    console.log(`[Job ${jobId}] Total Test Cases: ${testCases.length}`);

    let finalVerdict = "AC";
    let maxTime = 0;
    const allResults = [];

    try {
        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            let result;

            if (["cpp", "c", "python", "java", "javascript"].includes(language)) {
                result = await runCode(jobId, code, tc.input, i, language);
            } else {
                result = { status: "IE", output: "Unsupported Language" };
            }

            const actual = (result.output || "").toLowerCase().split(/\r?\n/).map(l => l.trimEnd()).join("\n").trim();
            const expected = (tc.output || "").toLowerCase().split(/\r?\n/).map(l => l.trimEnd()).join("\n").trim();
            
            let currentStatus = result.status;

            if (currentStatus === "AC" && (result.time_ms || 0) > timeLimit) {
                currentStatus = "TLE";
            }
            if (currentStatus === "AC" && actual !== expected) {
                currentStatus = "WA";
            }

            console.log(`[Job ${jobId}] Case ${i + 1} Status: ${currentStatus} | Time: ${result.time_ms || 0}ms`);

            allResults.push({
                input: tc.input,
                expected: tc.output,
                actual: result.output,
                status: currentStatus,
                time: result.time_ms || 0
            });

            if (currentStatus !== "AC") {
                finalVerdict = currentStatus;
                console.log(`[Job ${jobId}] Stopped execution due to: ${currentStatus}`);
                break;
            }

            maxTime = Math.max(maxTime, result.time_ms || 0);
        }

        const jobData = {
            status: finalVerdict,
            output: JSON.stringify(allResults),
            timeTaken: maxTime
        };

        await Submission.findByIdAndUpdate(jobId, jobData);
        await redisPublisher.publish("job-updates", JSON.stringify({ jobId, ...jobData }));

        console.log(`[Job ${jobId}] Completed with Final Verdict: ${finalVerdict}`);
        console.log(`========================================\n`);

    } catch (error) {
        console.error(`[Job ${jobId}] System Crash:`, error);
        
        const errorData = {
            status: "IE",
            output: JSON.stringify([{ status: "IE", actual: error.message }])
        };

        await Submission.findByIdAndUpdate(jobId, errorData);
        await redisPublisher.publish("job-updates", JSON.stringify({ jobId, ...errorData }));
    }
};

const startWorker = async () => {
    try {
        await redisClient.connect();
        await redisPublisher.connect();
        console.log("⚡ Worker connected to Redis.");
        
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
        await mongoose.connect(`${process.env.MONGODB_URI}/codespace`);
        console.log("💾 Worker connected to Mongo.");

        while (true) {
            try {
                const submission = await redisClient.brPop("submissions", 5);
                if (submission) {
                    await processSubmission(submission.element);
                }
            } catch (err) {
                console.error("Worker Loop Error:", err);
            }
        }
    } catch (err) {
        console.error("Critical Start Failure:", err);
    }
};

startWorker();