import axios from "axios";

// Configuration (Matches your .env)
const API_URL = "http://localhost:5000/api/v1/submissions/submit";

// ⚠️ CRITICAL: Replace this with the ID from 'node seed.js'
const PROBLEM_ID = "699597377dd2827260d8a939";

const scenarios = [
  {
    type: "AC (Accepted)",
    description: "Standard code that prints the correct sum.",
    code: `#include <iostream>\nusing namespace std;\nint main() { int a, b; cin >> a >> b; cout << a + b; return 0; }`,
  },
  {
    type: "WA (Wrong Answer)",
    description: "Prints '100' instead of the sum, triggering a mismatch.",
    code: `#include <iostream>\nusing namespace std;\nint main() { int a, b; cin >> a >> b; cout << 100; return 0; }`,
  },
  {
    type: "TLE (Time Limit Exceeded)",
    description:
      "Infinite loop that runs forever until the 4s timeout kills it.",
    code: `#include <iostream>\nint main() { while(true); return 0; }`,
  },
  {
    type: "RE (Runtime Error)",
    description:
      "Dereferences a null pointer to cause a Segmentation Fault (SIGSEGV).",
    code: `#include <iostream>\nint main() { int *p = nullptr; *p = 10; return 0; }`,
  },
  {
    type: "CE (Compilation Error)",
    description:
      "Syntax error (missing semicolon) that fails the g++ build step.",
    code: `#include <iostream>\nint main() { std::cout << "Syntax Error" return 0; }`,
  },

  {
    type: "MLE (Memory Limit Exceeded)",
    description: "Allocates a vector larger than the 256MB Docker limit.",
    code: `#include <iostream>\n#include <vector>\nusing namespace std;\nint main() { vector<int> v(100000000); cout << v[0] << endl; return 0; }`,
  },
  // 100 million ints * 4 bytes = ~400MB. This should crash the 256MB container.
];

const sendSubmission = async (scenario, index) => {
  try {
    console.log(`[${index}] Sending ${scenario.type}...`);

    const payload = {
      problemId: PROBLEM_ID,
      language: "cpp",
      code: scenario.code,
    };

    const { data } = await axios.post(API_URL, payload);
    console.log(
      `[${index}] ✅ Queued ${scenario.type} -> Job ID: ${data.data.jobId}`,
    );
  } catch (error) {
    console.error(
      `[${index}] ❌ Failed to send ${scenario.type}: ${error.message}`,
    );
    if (error.response) console.error("Server Response:", error.response.data);
  }
};

const runStressTest = async () => {
  console.log("🚀 Starting ULTIMATE VERDICT TEST on Port 5000...\n");

  // Fire all requests in parallel
  const promises = scenarios.map((scenario, index) =>
    sendSubmission(scenario, index),
  );

  await Promise.all(promises);
  console.log(
    "\n✅ All scenarios sent! Watch your Worker terminal for the results.",
  );
};

runStressTest();
