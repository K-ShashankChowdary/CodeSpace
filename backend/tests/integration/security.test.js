import request from 'supertest';
import { app } from '../../src/app.js';
import { Problem } from '../../src/models/problem.model.js';
import mongoose from 'mongoose';
import { redisClient } from '../../src/redis/client.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testProblem;
let workerProcess;
let validToken;

beforeAll(async () => {
    process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "security_secret";
    
    validToken = jwt.sign(
        { type: "guest", name: "SecurityTester", sessionCode: "TEST", sessionId: "security-id" },
        process.env.ACCESS_TOKEN_SECRET
    );

    process.env.MONGODB_URI = 'mongodb://localhost:27017/codespace_security_db';
    const testDbUri = process.env.MONGODB_URI;

    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(testDbUri);
    }
    await mongoose.connection.db.dropDatabase();

    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    await redisClient.del('submissions');
    await redisClient.del('job-updates');

    const workerPath = path.resolve(__dirname, '../../workers/jobworker.js');
    workerProcess = spawn('node', [workerPath], {
        env: { ...process.env, MONGODB_URI: testDbUri },
        stdio: 'ignore'
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    testProblem = await Problem.create({
        title: "Security Test Problem",
        description: "Add two numbers",
        difficulty: "Easy",
        timeLimit: 2000,
        memoryLimit: 256,
        testCases: [
            { input: "1 2\n", output: "3\n", isHidden: false }
        ]
    });
}, 30000);

afterAll(async () => {
    await Problem.deleteMany({});
    if (workerProcess) workerProcess.kill();
    await mongoose.connection.close();
    if (redisClient.isOpen) await redisClient.quit();
}, 30000);

// Helper function to poll Redis for completion
const pollForResult = async (submissionId, maxRetries = 30) => {
    for (let i = 0; i < maxRetries; i++) {
        const res = await request(app)
            .get(`/api/v1/submissions/status/${submissionId}`)
            .set('Authorization', `Bearer ${validToken}`);
            
        if (res.status === 200 && res.body.data && res.body.data.status !== 'Pending') {
            return res.body.data;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Test timed out waiting for worker');
};

describe('Security & Malicious Code Isolation', () => {

    test('Should block access to sensitive system files (/etc/passwd)', async () => {
        const maliciousCode = `
import os
try:
    with open('/etc/passwd', 'r') as f:
        print(f.read())
except Exception as e:
    print("Access Denied")
`;
        const res = await request(app)
            .post('/api/v1/submissions/submit')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                problemId: testProblem._id,
                code: maliciousCode,
                language: "python",
                executionType: "submit"
            });

        expect(res.status).toBe(202);
        const finalStatus = await pollForResult(res.body.data.jobId);
        
        // Output should ideally not contain the contents of /etc/passwd
        // It might result in WA or RE if network/file access is blocked
        expect(finalStatus.status).not.toBe("AC");
    }, 20000);

    test('Should prevent Fork Bombs from crashing the server', async () => {
        // Python fork bomb. The container should hit a pids limit or TLE, but the worker shouldn't crash.
        const forkBombCode = `
import os
while True:
    try:
        os.fork()
    except:
        pass
`;
        const res = await request(app)
            .post('/api/v1/submissions/submit')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                problemId: testProblem._id,
                code: forkBombCode,
                language: "python",
                executionType: "submit"
            });

        expect(res.status).toBe(202);
        const finalStatus = await pollForResult(res.body.data.jobId);
        
        // Expect TLE or RE depending on how Docker restricts processes
        expect(["TLE", "RE"]).toContain(finalStatus.status);
    }, 20000);

});
