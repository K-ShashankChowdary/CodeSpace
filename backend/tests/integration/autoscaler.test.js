import { jest } from '@jest/globals';
import { createClient } from "redis";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

describe("Worker Autoscaler Integration", () => {
    let redisClient;
    let autoscalerProcess;
    const redisUrl = process.env.REDIS_URI || "redis://localhost:6379";

    beforeAll(async () => {
        redisClient = createClient({ url: redisUrl });
        await redisClient.connect();
        // Clear queue before testing
        await redisClient.del("submissions");
    });

    afterAll(async () => {
        await redisClient.del("submissions");
        await redisClient.quit();
        if (autoscalerProcess && !autoscalerProcess.killed) {
            autoscalerProcess.kill();
        }
    });

    it("should dynamically scale up based on queue depth and scale down when empty", (done) => {
        // Increase timeout for async process testing
        jest.setTimeout(15000); 

        const autoscalerPath = path.resolve(__dirname, "../../workers/autoscaler.js");

        // Spawn autoscaler with aggressive timings for fast testing
        autoscalerProcess = spawn("node", [autoscalerPath], {
            env: {
                ...process.env,
                MAX_WORKERS: "3",
                MIN_WORKERS: "1",
                JOBS_PER_WORKER: "2",
                POLL_INTERVAL_MS: "500",
                SCALE_DOWN_COOLDOWN_MS: "2000" // 2 second cooldown
            }
        });

        let scaledUp = false;
        let scaledDown = false;

        autoscalerProcess.stdout.on("data", async (data) => {
            const str = data.toString();

            if (str.includes("Queue spike detected") && !scaledUp) {
                scaledUp = true;
                // Once it detects the spike and scales up, clear the queue to trigger scale down
                await redisClient.del("submissions");
            }

            if (str.includes("Scaling down to MIN_WORKERS") && scaledUp) {
                scaledDown = true;
                autoscalerProcess.kill();
                expect(scaledUp).toBe(true);
                expect(scaledDown).toBe(true);
                done();
            }
        });

        autoscalerProcess.stderr.on("data", (data) => {
            console.error("[Autoscaler Error]:", data.toString());
        });

        // Trigger a fake spike by pushing 6 dummy jobs (Should request 3 workers total)
        setTimeout(async () => {
            const dummyJob = JSON.stringify({ jobId: "dummy", code: "", language: "cpp", testCases: [] });
            await redisClient.rPush("submissions", dummyJob);
            await redisClient.rPush("submissions", dummyJob);
            await redisClient.rPush("submissions", dummyJob);
            await redisClient.rPush("submissions", dummyJob);
            await redisClient.rPush("submissions", dummyJob);
            await redisClient.rPush("submissions", dummyJob);
        }, 1000);
    });
});
