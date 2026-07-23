import { bench, group, run } from 'mitata';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const enginePath = path.resolve(__dirname, '../../../engine/executor');

// Setup temp benchmark directory
const tempDir = path.resolve(__dirname, '../../temp_mitata_bench');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Prepare C++ source code
const cppCode = `#include <iostream>\nusing namespace std;\nint main() { cout << "Hello"; return 0; }`;
fs.writeFileSync(path.join(tempDir, 'bm_mitata.cpp'), cppCode);

// Prepare Python source code
const pyCode = `print("Hello")`;
fs.writeFileSync(path.join(tempDir, 'bm_mitata.py'), pyCode);

// Prepare large Redis payload for serialization bench
const allResults = [];
for (let i = 0; i < 50; i++) {
    allResults.push({
        input: crypto.randomBytes(50000).toString('hex'),
        expected: crypto.randomBytes(50000).toString('hex'),
        actual: crypto.randomBytes(50000).toString('hex'),
        status: "WA",
        time: 15
    });
}

group('1. Engine Compilation & Execution', () => {
    bench('C++ Compilation Overhead (g++)', async () => {
        return new Promise(resolve => exec(`g++ -O2 "${tempDir}/bm_mitata.cpp" -o "${tempDir}/bm_mitata"`, resolve));
    });

    bench('C++ Docker Execution Overhead (executor)', async () => {
        return new Promise(resolve => exec(`${enginePath} bm_mitata "${tempDir}" cpp`, resolve));
    });

    bench('Python Docker Execution Overhead (executor)', async () => {
        return new Promise(resolve => exec(`${enginePath} bm_mitata "${tempDir}" python`, resolve));
    });
});

group('2. Data Serialization', () => {
    bench('Redis 15MB Payload Serialization', () => {
        const jobData = { status: "WA", output: JSON.stringify(allResults), timeTaken: 15 };
        const payload = JSON.stringify({ jobId: "fake_job", ...jobData });
        if (payload.length < 100) throw new Error("Failed");
    });
});

await run({
    avg: true,
    json: false,
    colors: true,
    min_max: true,
    percentiles: true
});

// Teardown
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
