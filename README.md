
<div align="center">
  <img src="./docs/logo-placeholder.png" alt="CodeSpace Logo" width="120" />
  <h1>CodeSpace</h1>
  <p><strong>A Distributed Real-Time Code Execution Engine & Educational Dashboard</strong></p>

---

## 📖 Overview

**CodeSpace** is a distributed, horizontally scalable full-stack SaaS platform engineered for technical interviews and algorithmic problem-solving. It securely compiles and evaluates untrusted user-submitted code (C++, Python, Java, JS, C) against hidden test cases.

By leveraging a decoupled producer-consumer architecture, ephemeral Docker sandboxing, and real-time WebRTC/WebSocket communication layers, CodeSpace is capable of sustaining **thousands of concurrent users** while maintaining sub-second verdict latency.

---

## 📑 Table of Contents

- [✨ Core Features](#-core-features)
- [🏗️ System Architecture &amp; Data Flow](#️-system-architecture--data-flow)
- [📐 Architectural Decisions](#-architectural-decisions)
- [⚡ Optimizations &amp; Benchmarks](#-optimizations--benchmarks)
- [🚀 Getting Started](#-getting-started)
- [📄 License](#-license)

---

## ✨ Core Features

- **Automated LeetCode Integration:** Paste any LeetCode problem URL to instantly mirror the problem on CodeSpace. A GraphQL integration queries LeetCode's external API, dynamically parsing titles, descriptions, constraints, and test cases directly into the MongoDB database.
- **P2P Video Conferencing:** Embedded WebRTC video streaming allows seamless, zero-latency communication during technical interviews.
- **Real-Time Workspace Synchronization:** Code editors (Monaco) are synchronized in real-time across clients using WebSockets and Yjs (CRDTs).
- **Multi-Language Sandboxing:** C++, Python, Java, JavaScript, and C code is strictly evaluated inside ephemeral Docker environments with hard boundaries on Memory and Time (MLE/TLE).

> **Watch it in action:**
>
>
>
> *(A visual walkthrough of the real-time collaboration and execution engine)*

---

## 🏗️ System Architecture & Data Flow

CodeSpace is built to avoid main-thread blocking by strictly decoupling API ingestion from compute-heavy compilation tasks.

### Online Code Execution Pipeline (Producer-Consumer)

![Online Code Execution Pipeline Architecture](./docs/pipeline-architecture.png)
*(Placeholder: To be updated with Excalidraw diagram)*

1. **Ingestion:** React client sends source code to the Node.js API (Producer).
2. **Buffering:** The Producer validates the payload and pushes it to an **Upstash Redis Queue**.
3. **Consumption:** Independent C++ Worker nodes (Consumers) long-poll the queue.
4. **Sandboxing:** Workers spin up isolated **Docker containers** to run untrusted code. MLE/TLE limits are strictly enforced via POSIX boundaries.
5. **Real-time Broadcast:** Verdicts (AC, WA, RE, CE, TLE, MLE) are emitted via **Socket.io** back to the Producer, which pushes the update to the React client via persistent WebSocket tunnels.

### Real-Time Collaboration & WebRTC Signaling

![Real-Time Collaboration & WebRTC Signaling Architecture](./docs/webrtc-architecture.png)
*(Placeholder: To be updated with Excalidraw diagram)*

- **Code Synchronization:** Utilizes **Yjs (Conflict-free Replicated Data Types)** to merge keystrokes seamlessly over WebSockets without server-side conflict resolution overhead.
- **Media Streaming:** Video and audio bypass the server. The Node.js API acts strictly as a WebRTC signaling mechanism (SDP exchange). The browser then utilizes Google STUN servers to punch through NATs, establishing a zero-latency **Peer-to-Peer UDP Mesh**.

---

## 📐 Architectural Decisions

CodeSpace is engineered to mitigate the inherent security and scalability risks of online code execution at scale by treating the execution environment as entirely untrusted.

### 1. Why the MERN Stack?

* **Alternatives:** Java/Spring Boot (Backend), PostgreSQL (Database).
* **The Decision (Node.js):** The asynchronous event-driven architecture manages thousands of persistent WebSocket tunnels without the massive memory overhead of a thread-per-request model.
* **The Decision (MongoDB):** A NoSQL document store perfectly aligns with the highly nested JSON payloads retrieved via the LeetCode GraphQL integration, completely avoiding rigid SQL migrations.

### 2. Why C++ for the Execution Worker Engine?

* **Alternatives:** Node.js `child_process`, Python `subprocess`, or Go.
* **The Decision:** C++ provides the lowest-level POSIX system calls (`wait4`, `setrlimit`) to strictly enforce CPU and Memory limits (TLE/MLE). It traps OS-level signals (e.g., `SIGSEGV` for array out-of-bounds, `SIGFPE` for math errors) and maps them to accurate "Runtime Errors" just like LeetCode.

### 3. Why WebRTC instead of WebSockets for Video?

* **The Decision:** WebSockets use TCP, where packet loss causes head-of-line blocking (latency spikes). WebRTC utilizes **UDP/RTP**, allowing packet loss without halting the stream, resulting in smooth, sub-50ms latency. The **P2P mesh** eliminates server bandwidth costs entirely.

### 4. Why WebSockets for Execution Verdicts?

* **Alternatives:** HTTP Short Polling.
* **The Decision:** HTTP Polling introduces massive TCP handshake overhead. WebSockets establish a single persistent TCP tunnel, reducing network overhead by ~97% and pushing verdict latency down from 1.5s to **~45ms**.

### 5. Why Redis Queues?

* **The Decision:** Spawning heavy compilation processes directly blocks the Node.js event loop. Upstash Redis acts as a message broker, allowing the API to enqueue a job (an O(1) operation taking <2ms) and immediately return. Independent workers consume the queue at their own pace.

### 6. Why a Custom Node.js Autoscaler?

* **Alternatives:** Kubernetes (KEDA).
* **The Decision:** To keep the project accessible without cloud costs, CodeSpace opts for a **Custom Node.js Autoscaler Daemon**. It monitors the Redis queue length and dynamically forks `child_process` workers locally to chew through submission spikes, perfectly mimicking KEDA's behavior in a localized environment.

### 7. Why a 3-Tiered Rate Limiting Strategy?

We employ a 3-tiered defense against traffic spikes and malicious actors:

1. **Worker Autoscaler (Scale Up):** Spin up more Docker workers dynamically.
2. **Global Capacity Limiting (Load Shedding):** If the queue exceeds capacity (e.g., >50), the API rejects requests (HTTP 503 `Server busy`) to prevent OOM crashes.
3. **Redis-Backed Anti-Spam:** A personal rate limiter (10 req/min) prevents a single user from triggering the global load shed.

### 8. Why System Integration Testing?

* **The Decision:** Given the heavy reliance on external stateful infrastructure (MongoDB, Redis, Docker) and asynchronous real-time events (WebSockets), unit tests are insufficient. Integration tests provide a true representation of the production environment by testing the entire distributed data flow, ensuring no race conditions, dangling sockets, or deadlocks occur.

---

## ⚡ Optimizations & Benchmarks

> [!TIP]
> **Performance Proof:** The architecture has been rigorously load-tested using custom `autocannon` scripts and benchmark suites.

- **API Scalability Limit:** The Redis-backed ingestion pipeline sustains a maximum limit of **4,000 concurrent API connections** (40,000 pipelined requests) with a stable average latency of **165.55 ms** before degrading.
- **Execution Latency:** The C++ executor binary orchestrates Docker lifecycles with an average overhead of just **190.88 ms** per execution.
- **Data Serialization:** Node.js JSON serialization for 5.5MB payloads (50 large test cases) operates at **10.97 ms**, proving the V8 engine can handle massive mock payloads without blocking the event loop.

---

## 🛡️ Security & System Resilience

- **Application Security (AppSec):** Enforces strict HTTP security headers globally utilizing **Helmet.js** to mitigate OWASP Top 10 vulnerabilities (XSS, MIME-sniffing, Clickjacking).
- **Configuration Safety:** Strict Environment Variable validation using **Zod**. The server refuses to boot if required secrets are missing, preventing silent runtime crashes in production.
- **Graceful Shutdowns:** Captures OS-level `SIGINT` and `SIGTERM` signals. The server safely drains active HTTP connections, disconnects MongoDB, and flushes the Redis queue to prevent data corruption during deployments.
- **Quality Assurance:** Maintains **99% test coverage** on core backend controllers. Ensures execution accuracy via a 21-case language-agnostic integration test matrix.

---

## 🚀 Getting Started

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

Create a `.env` file in the `backend/` directory:

```ini
PORT=8000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_super_secret_key
ACCESS_TOKEN_SECRET=your_super_secret_key
REFRESH_TOKEN_SECRET=your_super_secret_key
```

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

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
