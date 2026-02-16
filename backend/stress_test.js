import axios from "axios";

// I configured this to hit my local API endpoint
const API_URL = "http://localhost:5000/api/v1/submissions/submit";

// I need a valid Problem ID from my database to bypass the validation check
const PROBLEM_ID = "699351dfa1fedc98bbe39600"; // <--- REPLACE THIS WITH YOUR REAL ID

// I defined the different types of code scenarios I want to test
const scenarios = [
    {
        type: "AC (Accepted)",
        code: `#include <iostream>\nusing namespace std;\nint main() { int a, b; cin >> a >> b; cout << a + b; return 0; }`
    },
    {
        type: "TLE (Time Limit Exceeded)",
        // I created an infinite loop here to force the worker to kill the process
        code: `#include <iostream>\nint main() { while(true); return 0; }`
    },
    {
        type: "RE (Runtime Error)",
        // I am dereferencing a null pointer to force a segmentation fault (SIGSEGV)
        code: `#include <iostream>\nint main() { int *p = nullptr; *p = 10; return 0; }`
    },
    {
        type: "CE (Compilation Error)",
        // I removed the semicolon to ensure g++ fails to build the binary
        code: `#include <iostream>\nint main() { std::cout << "Syntax Error" return 0; }`
    }
];

const sendSubmission = async (scenario, index) => {
    try {
        console.log(`[${index}] Sending ${scenario.type}...`);
        
        const payload = {
            problemId: PROBLEM_ID,
            language: "cpp",
            code: scenario.code
        };

        const { data } = await axios.post(API_URL, payload);
        console.log(`[${index}] ✅ Queued ${scenario.type} -> Job ID: ${data.data.jobId}`);

    } catch (error) {
        console.error(`[${index}] ❌ Failed to send ${scenario.type}: ${error.message}`);
    }
};

const runStressTest = async () => {
    console.log("🚀 Starting Verdict Stress Test...");
    
    // I map over the scenarios to send them all in parallel
    const promises = scenarios.map((scenario, index) => sendSubmission(scenario, index));
    
    await Promise.all(promises);
    console.log("\n✅ All scenarios sent! Check your Worker terminal for verdicts.");
};

runStressTest();