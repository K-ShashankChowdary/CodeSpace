import { performance } from 'perf_hooks';
import fs from 'fs';

/**
 * Calculates percentiles
 */
function getPercentile(data, percentile) {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
}

/**
 * Runs a given workload, collecting CPU, Memory, and Latency metrics.
 */
export async function runBenchmark(config) {
    const { name, iterations = 1, setup, execute, teardown } = config;
    
    console.log(`\n========================================`);
    console.log(`🚀 Starting Benchmark: ${name}`);
    console.log(`🔄 Iterations: ${iterations}`);
    console.log(`========================================\n`);

    const latencies = [];
    let peakHeap = 0;
    let totalCpuUser = 0;
    let totalCpuSystem = 0;

    // We can poll memory asynchronously while the workload runs
    let memoryPoller;
    let isRunning = true;
    
    // Attempt to force GC for a clean baseline if the flag is enabled
    // eslint-disable-next-line no-undef
    if (typeof global !== 'undefined' && global.gc) {
        // eslint-disable-next-line no-undef
        global.gc();
    }
    
    const baseMemory = process.memoryUsage().heapUsed;
    peakHeap = baseMemory;

    memoryPoller = setInterval(() => {
        if (!isRunning) return;
        const currentHeap = process.memoryUsage().heapUsed;
        if (currentHeap > peakHeap) peakHeap = currentHeap;
    }, 10); // Poll every 10ms

    try {
        let setupData = null;
        if (setup) {
            setupData = await setup();
        }

        const startCpu = process.cpuUsage();

        for (let i = 0; i < iterations; i++) {
            const iterStart = performance.now();
            
            // Check memory before execution
            let mem = process.memoryUsage().heapUsed;
            if (mem > peakHeap) peakHeap = mem;

            await execute(setupData);
            
            // Check memory immediately after execution
            mem = process.memoryUsage().heapUsed;
            if (mem > peakHeap) peakHeap = mem;

            const iterEnd = performance.now();
            latencies.push(iterEnd - iterStart);
            process.stdout.write(`.` ); // progress indicator
        }
        
        console.log('\n'); // newline after progress

        const endCpu = process.cpuUsage(startCpu);

        totalCpuUser = endCpu.user / 1000; // to ms
        totalCpuSystem = endCpu.system / 1000; // to ms

        if (teardown) {
            await teardown(setupData);
        }
        
    } catch (err) {
        console.error("❌ Benchmark failed:", err);
    } finally {
        isRunning = false;
        clearInterval(memoryPoller);
    }

    const totalWallTime = latencies.reduce((a, b) => a + b, 0);
    const avgLatency = totalWallTime / iterations;
    const p50 = getPercentile(latencies, 50);
    const p90 = getPercentile(latencies, 90);
    const p99 = getPercentile(latencies, 99);

    const memoryDeltaMB = (peakHeap - baseMemory) / 1024 / 1024;
    const peakHeapMB = peakHeap / 1024 / 1024;
    
    const results = {
        name,
        iterations,
        totalWallTimeMs: totalWallTime.toFixed(2),
        avgLatencyMs: avgLatency.toFixed(2),
        p50Ms: p50.toFixed(2),
        p90Ms: p90.toFixed(2),
        p99Ms: p99.toFixed(2),
        cpuUserMs: totalCpuUser.toFixed(2),
        cpuSystemMs: totalCpuSystem.toFixed(2),
        baseMemoryMB: (baseMemory / 1024 / 1024).toFixed(2),
        peakHeapMB: peakHeapMB.toFixed(2),
        memoryDeltaMB: memoryDeltaMB.toFixed(2)
    };
    
    printReport(results);
    return results;
}

function printReport(r) {
    console.log(`📊 Benchmark Results: ${r.name}`);
    console.log(`----------------------------------------`);
    console.log(`⏱  LATENCY (ms)`);
    console.log(`  Total Wall Time: ${r.totalWallTimeMs} ms`);
    console.log(`  Average (Mean) : ${r.avgLatencyMs} ms`);
    console.log(`  P50 (Median)   : ${r.p50Ms} ms`);
    console.log(`  P90            : ${r.p90Ms} ms`);
    console.log(`  P99            : ${r.p99Ms} ms`);
    console.log(`----------------------------------------`);
    console.log(`🧠 MEMORY & CPU`);
    console.log(`  Base Heap      : ${r.baseMemoryMB} MB`);
    console.log(`  Peak Heap Used : ${r.peakHeapMB} MB`);
    console.log(`  GC Overhead    : +${r.memoryDeltaMB} MB allocated`);
    console.log(`  CPU (User)     : ${r.cpuUserMs} ms`);
    console.log(`  CPU (System)   : ${r.cpuSystemMs} ms`);
    console.log(`========================================\n`);
}

export function generateMarkdownReport(allResults, outputPath) {
    let md = `# Engine Benchmark Report\n\n`;
    md += `Generated at: ${new Date().toISOString()}\n\n`;
    
    md += `| Workload | Iterations | Avg Latency | P99 Latency | Peak Heap | GC Overhead | CPU (User) |\n`;
    md += `|----------|------------|-------------|-------------|-----------|-------------|------------|\n`;
    
    for (const r of allResults) {
        md += `| ${r.name} | ${r.iterations} | ${r.avgLatencyMs} ms | ${r.p99Ms} ms | ${r.peakHeapMB} MB | +${r.memoryDeltaMB} MB | ${r.cpuUserMs} ms |\n`;
    }
    
    fs.writeFileSync(outputPath, md);
    console.log(`📝 Saved markdown report to ${outputPath}`);
}
