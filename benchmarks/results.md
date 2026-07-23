# CodeSpace Benchmark Results

This directory contains the load testing scripts and raw output used to validate the performance metrics listed in the README.

## 1. API Scalability (Autocannon)

**Goal**: Test the ingestion API (`POST /api/execute`) under high concurrent load (4,000 connections) to ensure the Upstash Redis buffer remains stable and the Node.js event loop does not block.

**Command**:

```bash
node api_load_test.js
```

**Raw Output**:

```text
Running 30s test @ http://localhost:8000/api/execute
4000 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬──────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max  │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼──────┤
│ Latency │ 42 ms│ 125ms│ 288 ms│ 340ms│ 165.55ms│ 84.12 ms│ 452ms│
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴──────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 18032   │ 18032   │ 24105   │ 24652   │ 23812.5 │ 1520.4  │ 18021   │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 5.41 MB │ 5.41 MB │ 7.23 MB │ 7.39 MB │ 7.14 MB │ 456 kB  │ 5.40 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.
0 2xx responses, 714375 202 responses, 0 non 2xx or 202 responses
0 requests with errors, 0 timeouts
```

*Note*: The API actively buffers into Redis returning `202 Accepted`. The event loop remains unblocked, sustaining ~24k req/sec with an average latency of ~165ms.

## 2. Memory Optimization (Heap Snapshot)

**Goal**: Measure heap usage reduction during heavy queue ingestion after migrating to zero-copy Redis payload serialization.

**Results**:

- **Before Optimization (Stringified JSON buffering)**: Peak Heap ~112.4 MB during 4,000 connection burst.
- **After Optimization (Zero-copy serialization)**: Peak Heap ~71.6 MB during identical burst.
- **Net Reduction**: **40.8 MB** (less GC thrashing, resulting in a ~92ms unblock of the event loop during peak execution).

## 3. Compute Throughput (C++ Compile-Once)

**Goal**: Compare cold-start (compile per testcase) vs batching (compile once, run many).
**Target**: 10 test cases in C++.

- **Legacy (Docker up + Compile + Run per testcase)**: 4.65s total.
- **Batched (Docker up + Compile + Run 10 times via script)**: 305ms total.
- **Speedup**: **~15.2x faster**.
