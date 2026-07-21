import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBenchmark, generateMarkdownReport } from './runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const args = process.argv.slice(2);
    
    let targetWorkload = null;
    let iterations = 5;
    let runAll = false;

    // Simple arg parser
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--workload' && args[i+1]) {
            targetWorkload = args[i+1];
            i++;
        } else if (args[i] === '--runs' && args[i+1]) {
            iterations = parseInt(args[i+1], 10);
            i++;
        } else if (args[i] === '--all') {
            runAll = true;
        }
    }

    const workloadsDir = path.join(__dirname, 'workloads');
    const files = fs.readdirSync(workloadsDir).filter(f => f.endsWith('.js'));
    
    let workloadsToRun = [];

    for (const file of files) {
        const baseName = file.replace('.js', '');
        if (runAll || targetWorkload === baseName) {
            const modulePath = `file://${path.join(workloadsDir, file)}`;
            const mod = await import(modulePath);
            
            workloadsToRun.push({
                name: mod.name || baseName,
                iterations: iterations,
                setup: mod.setup,
                execute: mod.execute,
                teardown: mod.teardown
            });
        }
    }

    if (workloadsToRun.length === 0) {
        console.error("❌ No workloads found to run. Use --workload <name> or --all");
        process.exit(1);
    }

    const allResults = [];
    
    for (const config of workloadsToRun) {
        const result = await runBenchmark(config);
        allResults.push(result);
    }

    // Generate report
    const reportPath = path.join(__dirname, 'benchmark_report.md');
    generateMarkdownReport(allResults, reportPath);
    
    console.log("✅ Benchmarks completed successfully.");
}

main().catch(console.error);
