import crypto from 'crypto';

export const name = 'redis_serialization_overhead';

export async function setup() {
    // Generate a massive payload similar to returning 50 test cases with megabytes of IO data
    const allResults = [];
    for (let i = 0; i < 50; i++) {
        allResults.push({
            input: crypto.randomBytes(50000).toString('hex'), // 100KB input
            expected: crypto.randomBytes(50000).toString('hex'), // 100KB expected
            actual: crypto.randomBytes(50000).toString('hex'), // 100KB actual
            status: "WA",
            time: 15
        });
    }
    
    // Total size ~ 15MB of raw strings
    return allResults;
}

export async function execute(allResults) {
    // Simulate what jobworker.js does before sending to Redis
    const jobData = {
        status: "WA",
        output: JSON.stringify(allResults),
        timeTaken: 15
    };
    
    const redisPayload = JSON.stringify({ jobId: "fake_job", ...jobData });
    
    // To ensure the engine doesn't optimize it away
    if (redisPayload.length < 100) {
        throw new Error("Serialization failed");
    }
}
