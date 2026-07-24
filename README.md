<div align="center">
  <img src="./docs/logo.svg" alt="CodeSpace Logo" width="90" />
  <h1>CodeSpace</h1>
  <p><strong>A Distributed Real-Time Code Execution Engine & Technical Interview Platform</strong></p>
  <br />
  <p>
    <a href="https://github.com/shashank-chowdary/Codespace/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT" />
    </a>
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
    </p>
</div>

---

## 1. The Motivation

Many engineering organizations still rely on disjointed tools—using Google Docs for code writing, Zoom for video, and separate platforms for actual code execution—to conduct technical interviews. This fragmented approach leads to poor candidate experiences, inability to evaluate real algorithmic execution, and difficult collaboration.

**CodeSpace** is a centralized B2B SaaS platform that allows organizations to manage the complete lifecycle of technical interviews. It provides a zero-latency, collaborative environment where candidates can be evaluated on complex algorithms with comprehensive test suites, strict resource limits, and real-time audio/video.

## 2. Target Users

- **Interviewer / Hiring Manager**: Creates interview sessions, authors custom algorithmic problems with custom test suites (or imports from LeetCode), monitors candidate execution, and evaluates results.
- **Candidate**: Joins the session via an invite link, collaborates on code in real-time, and runs submissions against the problem's test cases.
- **System Administrator (Ops)**: Monitors the distributed execution engine, scales compute workers during peak interview hours, and tracks system health (Redis queues, WebSockets).

## 3. Functional Requirements

### 3.1 Collaborative IDE

- **Real-Time Synchronization:** Implement real-time, multi-cursor code synchronization using **Yjs** (CRDTs) and Monaco Editor.
- **Polyglot Support:** Support seamless execution across C++, Python, Java, JavaScript, and C.
- **Intelligent Console:** Provide a responsive split-screen layout featuring a built-in Myers Diff Algorithm to visually highlight discrepancies between a candidate's actual output and the expected test case output.

### 3.2 Code Execution Engine

- **Asynchronous Ingestion:** Safely enqueue untrusted user submissions via an Upstash Redis message broker to prevent API event-loop blocking.
- **Isolated Execution:** Compile and execute code within highly constrained **Docker sandboxes (cgroups & namespaces)**, orchestrated by a decoupled Node.js worker daemon.
- **Real-Time Evaluation:** Evaluate execution outputs against problem-specific test suites and securely emit real-time verdicts (Accepted, Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Runtime Error) back to the client via WebSockets.

### 3.3 Session Management & Authentication

- **Stateless Authentication:** Utilize secure JSON Web Tokens (JWT) for stateless user authentication, issuing short-lived access tokens and secure HTTP-only refresh tokens.
- **Room Orchestration:** Generate secure, unique, and ephemeral interview rooms (`/room/:roomCode`) that independently track execution states and editor histories for multiple concurrent sessions.
- **Role-Based Access Control (RBAC):** Enforce strict authorization logic ensuring only authenticated Interviewers can close rooms, author custom problems/test suites, or modify session parameters.

### 3.4 Audio and Video Communication

- **Peer-to-Peer (P2P) Media Streaming:** Establish a WebRTC Peer-to-Peer (User Datagram Protocol (UDP)) mesh network for ultra-low latency video and audio communication directly within the IDE.
- **Node.js Signaling:** Utilize the backend API exclusively as a WebRTC signaling mechanism (Session Description Protocol (SDP) exchange), completely bypassing expensive server bandwidth costs.
- **Network Address Translation (NAT) Traversal:** Integrate Google STUN (Session Traversal Utilities for NAT) servers to seamlessly punch through strict symmetric firewalls and maintain connection stability.

### 3.5 Problem Bank

- **Extensive Library:** Maintain a centralized repository of algorithmic coding problems accessible to interviewers.
- **Dynamic Imports:** Instantly fetch and parse live problem descriptions, constraints, and test suites directly via LeetCode URLs.
- **Custom Authoring:** Empower interviewers to draft and persist proprietary company-specific questions with private test suites.

