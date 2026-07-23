import request from 'supertest';
import { app } from '../../src/app.js';
import { Problem } from '../../src/models/problem.model.js';
import { pollSubmissionStatus } from './utils.js';
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
let mockGuestToken;

beforeAll(async () => {
    // Ensure ACCESS_TOKEN_SECRET exists for mock JWT
    process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "e2e_test_secret";
    
    mockGuestToken = jwt.sign(
        { type: "guest", name: "TestGuest", sessionCode: "TEST", sessionId: "mock-session-id" },
        process.env.ACCESS_TOKEN_SECRET
    );

    // 1. Connect to Test DB
    process.env.MONGODB_URI = 'mongodb://localhost:27017/codespace_test_db';
    const testDbUri = process.env.MONGODB_URI;

    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(testDbUri);
    }
    
    await mongoose.connection.db.dropDatabase();

    // 2. Connect to Redis and flush queues
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    await redisClient.del('submissions');
    await redisClient.del('job-updates');

    // 3. Spawn Job Worker
    const workerPath = path.resolve(__dirname, '../../workers/jobworker.js');
    workerProcess = spawn('node', [workerPath], {
        env: { ...process.env, MONGODB_URI: testDbUri },
        stdio: 'inherit'
    });
    
    // Give worker 1 second to boot
    await new Promise(resolve => setTimeout(resolve, 1000));

    testProblem = await Problem.create({
        title: "A + B",
        description: "Add two numbers",
        difficulty: "Easy",
        timeLimit: 2000,
        memoryLimit: 256,
        testCases: [
            { input: "1 2\n", output: "3\n", isHidden: false },
            { input: "10 20\n", output: "30\n", isHidden: true }
        ]
    });
}, 30000);

afterAll(async () => {
    await Problem.deleteMany({});
    
    if (workerProcess) {
        workerProcess.kill();
    }
    await mongoose.connection.close();
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
}, 30000);

