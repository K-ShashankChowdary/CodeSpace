const autocannon = require('autocannon');

async function run() {
  console.log('Running load test against CodeSpace Execution API...');
  
  const result = await autocannon({
    url: 'http://localhost:8000/api/execute',
    connections: 4000,
    pipelining: 1,
    duration: 30,
    method: 'POST',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({
      language: 'cpp',
      sourceCode: '#include <iostream>\nint main() { return 0; }',
      problemId: '60d5ecb8b3112a00155b4124'
    })
  });

  console.log(autocannon.printResult(result));
}

run();
