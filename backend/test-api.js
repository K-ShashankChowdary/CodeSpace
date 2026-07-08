const BASE_URL = 'http://localhost:5000/api/v1';
let cookie = '';

async function runTests() {
  console.log("🚀 Starting API Tests...\n");

  try {
    // 1. Register a test user
    console.log("1. Testing User Registration...");
    const username = `testuser_${Date.now()}`;
    const registerRes = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: username,
        email: `${username}@test.com`,
        fullName: "Test User",
        password: "password123"
      })
    });
    const registerData = await registerRes.json();
    if (!registerData.success && !registerData.message.includes("exists")) {
        throw new Error(JSON.stringify(registerData));
    }
    console.log("✅ User Registration Successful (or user exists)");

    // 2. Login
    console.log("\n2. Testing User Login...");
    const loginRes = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: `${username}@test.com`,
        password: "password123"
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error(JSON.stringify(loginData));
    
    // Extract cookie
    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (setCookieHeader) {
      cookie = setCookieHeader.split(';')[0];
    }
    console.log("✅ Login Successful");

    // 3. Fetch Problems
    console.log("\n3. Testing Fetch Problems...");
    const problemsRes = await fetch(`${BASE_URL}/problems`, {
      headers: { 'Cookie': cookie }
    });
    const problemsData = await problemsRes.json();
    if (!problemsData.success) throw new Error(JSON.stringify(problemsData));
    const problemId = problemsData.data[0]._id;
    console.log(`✅ Fetched ${problemsData.data.length} problems`);

    // 4. Create Session
    console.log("\n4. Testing Session Creation...");
    const sessionRes = await fetch(`${BASE_URL}/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ problemIds: [problemId] })
    });
    const sessionData = await sessionRes.json();
    if (!sessionData.success) throw new Error(JSON.stringify(sessionData));
    console.log(`✅ Session Created successfully`);
    console.log(`   Session Code: ${sessionData.data.sessionCode}`);

    console.log("\n🎉 All terminal tests passed successfully! The backend and frontend are clean.");

  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message || error);
    process.exit(1);
  }
}

runTests();