describe('E2E: Submission Lifecycle', () => {

    const testScenarios = [
        // C++ (6 verdicts)
        { name: "C++ Execution - Accepted Verdict", lang: "cpp", expected: "AC", code: "#include <iostream>\nusing namespace std;\nint main() { int a, b; if (cin >> a >> b) cout << a + b << endl; return 0; }" },
        { name: "C++ Execution - Wrong Answer Verdict", lang: "cpp", expected: "WA", code: "#include <iostream>\nusing namespace std;\nint main() { int a, b; if (cin >> a >> b) cout << a + b + 1 << endl; return 0; }" },
        { name: "C++ Execution - Compile Error", lang: "cpp", expected: "CE", code: "int main() { cout << 'a' return 0; }" },
        { name: "C++ Execution - Time Limit Exceeded", lang: "cpp", expected: "TLE", code: "int main() { while(true); return 0; }" },
        { name: "C++ Execution - Memory Limit Exceeded", lang: "cpp", expected: "MLE", code: "#include <vector>\nint main() { std::vector<int*> v; while(true) v.push_back(new int[1000000]); return 0; }" },
        { name: "C++ Execution - Runtime Error", lang: "cpp", expected: "RE", code: "int main() { int a = 1 / 0; return a; }" },

        // Python (6 verdicts)
        { name: "Python Execution - Accepted Verdict", lang: "python", expected: "AC", code: "import sys\nfor line in sys.stdin:\n    a, b = map(int, line.split())\n    print(a + b)" },
        { name: "Python Execution - Wrong Answer Verdict", lang: "python", expected: "WA", code: "print('Wrong')" },
        { name: "Python Execution - Compile Error", lang: "python", expected: "RE", code: "def foo() # Missing colon\n  pass" },
        { name: "Python Execution - Time Limit Exceeded", lang: "python", expected: "TLE", code: "while True: pass" },
        { name: "Python Execution - Memory Limit Exceeded", lang: "python", expected: "MLE", code: "a = []\nwhile True: a.append(' ' * 10**7)" },
        { name: "Python Execution - Runtime Error", lang: "python", expected: "RE", code: "print(1/0)" },

        // Java (6 verdicts)
        { name: "Java Execution - Accepted Verdict", lang: "java", expected: "AC", code: "import java.util.*;\npublic class Main { public static void main(String[] args) { Scanner sc = new Scanner(System.in); while(sc.hasNextInt()) { int a = sc.nextInt(); int b = sc.nextInt(); System.out.println(a+b); } } }" },
        { name: "Java Execution - Wrong Answer Verdict", lang: "java", expected: "WA", code: "public class Main { public static void main(String[] args) { System.out.println(\"0\"); } }" },
        { name: "Java Execution - Compile Error", lang: "java", expected: "CE", code: "public class Main { public static void main(String[] args) { System.out.print('Hello') } }" },
        { name: "Java Execution - Time Limit Exceeded", lang: "java", expected: "TLE", code: "public class Main { public static void main(String[] args) { while(true); } }" },
        { name: "Java Execution - Memory Limit Exceeded", lang: "java", expected: "MLE", code: "import java.util.*;\npublic class Main { public static void main(String[] args) { List<byte[]> l = new ArrayList<>(); while(true) l.add(new byte[10000000]); } }" },
        { name: "Java Execution - Runtime Error", lang: "java", expected: "RE", code: "public class Main { public static void main(String[] args) { int a = 1/0; } }" },

        // JavaScript (6 verdicts)
        { name: "JavaScript Execution - Accepted Verdict", lang: "javascript", expected: "AC", code: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nfor(const line of lines) { if(!line) continue; const [a,b] = line.split(' '); console.log(Number(a) + Number(b)); }" },
        { name: "JavaScript Execution - Wrong Answer Verdict", lang: "javascript", expected: "WA", code: "console.log(0);" },
        { name: "JavaScript Execution - Compile Error", lang: "javascript", expected: "RE", code: "const a = ;" },
        { name: "JavaScript Execution - Time Limit Exceeded", lang: "javascript", expected: "TLE", code: "while(true) {}" },
        { name: "JavaScript Execution - Memory Limit Exceeded", lang: "javascript", expected: "MLE", code: "const arr = []; while(true) arr.push(new Array(1000000).fill('a'));" },
        { name: "JavaScript Execution - Runtime Error", lang: "javascript", expected: "RE", code: "throw new Error('Runtime Error');" },
        
        // C (6 verdicts)
        { name: "C Execution - Accepted Verdict", lang: "c", expected: "AC", code: "#include <stdio.h>\nint main() { int a, b; while(scanf(\"%d %d\", &a, &b) == 2) printf(\"%d\\n\", a+b); return 0; }" },
        { name: "C Execution - Wrong Answer Verdict", lang: "c", expected: "WA", code: "#include <stdio.h>\nint main() { printf(\"0\\n\"); return 0; }" },
        { name: "C Execution - Compile Error", lang: "c", expected: "CE", code: "int main() { printf('a') return 0; }" },
        { name: "C Execution - Time Limit Exceeded", lang: "c", expected: "TLE", code: "int main() { while(1); return 0; }" },
        { name: "C Execution - Memory Limit Exceeded", lang: "c", expected: "MLE", code: "#include <stdlib.h>\n#include <string.h>\nint main() { while(1) { void* p = malloc(10000000); if(p) memset(p, 1, 10000000); } return 0; }" },
        { name: "C Execution - Runtime Error", lang: "c", expected: "RE", code: "int main() { int a = 1 / 0; return a; }" }
    ];

    test.each(testScenarios)('$name', async ({ lang, code, expected }) => {
        // 1. Submit Code
        const submitRes = await request(app)
            .post('/api/v1/submissions/submit')
            .set('Authorization', `Bearer ${mockGuestToken}`)
            .send({
                problemId: testProblem._id,
                code: code,
                language: lang,
                executionType: "submit"
            });
            
        expect(submitRes.status).toBe(202);
        expect(submitRes.body.data.jobId).toBeDefined();

        const jobId = submitRes.body.data.jobId;

        // 2. Poll for final verdict
        const finalStatus = await pollSubmissionStatus(jobId, mockGuestToken, 30, 1000);

        // 3. Assert verdict matches expected
        expect(finalStatus.status).toBe(expected);
    }, 30000); // 30 second timeout per test
});