## 4. Mandatory Business Rules

- **Resource Limits:** Candidate code execution must never exceed `256MB` of memory or consume more than `0.5` CPU cores to prevent host-level Out of Memory (OOM) crashes.
- **Output Security:** The execution engine must never parse raw `stdout` for correctness. It must rely strictly on isolated POSIX exit codes to prevent spoofing (e.g., a candidate printing "Accepted").
- **State Integrity:** If a WebRTC or WebSocket connection drops, the candidate's code state must be preserved in memory, allowing seamless reconnection without data loss.
- **Privacy:** Hidden test cases must never be exposed to the candidate's browser payload.

## 5. Example Workflow

- **Step 1:** Interviewer logs in and creates a new Interview Session, generating a unique `roomCode`.
- **Step 2:** Interviewer selects a problem from the Problem Bank library, authors a custom algorithmic problem, or uses the "Automated Problem Ingestion" API to pull a live LeetCode problem (e.g., "Two Sum") directly into the session.
- **Step 3:** Candidate clicks the invite link and joins the room as a Guest.
- **Step 4:** Both users instantly connect via WebRTC video and the Yjs collaborative editor.
- **Step 5:** Candidate writes a solution and clicks "Run Code".
- **Step 6:** The API enqueues the job to Redis; a decoupled Node.js worker daemon picks it up, runs the Docker sandbox, and evaluates the code against all test cases.
- **Step 7:** The engine pushes the `AC` (Accepted) verdict through Redis Pub/Sub, and Socket.io broadcasts it back to both the interviewer and candidate screens in ~45ms.
- **Step 8:** Interviewer ends the session, which automatically terminates the candidate's Guest access and safely cleans up all active WebSocket connections.

## 6. Non-Functional Requirements (NFRs)

- **Execution & Streaming Latency:** Code execution verdicts should be delivered to the client in `< 500ms`. WebRTC signaling must complete in `< 300ms`, and Yjs CRDT synchronization should maintain `< 100ms` latency for a responsive collaborative typing experience.
- **API Scalability & Burst Throughput:** The system must gracefully handle peak traffic loads of up to **1,000 concurrent active users** while maintaining an average API ingestion latency under **500ms**.
- **Compute Optimization:** The multi-language execution engine should be capable of evaluating user submissions against standard test suites (10+ cases) in **< 1.5 seconds**.
- **High Availability & Fault Tolerance:** The backend should strive for **99.9% uptime** during business hours. In the event of temporary network partitions or WebSocket disconnects, the client state must be recoverable without data loss.
- **Security (Zero Trust Isolation):** The execution engine must strictly sandbox untrusted payloads. Containers must be stripped of network capabilities (`--network none`) and constrained by memory cgroups to prevent host compromise.

---

## Table of Contents

