import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const name = 'all_languages_full_suite';

export async function setup() {
    const tempDir = path.resolve(__dirname, '../../temp_benchmark_all');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const enginePath = path.resolve(__dirname, '../../../../engine/executor');

    const tests = [
        // C++ AC
        { lang: 'cpp', code: '#include <iostream>\nusing namespace std;\nint main() { cout << "Hello"; return 0; }', expected: 'AC' },
        // C++ CE
        { lang: 'cpp', code: 'int main() { cout << "Hello" return 0; }', expected: 'CE' },
        // C++ RE
        { lang: 'cpp', code: 'int main() { int a = 1 / 0; return a; }', expected: 'RE' },
        // C++ TLE
        { lang: 'cpp', code: 'int main() { while(true); return 0; }', expected: 'TLE' },
        // C++ MLE
        { lang: 'cpp', code: '#include <vector>\nusing namespace std;\nint main() { vector<int> v; while(true) v.push_back(1); return 0; }', expected: 'MLE' },
      
        // Python AC
        { lang: 'python', code: 'print("Hello")', expected: 'AC' },
        // Python CE (SyntaxError)
        { lang: 'python', code: 'print("Hello"', expected: 'CE' },
        // Python RE
        { lang: 'python', code: 'print(1/0)', expected: 'RE' },
        // Python TLE
        { lang: 'python', code: 'while True: pass', expected: 'TLE' },
        // Python MLE
        { lang: 'python', code: 'a = []\nwhile True: a.append(" " * 10**6)', expected: 'MLE' },
      
        // Java AC
        { lang: 'java', code: 'public class Main { public static void main(String[] args) { System.out.print("Hello"); } }', expected: 'AC' },
        // Java CE
        { lang: 'java', code: 'public class Main { public static void main(String[] args) { System.out.print("Hello") } }', expected: 'CE' },
        // Java RE
        { lang: 'java', code: 'public class Main { public static void main(String[] args) { int a = 1/0; } }', expected: 'RE' },
        // Java TLE
        { lang: 'java', code: 'public class Main { public static void main(String[] args) { while(true); } }', expected: 'TLE' },
        // Java MLE
        { lang: 'java', code: 'import java.util.*;\npublic class Main { public static void main(String[] args) { List<byte[]> l = new ArrayList<>(); while(true) l.add(new byte[1000000]); } }', expected: 'MLE' },
      
        // Node AC
        { lang: 'javascript', code: 'console.log("Hello");', expected: 'AC' },
        // Node CE
        { lang: 'javascript', code: 'console.log("Hello"', expected: 'CE' },
        // Node RE
        { lang: 'javascript', code: 'throw new Error("RE");', expected: 'RE' },
        // Node TLE
        { lang: 'javascript', code: 'while(true);', expected: 'TLE' },
        // Node MLE
        { lang: 'javascript', code: 'let a = []; while(true) a.push(new Array(1000000).fill(1));', expected: 'MLE' },
        
        // C AC
        { lang: 'c', code: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }', expected: 'AC' }
    ];

    // Write all files to disk
    const jobs = [];
    for (let i = 0; i < tests.length; i++) {
        const t = tests[i];
        const jobId = `bm_all_${i}`;
        const ext = t.lang === 'python' ? '.py' : t.lang === 'cpp' ? '.cpp' : t.lang === 'java' ? '.java' : t.lang === 'javascript' ? '.js' : '.c';
        const filename = t.lang === 'java' ? 'Main.java' : `${jobId}${ext}`;
        const filePath = path.join(tempDir, filename);
        
        // Create a unique dir for Java, because Java needs Main.java and we don't want conflicts
        const jobDir = path.join(tempDir, jobId);
        if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir);
        fs.writeFileSync(path.join(jobDir, filename), t.code.replace(/\\n/g, '\n'));
        
        jobs.push({
            jobId,
            jobDir,
            language: t.lang,
            expected: t.expected
        });
    }

    return {
        tempDir,
        jobs,
        enginePath
    };
}

export async function execute({ jobs, enginePath }) {
    // Run all tests sequentially
    for (const job of jobs) {
        await new Promise((resolve) => {
            const command = `${enginePath} ${job.jobId} "${job.jobDir}" ${job.language}`;
            exec(command, (error, stdout) => {
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
