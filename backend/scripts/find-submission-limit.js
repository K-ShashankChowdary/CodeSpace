import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const secret = process.env.ACCESS_TOKEN_SECRET || 'secret';
const token = jwt.sign({ type: 'guest', name: 'benchmarker', sessionCode: 'BENCH', sessionId: '123' }, secret, { expiresIn: '1h' });

const payload = JSON.stringify({
    problemId: "benchmark",
    code: "function add(a, b) { return a + b; }",
    language: "javascript",
    testCases: [{ input: "1 2", output: "3" }]
});

console.log("Benchmarking Concurrent Submissions API Limit...");

const command = `npx autocannon -c 1000 -d 5 -M POST -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -b '${payload}' http://localhost:5000/api/submissions/submit`;

try {
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(output);
} catch (error) {
    console.error("Benchmark failed", error.stdout || error.message);
}
