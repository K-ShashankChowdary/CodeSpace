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
    process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "stress_secret";
    
    validToken = jwt.sign(
        { type: "guest", name: "StressTester", sessionCode: "TEST", sessionId: "stress-id" },
        process.env.ACCESS_TOKEN_SECRET
    );

    process.env.MONGODB_URI = 'mongodb://localhost:27017/codespace_stress_db';
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
        title: "Stress Test Problem",
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

describe('E2E Stress Testing: Concurrency', () => {
    test('Should handle 20 concurrent code submissions gracefully', async () => {
        const concurrencyLevel = 20;
        const code = "#include <iostream>\nusing namespace std;\nint main() { int a, b; if (cin >> a >> b) cout << a + b << endl; return 0; }";
        
        // Fire 20 submissions at exactly the same time
        const promises = [];
        for (let i = 0; i < concurrencyLevel; i++) {
            promises.push(
                request(app)
                    .post('/api/v1/submissions/submit')
                    .set('Authorization', `Bearer ${validToken}`)
                    .send({
                        problemId: testProblem._id,
                        code: code,
                        language: "cpp",
                        executionType: "submit"
                    })
            );
        }

        const responses = await Promise.all(promises);
        
        // Assert all 20 API requests were accepted (202 Accepted)
        let successCount = 0;
        responses.forEach(res => {
            if (res.status === 202) successCount++;
        });

        expect(successCount).toBe(concurrencyLevel);
    }, 60000); // 1 minute timeout for worker to process 20 submissions
});
