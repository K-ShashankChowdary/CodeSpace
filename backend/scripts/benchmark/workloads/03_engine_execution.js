import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const name = 'engine_execution_overhead';

export async function setup() {
    const tempDir = path.resolve(__dirname, '../../temp_benchmark');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // A simple C++ Accepted (AC) snippet from test_codes.txt
    const cppCode = `#include <iostream>
using namespace std;
int main() {
    cout << "Hello" << endl;
    return 0;
}`;

    const jobId = 'bm_job';
    const filePath = path.join(tempDir, `${jobId}.cpp`);
    fs.writeFileSync(filePath, cppCode);

    const enginePath = path.resolve(__dirname, '../../../../engine/executor');

    return {
        tempDir,
        jobId,
        enginePath,
        language: 'cpp'
    };
}

export async function execute({ tempDir, jobId, enginePath, language }) {
    return new Promise((resolve, reject) => {
        const command = `${enginePath} ${jobId} "${tempDir}" ${language}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                // If the engine itself crashes, reject
                // Note: The engine returns exit code 0 even if the user code has RE/CE, 
                // but returns JSON with status='RE'/'CE'.
                console.error("Engine execution failed:", stderr);
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

export async function teardown({ tempDir }) {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
