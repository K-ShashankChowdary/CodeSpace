import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const name = 'sequential_execution_pipeline';

export async function setup() {
    const tempDir = path.resolve(__dirname, '../../temp_benchmark_seq');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Standard AC C++ code
    const cppCode = `#include <iostream>
using namespace std;
int main() {
    cout << "Passed" << endl;
    return 0;
}`;

    const jobs = [];
    const enginePath = path.resolve(__dirname, '../../../../engine/executor');

    for (let i = 0; i < 10; i++) {
        const jobId = `bm_seq_${i}`;
        const filePath = path.join(tempDir, `${jobId}.cpp`);
        fs.writeFileSync(filePath, cppCode);
        jobs.push(jobId);
    }

    return {
        tempDir,
        jobs,
        enginePath
    };
}

export async function execute({ tempDir, jobs, enginePath }) {
    // This perfectly mimics jobworker.js processing 10 test cases for a single submission
    for (const jobId of jobs) {
        await new Promise((resolve, reject) => {
            const command = `${enginePath} ${jobId} "${tempDir}" cpp`;
            exec(command, (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });
    }
}

export async function teardown({ tempDir }) {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
