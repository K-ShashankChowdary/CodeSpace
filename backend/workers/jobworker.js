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

const runCode = async (jobId, code, testCases, language) => {
    if (!/^[a-f0-9]+$/i.test(jobId)) {
        return [{ status: "IE", output: "Invalid job ID format", time_ms: 0 }];
    }

    const uniqueId = jobId;
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

    await fs.promises.writeFile(filePath, code);
    
    // Write inputs for all test cases
    for (let i = 0; i < testCases.length; i++) {
        const inputPath = path.join(jobTempDir, `input_${i}.txt`);
        await fs.promises.writeFile(inputPath, testCases[i].input);
    }

    const enginePath = path.resolve(__dirname, "../../engine/executor");
    const command = `${enginePath} ${uniqueId} "${jobTempDir}" ${language} ${testCases.length}`;

    return new Promise((resolve) => {
        exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
            try {
                await fs.promises.rm(jobTempDir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error(`[Job ${jobId}] Cleanup failed:`, cleanupErr);
            }

            if (error && stdout.trim() === "") {
                return resolve([{ status: "RE", output: stderr || error.message, time_ms: 0 }]);
            }
            
            try {
                const result = JSON.parse(stdout.trim());
                if (!Array.isArray(result)) {
                    // Fallback if engine output single object due to early CE
                    resolve([result]);
                } else {
                    resolve(result);
                }
            } catch (_parseError) {
                resolve([{ status: "IE", output: "Engine output malformed", time_ms: 0 }]);
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
        let engineResults = [];
        if (["cpp", "c", "python", "java", "javascript"].includes(language)) {
            engineResults = await runCode(jobId, code, testCases, language);
        } else {
            engineResults = [{ status: "IE", output: "Unsupported Language", time_ms: 0 }];
        }

        // If a global error like CE occurred, engineResults might only have 1 item
        if (engineResults.length === 1 && ["CE", "IE"].includes(engineResults[0].status)) {
            finalVerdict = engineResults[0].status;
            allResults.push({
                actual: engineResults[0].output,
                status: engineResults[0].status,
                time: engineResults[0].time_ms || 0
            });
            console.log(`[Job ${jobId}] Global Error: ${finalVerdict}`);
        } else {
            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                let result = engineResults[i];
                
                if (!result) {
                    result = { status: "IE", output: "Test case dropped by engine", time_ms: 0 };
                }

                let currentStatus = result.status;

                if (currentStatus === "AC" && (result.time_ms || 0) > timeLimit) {
                    currentStatus = "TLE";
                }
                if (currentStatus === "AC" && !compareOutputsZeroAlloc(result.output, tc.output)) {
                    currentStatus = "WA";
                }

                console.log(`[Job ${jobId}] Case ${i + 1} Status: ${currentStatus} | Time: ${result.time_ms || 0}ms`);

                allResults.push({
                    // ZERO COPY: Exclude tc.input and tc.expected to save massive amounts of memory!
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

function isWhitespace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}
function isSpace(c) {
    return c === ' ' || c === '\t';
}

function compareOutputsZeroAlloc(actual, expected) {
    if (!actual) actual = "";
    if (!expected) expected = "";

    let i = 0;
    while (i < actual.length && isWhitespace(actual[i])) i++;
    let j = 0;
    while (j < expected.length && isWhitespace(expected[j])) j++;

    let endA = actual.length - 1;
    while (endA >= 0 && isWhitespace(actual[endA])) endA--;
    let endE = expected.length - 1;
    while (endE >= 0 && isWhitespace(expected[endE])) endE--;

    while (i <= endA || j <= endE) {
        let lineEndA = i;
        while (lineEndA <= endA && actual[lineEndA] !== '\n' && actual[lineEndA] !== '\r') lineEndA++;
        let lineLastCharA = lineEndA - 1;
        while (lineLastCharA >= i && isSpace(actual[lineLastCharA])) lineLastCharA--;

        let lineEndE = j;
        while (lineEndE <= endE && expected[lineEndE] !== '\n' && expected[lineEndE] !== '\r') lineEndE++;
        let lineLastCharE = lineEndE - 1;
        while (lineLastCharE >= j && isSpace(expected[lineLastCharE])) lineLastCharE--;

        const lenA = lineLastCharA - i + 1;
        const lenE = lineLastCharE - j + 1;

        if (lenA !== lenE) return false;

        for (let k = 0; k < lenA; k++) {
            if (actual[i + k].toLowerCase() !== expected[j + k].toLowerCase()) {
                return false;
            }
        }

        i = lineEndA;
        if (i <= endA && actual[i] === '\r') i++;
        if (i <= endA && actual[i] === '\n') i++;

        j = lineEndE;
        if (j <= endE && expected[j] === '\r') j++;
        if (j <= endE && expected[j] === '\n') j++;
    }

    return true;
}

let isShuttingDown = false;

const shutdownHandler = (signal) => {
    console.log(`\n[Worker ${process.pid}] Received ${signal}. Will exit after current job...`);
    isShuttingDown = true;
};

process.on("message", (msg) => {
    if (msg.cmd === "shutdown") {
        shutdownHandler("IPC shutdown");
    }
});

process.on("SIGINT", () => shutdownHandler("SIGINT"));
process.on("SIGTERM", () => shutdownHandler("SIGTERM"));

const startWorker = async () => {
    try {
        await redisClient.connect();
        await redisPublisher.connect();
        console.log(`⚡ [Worker ${process.pid}] connected to Redis.`);
        
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`💾 [Worker ${process.pid}] connected to Mongo.`);

        while (!isShuttingDown) {
            try {
                // Poll Redis for a job. Block for 2 seconds.
                // If it returns null (timeout), the loop restarts and checks isShuttingDown.
                const submission = await redisClient.brPop("submissions", 2);
                if (submission) {
                    await processSubmission(submission.element);
                }
            } catch (err) {
                console.error(`[Worker ${process.pid}] Loop Error:`, err);
            }
        }
        
        console.log(`[Worker ${process.pid}] Shutting down cleanly.`);
        await redisClient.quit();
        await redisPublisher.quit();
        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error(`[Worker ${process.pid}] Critical Start Failure:`, err);
        process.exit(1);
    }
};

startWorker();