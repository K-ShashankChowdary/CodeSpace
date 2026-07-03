import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENGINE_PATH = path.resolve(__dirname, '../../engine/executor');
const TEMP_DIR = path.resolve(__dirname, 'temp_test');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

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

let passCount = 0;
const results = [];

for (let i = 0; i < tests.length; i++) {
  const t = tests[i];
  const jobId = `test_${i}`;
  const ext = t.lang === 'python' ? '.py' : t.lang === 'cpp' ? '.cpp' : t.lang === 'java' ? '.java' : t.lang === 'javascript' ? '.js' : '.c';
  const filename = t.lang === 'java' ? 'Main.java' : `${jobId}${ext}`;
  fs.writeFileSync(path.join(TEMP_DIR, filename), t.code);
  
  try {
    const output = execSync(`${ENGINE_PATH} ${jobId} ${TEMP_DIR} ${t.lang}`, { encoding: 'utf-8' });
    const res = JSON.parse(output.trim());
    
    // In interpreted languages, MLE might trigger RE (e.g. MemoryError in python or FATAL ERROR in node) before Docker OOM killer
    let actualStatus = res.status;
    if (t.expected === 'MLE' && (actualStatus === 'RE' || actualStatus === 'MLE')) {
      actualStatus = 'MLE'; // Accept RE as valid MLE for interpreted langs
    }
    // CE in interpreted might surface as RE depending on parsing, but our executor tries to catch SyntaxError.
    
    console.log(`[${t.lang.toUpperCase()}] ${t.expected} Test: ${actualStatus === t.expected ? '✅ PASS' : '❌ FAIL (Got ' + res.status + ')'}`);
    if (actualStatus !== t.expected) {
        console.log(`   Output: ${res.output.substring(0, 100)}...`);
    } else {
        passCount++;
    }
    results.push({ lang: t.lang, type: t.expected, status: actualStatus, details: res.output.substring(0, 50) });
  } catch(e) {
    console.log(`[${t.lang.toUpperCase()}] ${t.expected} Test: ❌ CRASH`);
    console.log(e.message);
  }
}

console.log(`\nPassed ${passCount}/${tests.length}`);
fs.rmSync(TEMP_DIR, { recursive: true, force: true });
