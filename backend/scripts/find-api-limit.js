import autocannon from 'autocannon';

// Standard CLI Argument Parser
const args = process.argv.slice(2);
let targetUrl = process.env.TARGET_URL || 'http://localhost:5000/health';
let startConnections = 1000;
let increment = 2000;
let maxConnections = 20000;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) targetUrl = args[++i];
    if (args[i] === '--start' && args[i + 1]) startConnections = parseInt(args[++i], 10);
    if (args[i] === '--increment' && args[i + 1]) increment = parseInt(args[++i], 10);
    if (args[i] === '--max' && args[i + 1]) maxConnections = parseInt(args[++i], 10);
}

async function runLoadTest(connections, durationSeconds) {
    return new Promise((resolve, reject) => {
        const instance = autocannon({
            url: targetUrl,
            connections,
            pipelining: 10,
            duration: durationSeconds
        }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });

        autocannon.track(instance, { renderProgressBar: false });
    });
}

async function findLimit() {
    let connections = startConnections;

    console.log("🚀 Starting Dynamic API Limit Finder");
    console.log(`🎯 Target URL: ${targetUrl}`);
    console.log(`📈 Max Allowed Connections: ${maxConnections}`);
    console.log("----------------------------------------");

    while (connections <= maxConnections) {
        console.log(`\n⏳ Testing with ${connections} connections (x10 pipelined = ${connections * 10} concurrent requests)...`);
        
        try {
            const result = await runLoadTest(connections, 5); // 5 seconds per phase
            
            const errors = result.errors || 0;
            const timeouts = result.timeouts || 0;
            const non2xx = result.non2xx || 0;
            const avgLatency = result.latency.average;

            console.log(`   Avg Latency: ${avgLatency} ms`);
            console.log(`   Errors: ${errors} | Timeouts: ${timeouts} | Non-2xx: ${non2xx}`);

            if (errors > 0 || timeouts > 0 || non2xx > 0 || avgLatency > 2000) {
                console.log("\n💥 BREAKING POINT REACHED! 💥");
                console.log("----------------------------------------");
                console.log(`Maximum Stable Connections: ${Math.max(0, connections - increment)}`);
                console.log(`Failure Point: ${connections} connections`);
                console.log("Failure Mode:");
                if (errors > 0) console.log("- Socket drops / ECONNRESET detected.");
                if (timeouts > 0) console.log("- Server stopped responding (Timeouts).");
                if (non2xx > 0) console.log("- Server returned HTTP 5xx errors (Overloaded).");
                if (avgLatency > 2000) console.log("- Latency spiked beyond acceptable threshold (>2000ms).");
                process.exit(0);
            }

            console.log("   ✅ Passed.");
            connections += increment;

        } catch (err) {
            console.log("\n💥 CATASTROPHIC FAILURE REACHED! 💥");
            console.log(`   Error: ${err.message}`);
            process.exit(1);
        }
    }

    if (connections > maxConnections) {
        console.log("\n🛡️ Reached maximum test limit without failure! The system is incredibly resilient.");
        process.exit(0);
    }
}

findLimit();
