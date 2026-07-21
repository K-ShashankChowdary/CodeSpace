import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const name = 'compile_overhead';

export async function setup() {
    const tempDir = path.resolve(__dirname, '../../temp_benchmark_compile');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // A large C++ snippet with multiple templates to slow down g++ slightly
    const cppCode = `#include <iostream>
#include <vector>
#include <algorithm>
#include <map>
#include <set>
using namespace std;
int main() {
    vector<int> v(1000, 1);
    sort(v.begin(), v.end());
    cout << v[0] << endl;
    return 0;
}`;

    const jobId = 'bm_compile';
    const filePath = path.join(tempDir, `${jobId}.cpp`);
    fs.writeFileSync(filePath, cppCode);

    return {
        tempDir,
        jobId,
        filePath
    };
}

export async function execute({ tempDir, jobId, filePath }) {
    return new Promise((resolve, reject) => {
        // Just invoke g++ directly to measure JUST compilation without Docker overhead
        const executable = path.join(tempDir, jobId);
        const command = `g++ -O2 "${filePath}" -o "${executable}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Compile failed:", stderr);
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
