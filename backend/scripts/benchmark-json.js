import { performance } from 'perf_hooks';

const iterations = 1000;
const payload = Array.from({ length: 50 }, (_, _i) => ({
    input: "a".repeat(100000),
    expected: "b".repeat(10000)
}));

const start = performance.now();
for (let i = 0; i < iterations; i++) {
    JSON.stringify(payload);
}
const end = performance.now();

console.log(`Serialization Latency for 50 large test cases (approx 5.5MB): ${((end - start) / iterations).toFixed(2)}ms`);
