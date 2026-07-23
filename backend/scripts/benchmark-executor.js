import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENGINE_PATH = path.resolve(__dirname, '../../engine/executor');
const TEMP_DIR = path.resolve(__dirname, 'temp_bench');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const code = 'print("Hello, Benchmark")';
fs.writeFileSync(path.join(TEMP_DIR, 'bench.py'), code);

let totalTime = 0;
const iterations = 10;

console.log(`Running ${iterations} iterations of python executor...`);

for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
        execSync(`${ENGINE_PATH} bench ${TEMP_DIR} python`, { encoding: 'utf-8', stdio: 'ignore' });
    } catch (_e) {
        // ignore errors for benchmark
    }
    const end = performance.now();
    const duration = end - start;
    console.log(`Iteration ${i+1}: ${duration.toFixed(2)}ms`);
    totalTime += duration;
}

const avg = totalTime / iterations;
console.log(`\nAverage Execution Latency: ${avg.toFixed(2)}ms`);

fs.rmSync(TEMP_DIR, { recursive: true, force: true });
