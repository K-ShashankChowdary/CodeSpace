

const BASE_URL = 'http://localhost:5000/api/v1';
let hostCookie = '';
let guestToken = '';
let problemId = '';
let sessionCode = '';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log("🚀 Starting End-to-End Execution Pipeline Tests...\n");

  try {
    // 1. Host Setup (Register/Login)
    console.log("1. Host Setup...");
    const username = `host_${Date.now()}`;
    await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: username,
        email: `${username}@test.com`,
        fullName: "Test Host",
        password: "password123"
      })
    });

    const loginRes = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${username}@test.com`, password: "password123" })
    });
    const setCookieHeader = loginRes.headers.get('set-cookie');
    hostCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';
    console.log("✅ Host Logged in");

    // 2. Fetch a problem
    const problemsRes = await fetch(`${BASE_URL}/problems`, { headers: { 'Cookie': hostCookie }});
    const problemsData = await problemsRes.json();
    problemId = problemsData.data[0]._id;
    console.log(`✅ Selected Problem ID: ${problemId}`);

    // 3. Create Session
    const sessionRes = await fetch(`${BASE_URL}/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': hostCookie },
      body: JSON.stringify({ problemIds: [problemId] })
    });
    const sessionData = await sessionRes.json();
    sessionCode = sessionData.data.sessionCode;
    console.log(`✅ Session Created: ${sessionCode}`);

    // 4. Guest Join (Interviewee)
    console.log("\n2. Interviewee Joining...");
    const joinRes = await fetch(`${BASE_URL}/sessions/guest-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: "Jane Doe", sessionCode })
    });
    const joinData = await joinRes.json();
    if (!joinData.success) throw new Error(JSON.stringify(joinData));
    guestToken = joinData.data.guestToken;
    console.log("✅ Interviewee Joined successfully");

    // 5. Submit Valid Code (Run)
    console.log("\n3. Testing Valid Code Execution (Run)...");
    const validCode = `#include <iostream>\nusing namespace std;\nint main() { cout << "Hello World"; return 0; }`;
    const submitRes = await fetch(`${BASE_URL}/submissions/submit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${guestToken}` 
      },
      body: JSON.stringify({ 
        problemId, 
        code: validCode, 
        language: "cpp", 
        executionType: "run" 
      })
    });
    const submitData = await submitRes.json();
    if (submitRes.status !== 202) throw new Error(JSON.stringify(submitData));
    
    let jobId = submitData.data.jobId;
    console.log(`✅ Code Queued. Job ID: ${jobId}`);

    // Poll for status
    let status = "Pending";
    let attempts = 0;
    while (status === "Pending" && attempts < 15) {
      await sleep(1000);
      const statusRes = await fetch(`${BASE_URL}/submissions/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${guestToken}` }
      });
      const statusData = await statusRes.json();
      status = statusData.data.status;
      console.log(`   Poll ${attempts + 1}: Status = ${status}`);
      attempts++;
    }
    
    if (status === "Pending") throw new Error("Execution timed out!");
    console.log(`✅ Valid Code Execution Completed: ${status}`);

    // 6. Break the app (Submit Invalid Syntax Code)
    console.log("\n4. Testing Invalid Code Execution (Crash Test)...");
    const invalidCode = `int main() { printf("missing semicolon") return 0 }`;
    const crashSubmitRes = await fetch(`${BASE_URL}/submissions/submit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${guestToken}` 
      },
      body: JSON.stringify({ 
        problemId, 
        code: invalidCode, 
        language: "cpp", 
        executionType: "submit" 
      })
    });
    const crashSubmitData = await crashSubmitRes.json();
    let crashJobId = crashSubmitData.data.jobId;
    console.log(`✅ Invalid Code Queued. Job ID: ${crashJobId}`);

    status = "Pending";
    attempts = 0;
    while (status === "Pending" && attempts < 15) {
      await sleep(1000);
      const statusRes = await fetch(`${BASE_URL}/submissions/status/${crashJobId}`, {
        headers: { 'Authorization': `Bearer ${guestToken}` }
      });
      const statusData = await statusRes.json();
      status = statusData.data.status;
      console.log(`   Poll ${attempts + 1}: Status = ${status}`);
      attempts++;
    }

    if (status === "Pending") throw new Error("Execution timed out!");
    console.log(`✅ App properly handled broken code without crashing! Status: ${status}`);

    console.log("\n🎉 All pipeline tests passed successfully! The worker handles both valid and invalid code.");

  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message || error);
    process.exit(1);
  }
}

runTests();
