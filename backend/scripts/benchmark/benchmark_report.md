# Engine Benchmark Report

Generated at: 2026-07-20T05:29:06.946Z

| Workload | Iterations | Avg Latency | P99 Latency | Peak Heap | GC Overhead | CPU (User) |
|----------|------------|-------------|-------------|-----------|-------------|------------|
| heavy_strings_zero_allocation | 1 | 141.86 ms | 141.86 ms | 49.65 MB | +44.72 MB | 146.99 ms |
| redis_serialization_overhead | 1 | 91.99 ms | 91.99 ms | 90.55 MB | +40.83 MB | 65.78 ms |
| engine_execution_overhead | 1 | 772.26 ms | 772.26 ms | 90.59 MB | +0.01 MB | 13.54 ms |
| compile_overhead | 1 | 978.86 ms | 978.86 ms | 4.92 MB | +0.17 MB | 2.53 ms |
| sequential_execution_pipeline | 1 | 4653.29 ms | 4653.29 ms | 6.00 MB | +1.04 MB | 35.69 ms |
| all_languages_full_suite | 1 | 50148.45 ms | 50148.45 ms | 6.91 MB | +0.85 MB | 246.63 ms |