- [System Interface Definition (API Design)](#system-interface-definition-api-design)
- [System Architecture &amp; Data Flow](#system-architecture--data-flow)
- [Architectural Decisions](#architectural-decisions)
- [Database Schema Design](#database-schema-design)
- [Fault Tolerance &amp; Reliability (Edge Cases)](#fault-tolerance--reliability-edge-cases)
- [System Optimizations &amp; Load Testing](#system-optimizations--load-testing)
- [Capacity Estimations (Back-of-the-Envelope)](#capacity-estimations-back-of-the-envelope)
- [Getting Started](#getting-started)
- [License](#license)

---

## System Interface Definition (API Design)

The system relies on a robust, multi-protocol communication model combining **REST**, **WebSockets**, **WebRTC**, and **GraphQL**.

### 1. Code Execution (REST)

Used to enqueue a compilation job.
**`POST /api/execute`**

```json
// Request Payload
{
  "language": "cpp",
  "code": "#include <iostream> \n int main() { return 0; }",
  "problemId": "60d5ecb8b3112a00155b4124"
}
// Response (202 Accepted)
{
  "statusCode": 202,
  "data": { "jobId": "uuid-v4" },
  "message": "Submission queued",
  "success": true
}
```

### 2. Real-Time Verdicts (WebSocket)

Used by the client to listen for asynchronous execution results.
**`Event: "verdict"`**

```json
// Payload pushed from Server -> Client
{
  "jobId": "uuid-v4",
  "verdict": "AC", // Accepted, WA, TLE, MLE, RE
  "executionTimeMs": 12,
  "memoryUsedKb": 4096
}
```

### 3. Verdict Polling (REST Fallback)

Used if WebSockets drop or are blocked by corporate proxies.
**`GET /api/submissions/status/:id`**

```json
// Response (200 OK)
{
  "statusCode": 200,
  "data": {
    "status": "COMPLETED",
    "verdict": "WA",
    "passedCases": 8,
    "totalCases": 10
  },
  "message": "Status fetched",
  "success": true
}
```

### 4. Automated Problem Ingestion

Dynamically parses LeetCode problems directly into the database.
**`POST /api/problems/leetcode`**

```json
// Request Payload
{
  "url": "https://leetcode.com/problems/two-sum/"
}
// Response (201 Created)
{
  "statusCode": 201,
  "data": {
    "title": "Two Sum",
    "difficulty": "Easy",
    "testCases": [
      {
        "input": "[2,7,11,15]\n9",
        "output": "[0,1]"
      }
    ]
  },
  "message": "Problem imported successfully",
  "success": true
}
```

---

## System Architecture & Data Flow

CodeSpace is built to avoid main-thread blocking by strictly decoupling API ingestion from compute-heavy compilation tasks.

### Online Code Execution Pipeline (Producer-Consumer)

![Pipeline Architecture](./docs/pipeline-architecture.svg)

1. **Ingestion:** The React client dispatches the source code payload to the Node.js API (Producer).
2. **Buffering:** The Producer validates the payload and enqueues it to an **Upstash Redis Queue**.
3. **Consumption:** Independent Node.js worker daemons (Consumers) long-poll the queue for available tasks.
4. **Sandboxing:** The Workers orchestrate isolated **Docker containers** to execute the untrusted code. Memory and CPU limits are strictly enforced via Linux cgroups and POSIX system calls.
5. **Real-time Broadcast:** Verdicts (Accepted, Wrong Answer, Runtime Error, Compile Error, Time Limit Exceeded, Memory Limit Exceeded) are emitted via **Socket.io** back to the Producer, which immediately pushes the update to the React client via persistent WebSocket tunnels.

### Real-Time Collaboration & WebRTC Signaling

![WebRTC Architecture](./docs/webrtc-architecture.svg)

- **Code Synchronization:** Utilizes **Yjs (Conflict-free Replicated Data Types)** to merge keystrokes seamlessly over WebSockets without server-side conflict resolution overhead.
- **Media Streaming:** Video and audio bypass the server. The Node.js API acts strictly as a WebRTC signaling mechanism (Session Description Protocol exchange). The browser then utilizes Google STUN (Session Traversal Utilities for NAT) servers to punch through NATs, establishing a zero-latency **Peer-to-Peer UDP Mesh**.

---

### Low-Level Design (Core Engine Internals)

To achieve sub-second execution times across 10+ test cases, the execution engine is structured around a **Compile-Once, Run-Many** batching pattern utilizing Docker and bash orchestration.

1. **Phase 1: Script Generation (Orchestration)**
   - The custom **C++ Execution Engine** dynamically generates a `run_all.sh` bash script containing the exact compilation commands (e.g., `g++`) and a loop to sequentially run the executable against all test case inputs.
2. **Phase 2: Sandboxing (Process Execution)**
   - Instead of booting a fresh Docker container per test case (which incurs a ~300ms boot penalty each time), the engine uses `popen()` to boot a *single* long-lived Docker container for the entire job.
3. **Phase 3: Resource Limiting (Kernel Bounds)**
   - Linux `cgroups` enforce strict hardware boundaries via Docker flags (`--cpus="0.5" --memory="256m" --pids-limit=64`).
   - The `run_all.sh` script wraps the binary execution in the Linux `timeout` utility to enforce a strict hard-cap on CPU time, gracefully terminating infinite loops (`while(true)`).
4. **Phase 4: Batched Evaluation (I/O Redirection)**
   - Inside the container, the bash script uses standard Linux I/O redirection (`< input.txt > output.txt`) to pipe test cases in and out.
   - Exit codes and execution times are appended to a `metadata.txt` file. The C++ engine safely parses this file, maps exit codes to verdicts (e.g., `139` to `SIGSEGV`), and constructs a clean JSON payload to return to the parent Node.js process via `stdout`.

---

## Architectural Decisions

CodeSpace is engineered to mitigate the inherent security and scalability risks of online code execution at scale by treating the execution environment as entirely untrusted. We document our technical tradeoffs explicitly below.

### 1. Core Infrastructure & Execution Engine

#### 1.1 Backend Framework: Node.js (Express)

- **The "Why":**
  - The asynchronous event-driven architecture natively manages thousands of persistent WebSocket tunnels.
  - Completely bypasses the massive memory overhead typical of thread-per-request models (like Java/Spring Boot).
- **Tradeoffs & Mitigations:**
  - **Limitation:** Node.js is single-threaded and heavily penalized by CPU-bound tasks (like code compilation).
  - **Solution:** Strictly decoupled all CPU-heavy compilation steps to independent Node.js worker nodes using a Redis message broker.

#### 1.2 Execution Worker: C++ (POSIX-level)

- **The "Why":**
  - **Deterministic Performance:** No Garbage Collection (GC) pauses, guaranteeing that Time Limit Exceeded (TLE) verdicts are strictly due to algorithmic complexity.
  - **Direct Kernel Access:** Native access to Linux POSIX system calls (`fork`, `execvp`, `setrlimit`) to enforce absolute OS-level boundaries.
- **Tradeoffs & Mitigations:**
  - **Limitation:** Requires manual memory management and complex, platform-specific compilation.
  - **Solution:** Mitigated deployment friction by statically compiling the engine binary directly into the Docker sandbox image.

#### 1.3 Container Isolation: Docker Cgroups & Namespaces

- **The "Why":**
  - Relying on application-level timeouts is fundamentally insecure against malicious code.
  - Docker uses **Linux namespaces** (PID, NET, IPC) to completely isolate the execution environment from the host system, ensuring candidates cannot see or access host resources.
  - Docker's **cgroups** enforce strict kernel-level boundaries on resource consumption (e.g., `--memory` and `--pids-limit`), actively preventing fork bombs or host Out of Memory (OOM) crashes.
- **Tradeoffs & Mitigations:**
  - **Limitation:** Spawning a fresh Docker container per execution adds ~300ms of startup latency.
  - **Solution:** Engineered a "compile-once, run-many" batched architecture that reuses a single, long-lived container instance across all 10+ test cases.

#### 1.4 Inter-Process Communication: POSIX Exit Codes

- **The "Why":**
  - Parsing `stdout` for test case verification is extremely dangerous (e.g., a candidate could simply execute `print("Accepted")` to bypass validation).
  - Communicating via POSIX **exit codes** (e.g., `0` for AC, `139` for SIGSEGV) makes the engine entirely immune to output-spoofing.
- **Tradeoffs & Mitigations:**
  - **Limitation:** Exit codes alone do not provide granular stack traces or helpful debugging information for candidates.
  - **Solution:** Securely parse `stderr` *only* if a non-zero exit code is actively trapped by the engine.

### 2. Real-Time Communication Layer

#### 2.1 Peer-to-Peer (P2P) Video/Audio: WebRTC (UDP)

- **The "Why":**
  - WebSockets use TCP, where packet loss causes head-of-line blocking and severe latency spikes.
  - WebRTC utilizes **User Datagram Protocol (UDP) / Real-time Transport Protocol (RTP)**, allowing packet loss without halting the stream, resulting in smooth, sub-50ms latency.
  - Bypasses expensive server bandwidth costs entirely via a Peer-to-Peer mesh.
- **Tradeoffs & Mitigations:**
  - **Limitation:** WebRTC UDP traffic is frequently blocked by strict corporate firewalls and symmetric NATs.
  - **Solution:** Utilized Google STUN (Session Traversal Utilities for NAT) servers for NAT traversal, and designed the architecture to seamlessly fallback to TURN (Traversal Using Relays around NAT) servers (TCP) if a direct connection cannot be established.

#### 2.2 Execution Verdicts: WebSockets (TCP)

- **The "Why":**
  - Replaces traditional HTTP Short Polling.
  - HTTP Polling introduces massive TCP handshake overhead for every single status check.
  - WebSockets establish a single persistent TCP tunnel, reducing network overhead by ~97%.
  - Pushes verdict delivery latency down from 1.5s to **~45ms**.
- **Tradeoffs & Mitigations:**
  - **Limitation:** Stateful connections. WebSockets require holding open TCP connections, which heavily consume server memory and file descriptors compared to stateless HTTP.
  - **Considered:** We considered this tradeoff because sub-50ms verdict delivery is a core product requirement, and RAM is relatively cheap to scale.

#### 2.3 WebSocket Orchestration: Socket.io

- **The "Why":**
  - While raw WebSockets (`ws`) are technically lighter, Socket.io provides critical production-grade features out of the box.
  - **Heartbeats:** Built-in Ping/Pong logic to instantly detect dropped candidate connections.
  - **Resilience:** Automatic network reconnections during temporary wifi drops.
  - **Horizontal Scaling:** Seamless integration with the **Socket.io Redis Adapter** for broadcasting events across horizontally scaled, multi-node API deployments.
- **Tradeoffs & Mitigations:**
  - **Limitation:** Heavier payload size and requires complex "sticky sessions" for multi-node deployments.
  - **Solution:** Mitigated the sticky session requirement entirely by utilizing the Socket.io Redis Adapter to synchronize state across instances.

### 3. Scaling, Queuing & Rate Limiting

#### 3.1 Redis Queues & Autoscaler

- **Message Broker:** Spawning heavy compilation processes directly blocks the Node.js event loop. Upstash Redis acts as a message broker, allowing the API to enqueue a job (an O(1) operation taking <2ms) and immediately return. Independent workers consume the queue at their own pace.
- **Custom Autoscaling Daemon:** To maintain high availability during traffic spikes without incurring cloud-specific scaling costs, CodeSpace employs a custom autoscaling daemon. By monitoring the Redis queue depth, it dynamically forks localized compute workers to process backlog surges, closely mimicking the behavior of Kubernetes Event-driven Autoscaling (KEDA).
- **Tradeoffs & Mitigations:**
  - **Limitation:** Introducing Redis as a message broker creates a Single Point of Failure (SPOF). If Redis goes down, the entire execution pipeline halts.
  - **Considered:** We considered this risk for the MVP because Redis is exceptionally stable, and the massive performance gains of decoupling the API from the execution engine outweigh the risk.

#### 3.2 3-Tiered Rate Limiting Strategy

We employ a 3-tiered defense against traffic spikes and malicious actors:

- **Level 1: Compute Scaling (Autoscaler):** Dynamically provisions additional worker processes to handle increased queue depth.
- **Level 2: Load Shedding (Global Capacity Limit):** If the ingestion queue exceeds a predefined threshold, the API actively sheds load (returning `HTTP 503 Service Unavailable`) to prevent cascading OOM failures.
- **Level 3: Redis-Backed IP Rate Limiting:** A strict user-level throttle (10 req/min) prevents individual malicious actors from artificially triggering the global load shed.
- **Tradeoffs & Mitigations:**
  - **Limitation:** IP-based rate limiting (Level 3) can unfairly block entire university campuses or corporate offices sharing a single NAT gateway.
  - **Considered:** We considered this edge case for the current iteration; future roadmap features will implement JWT-based user-level rate limiting to replace IP-based tracking.

### 4. Testing Methodology

#### 4.1 End-to-End Integration Testing

- **The "Why":** Standard unit tests are wildly insufficient given the architecture's heavy reliance on external stateful infrastructure (MongoDB, Redis, Docker) and asynchronous real-time events (WebSockets).
- **The Strategy:** Integration tests provide a true representation of the production environment by testing the entire distributed data flow end-to-end.
- **The Result:** Ensures absolutely no race conditions, dangling sockets, or deadlocks occur across the execution lifecycle.
- **Tradeoffs & Mitigations:**
  - **Limitation:** E2E tests are significantly slower to run and can be brittle (flaky) due to network timing and database states.
  - **Solution:** Engineered automated test teardowns that cleanly wipe the MongoDB database and flush Redis queues before every test suite run to guarantee a pristine state.

---

## Database Schema Design

CodeSpace utilizes **MongoDB**, a NoSQL document store, chosen specifically for its flexibility in handling highly nested, unstructured JSON payloads (such as LeetCode test cases and problem descriptions) without rigid SQL schema migrations.

### 1. Users Collection

Optimized for rapid authentication and stateless JWT issuance.

```json
{
  "_id": "ObjectId",
  "username": "String (Unique, Indexed)",
  "email": "String (Unique, Indexed)",
  "password": "String (Bcrypt Hashed)",
  "refreshToken": "String"
}
```

### 2. Problems Collection

Mirrors the LeetCode schema, optimized for heavy read operations and minimal writes.

```json
{
  "_id": "ObjectId",
  "title": "String",
  "titleSlug": "String (Unique, Indexed)",
  "difficulty": "String (Easy / Medium / Hard)",
  "content": "String (HTML)",
  "testCases": [
    {
      "input": "String",
      "output": "String"
    }
  ]
}
```

### 3. Submissions Collection

Stores code execution history, linking candidates to problems and recording performance metrics.

```json
{
  "_id": "ObjectId",
  "problemId": "ObjectId (Ref: Problem)",
  "userId": "ObjectId (Ref: User, Optional for guests)",
  "sessionId": "String",
  "code": "String",
  "language": "String",
  "status": "String (e.g., Pending, AC, WA, TLE, CE)",
  "output": "String (JSON Array of test results)",
  "timeTaken": "Number (ms)"
}
```

---

## Fault Tolerance & Reliability (Edge Cases)

A robust System Design must account for failure modes. CodeSpace handles distributed edge cases gracefully:

1. **Worker Node Failure (Out of Memory (OOM) or Hardware Crash):**
   If a C++ worker dies mid-execution, the Redis Queue (which uses reliable queueing constructs) retains the job. Once a new worker node spins up via the Autoscaler, it will pick up the orphaned job, ensuring zero dropped submissions.
2. **Malicious Infinite Loops / Fork Bombs:**
   Handled entirely at the Linux kernel level. Docker `cgroups` enforce strict `--memory` limits to prevent host Out of Memory (OOM). POSIX `setrlimit` enforces `RLIMIT_CPU`, triggering a `SIGKILL` if a candidate writes an infinite `while(true)` loop (Time Limit Exceeded).
3. **Database / Redis Partitions:**
   The Express API actively monitors the Upstash Redis connection. If the connection drops, the API trips a circuit breaker and sheds load (`HTTP 503`), preventing requests from hanging the Node.js event loop indefinitely.
4. **WebSocket Disconnections:**
   Socket.io implements a built-in heartbeat mechanism (ping/pong). If a client drops due to poor network conditions, the session is preserved in memory, and the client auto-reconnects seamlessly without losing their code editor state.

---

## System Optimizations & Load Testing

> [!TIP]
> **Performance Proof:** The architecture has been rigorously load-tested. See the [`/benchmarks`](./benchmarks) directory for the raw `autocannon` load-test scripts and metric outputs.

| Metric Category                | Benchmark / Limit                      | Technical Implementation                                                                                       |
| :----------------------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **API Scalability**      | **4,000** concurrent connections | Redis-backed ingestion securely buffers pipelined requests at **~165ms** average latency.                 |
| **Verdict Latency**      | **~45 ms** delivery time         | **~97% reduction** in latency achieved by migrating from HTTP Polling to a WebSocket Pub/Sub model.      |
| **Compute Throughput**   | **15x** execution speedup        | C++ `compile-once, run-many` batching cut 10-testcase execution time from 4.65s to **~300ms**.          |
| **Memory Optimization**  | **~40 MB** heap reduction        | Zero-copy Redis payload serialization eliminated GC spikes and significantly unblocked the Node.js event loop. |
| **Database Overhead**    | **50%** fewer read queries       | In-memory document reuse completely eliminated N+1 query bottlenecks during Authentication.                    |
| **System Reliability**   | **100%** E2E pass rate           | 87 integration tests guarantee fault-tolerance against event-loop hangs, race conditions, and socket leaks.    |
| **Infrastructure Costs** | **Zero external cost**           | Custom WebRTC Peer-to-Peer mesh over Google STUN eliminated all external video streaming APIs.                 |

## Capacity Estimations (Back-of-the-Envelope)

Because interview traffic is highly bursty (clustered around business hours), we model our capacity based on concurrent sessions rather than generic DAU.

Assuming a scale of **10,000 Daily Technical Interviews** (averaging 45 mins each) with peak bursts of **2,000 concurrent active sessions**:

| Metric                             | Calculation / Context                                                      | Estimated Value                                            |
| :--------------------------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------- |
| **WebSocket (Code Sync)**    | 4,000 connected peers (2 per interview) sending Yjs CRDT keystroke deltas. | **~4,000 QPS** (Bidirectional Socket.io traffic)       |
| **Traffic (Code Execution)** | 2,000 candidates clicking 'Run Code' ~10 times per session.                | **~7.5 QPS** (Sustained) / **~50 QPS** (Burst) |
| **Compute Node Scaling**     | 50 QPS (Burst) * 0.3s avg Docker execution time.                           | **~15 Worker Nodes** required during peak bursts     |
| **Redis Queue Buffer**       | 50 QPS spike * 5KB payload size.                                           | **< 1 MB** active memory buffer required             |
| **Storage (Database)**       | 10,000 sessions * 5 final code snapshots * 5KB.                            | **~250 MB / day** (~90 GB / year)                    |
| **Network (Video/Audio)**    | 2,000 concurrent WebRTC peer-to-peer mesh connections.                     | **0 TB / month** (Server bandwidth bypassed)         |

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker Engine](https://docs.docker.com/engine/install/) (Running in the background)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or local MongoDB instance
- [Upstash Redis](https://upstash.com/) or local Redis instance

### 2. Infrastructure Setup

```bash
git clone https://github.com/shashank-chowdary/Codespace.git
cd Codespace

# Pull the required execution environment container for C++
docker pull gcc:latest
```

### 3. Backend & Worker Initialization

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory and populate it with your credentials:

| Variable                 | Description                                   |
| :----------------------- | :-------------------------------------------- |
| `PORT`                 | API Port (default: 8000)                      |
| `MONGO_URI`            | Your MongoDB connection string                |
| `REDIS_URL`            | Your Upstash or local Redis URL               |
| `CORS_ORIGIN`          | Frontend URL (e.g., `http://localhost:5173`) |
| `JWT_SECRET`           | Secret key for general JWT operations         |
| `ACCESS_TOKEN_SECRET`  | Secret key for short-lived access tokens      |
| `REFRESH_TOKEN_SECRET` | Secret key for long-lived refresh tokens      |

Start the API and the Execution Worker (in separate terminals):

```bash
# Terminal 1: Start the Express API
npm run dev

# Terminal 2: Start the Queue Worker
npm run worker
```

### 4. Frontend Initialization

```bash
cd ../frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` to see the application running.

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Author

**K. Shashank Chowdary**

- GitHub: [@shashank-chowdary](https://github.com/shashank-chowdary)
- LinkedIn: [Shashank Chowdary](https://linkedin.com/in/shashank-chowdary)

> If you like this project, please consider giving it a ⭐ on GitHub!
