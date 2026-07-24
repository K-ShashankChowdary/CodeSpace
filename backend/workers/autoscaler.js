import { createClient } from "redis";
import { fork } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const redisUrl = process.env.REDIS_URI || "redis://localhost:6379";
const redisClient = createClient({ url: redisUrl });

redisClient.on("error", (err) => console.log("[Autoscaler] Redis Client Error:", err));

// Configuration
const MAX_WORKERS = process.env.MAX_WORKERS ? parseInt(process.env.MAX_WORKERS, 10) : Math.max(2, os.cpus().length);
const MIN_WORKERS = process.env.MIN_WORKERS ? parseInt(process.env.MIN_WORKERS, 10) : 1;
const JOBS_PER_WORKER = process.env.JOBS_PER_WORKER ? parseInt(process.env.JOBS_PER_WORKER, 10) : 5;
const POLL_INTERVAL_MS = process.env.POLL_INTERVAL_MS ? parseInt(process.env.POLL_INTERVAL_MS, 10) : 2000;
const SCALE_DOWN_COOLDOWN_MS = process.env.SCALE_DOWN_COOLDOWN_MS ? parseInt(process.env.SCALE_DOWN_COOLDOWN_MS, 10) : 30000;

// State
const activeWorkers = new Map();
let lastQueueSpikeTime = Date.now();

const spawnWorker = () => {
    const workerPath = path.resolve(__dirname, "jobworker.js");
    const worker = fork(workerPath);
    
    activeWorkers.set(worker.pid, worker);
    console.log(`[Autoscaler] 🚀 Spawned new worker (PID: ${worker.pid}). Total Active: ${activeWorkers.size}`);

    worker.on("exit", (code) => {
        console.log(`[Autoscaler] 💀 Worker ${worker.pid} exited with code ${code}.`);
        activeWorkers.delete(worker.pid);
        
        // If we drop below MIN_WORKERS due to crash, instantly replace
        if (activeWorkers.size < MIN_WORKERS) {
            console.log(`[Autoscaler] Active workers below minimum. Respawning...`);
            spawnWorker();
        }
    });
};

const scaleDown = () => {
    const excess = activeWorkers.size - MIN_WORKERS;
    if (excess <= 0) return;

    let killed = 0;
    for (const [pid, worker] of activeWorkers.entries()) {
        if (killed >= excess) break;
        console.log(`[Autoscaler] 📉 Sending shutdown signal to excess worker (PID: ${pid})...`);
        worker.send({ cmd: "shutdown" }); // Graceful shutdown via IPC
        activeWorkers.delete(pid); // Remove from Map immediately so we don't signal it twice
        killed++;
    }
};

const tick = async () => {
    try {
        const queueLength = await redisClient.lLen("submissions");
        
        if (queueLength > 0) {
            lastQueueSpikeTime = Date.now();
        }

        const desiredByLoad = Math.ceil(queueLength / JOBS_PER_WORKER);
        let targetWorkers = Math.max(MIN_WORKERS, Math.min(desiredByLoad, MAX_WORKERS));

        // Scale Up
        if (activeWorkers.size < targetWorkers) {
            const workersToSpawn = targetWorkers - activeWorkers.size;
            console.log(`[Autoscaler] 📈 Queue spike detected (Len: ${queueLength}). Spawning ${workersToSpawn} new workers.`);
            for (let i = 0; i < workersToSpawn; i++) {
                spawnWorker();
            }
        } 
        // Scale Down (only if queue is empty and cooldown has passed)
        else if (activeWorkers.size > MIN_WORKERS && queueLength === 0) {
            const timeSinceLastSpike = Date.now() - lastQueueSpikeTime;
            if (timeSinceLastSpike >= SCALE_DOWN_COOLDOWN_MS) {
                console.log(`[Autoscaler] 🧊 Queue empty for ${SCALE_DOWN_COOLDOWN_MS / 1000}s. Scaling down to MIN_WORKERS (${MIN_WORKERS}).`);
                scaleDown();
                // Reset timer so we don't spam scaleDown logs if activeWorkers haven't fully exited yet
                lastQueueSpikeTime = Date.now();
            }
        }
        
    } catch (error) {
        console.error("[Autoscaler] Tick Error:", error);
    }
};

const startAutoscaler = async () => {
    try {
        await redisClient.connect();
        console.log(`[Autoscaler] Orchestrator started. Max Workers: ${MAX_WORKERS}. Connected to Redis.`);
        
        // Boot initial minimum pool
        for (let i = 0; i < MIN_WORKERS; i++) {
            spawnWorker();
        }

        // Start polling loop
        setInterval(tick, POLL_INTERVAL_MS);

    } catch (error) {
        console.error("[Autoscaler] Failed to start:", error);
        process.exit(1);
    }
};

startAutoscaler();
