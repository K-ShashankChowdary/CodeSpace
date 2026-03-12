<div align="center">
  <h1>CodeSpace</h1>
  <p><strong>A Distributed Real-Time Code Execution Engine & Educational Dashboard</strong></p>

<div align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB_Atlas-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas" />
  <img src="https://img.shields.io/badge/Upstash_Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Upstash Redis" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS EC2" />
</div>
  <br/>
  <a href="https://codespace-ecru.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Production_Environment-codespace--ecru.vercel.app-blue?style=for-the-badge&logo=vercel" alt="Live Website" />
  </a>
</div>

## Overview

CodeSpace is a distributed, real-time code execution engine engineered for sub-second latency and horizontal scalability. It serves as a robust backend system capable of securely compiling and evaluating untrusted C++ code against hidden test cases. The platform is designed with two distinct modes of operation: a **Solo Practice Mode** ("Solve Alone") for independent algorithmic problem-solving, and a **Classroom Mode** ("Host Room") utilizing a stateful WebSocket architecture. In Classroom Mode, teachers can orchestrate secure environments to monitor live student progression via a real-time tracking dashboard.

## System Architecture

The infrastructure utilizes decoupled compute services communicating via managed cloud message queues and persistent WebSocket tunnels to ensure low-latency state synchronization without risking main thread bottlenecking.

**Data Evaluation Flow:**
`React Frontend (Vercel)` ➔ `Nginx Proxy (EC2)` ➔ `Express API (Producer)` ➔ `Upstash Redis Queue` ➔ `Worker Node (Consumer)` ➔ `Dockerized C++ Executor` ➔ `Socket.io Broadcast` ➔ `React Frontend`

1. **Submission Ingestion**: The client transmits execution requests to the main Express API via HTTP. Nginx proxies these incoming requests.
2. **Producer-Consumer Offloading**: To prevent the primary API from bottlenecking during concurrent submissions, the Express server acts as a producer. It validates the request payload and offloads it into a serverless **Upstash Redis** message queue.
3. **Remote Code Execution (RCE) & Sandboxing**: Independent worker nodes act as consumers, continually polling the remote Redis queue. They dequeue tasks and securely compile/execute the C++ code within isolated Docker containers acting as ephemeral sandboxes. Resource limits (Time Limit Exceeded/TLE and Memory Limit Exceeded/MLE) are strictly enforced.
4. **State Broadcast**: Execution verdicts (AC, WA, TLE, RE, CE) are emitted back to the main API via a pub/sub mechanism employing Socket.io to stream real-time execution results back to the individual user or instantly to the teacher's active dashboard instance.

## Core Features

- **Dual Execution Modes**: 
  - **Solve Alone**: An isolated environment for individual developers to independently write, compile, and evaluate code against test cases.
  - **Host Room**: Stateful, WebSocket-based classroom environments tracked persistently via MongoDB Atlas, allowing educators to generate secure sessions for students to join.
- **Live Teacher Dashboard**: Bidirectional state synchronization providing educators with an instant, matrix-style overview of student submission verdicts.
- **Dockerized Remote Code Execution (RCE)**: Evaluates untrusted C++ dynamically within isolated Docker containers against hidden test cases.
- **Strict Resource Limits**: Enforces execution bounds (TLE/MLE) to secure the sandboxed environment against adversarial or poorly optimized scripts.
- **Cloud-Native Message Queuing**: Utilizes Upstash Redis to distribute heavy compilation workloads asynchronously, mitigating API blocking under concurrent classroom load.

## Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS |
| **Backend API Component** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose |
| **Infrastructure / DevOps** | AWS EC2 (Ubuntu), PM2, Nginx, Docker |
| **State & Queuing Pipeline** | Upstash (Serverless Redis), Socket.io |

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `PORT` | The port the Express API listens on (e.g., `8000`) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Upstash Redis instance connection string |
| `CORS_ORIGIN` | Allowed domains for cross-origin requests |
| `JWT_SECRET` | Secret key for JSON Web Token signing |

## Local Setup

### 1. Repository Initialization
```bash
git clone https://github.com/shashank-chowdary/Codespace.git
cd Codespace
```

### 2. Infrastructure Setup
Ensure the local host has active daemon processes for Docker. You will also need your remote cloud URIs for MongoDB Atlas and Upstash Redis.

```bash
# Pull the required C++ execution environment container
docker pull gcc:latest
```

### 3. Backend & Worker Initialization
Install dependencies and configure environment variables.

```bash
cd backend
npm install
# Populate .env file based on the Environment Variables table
```

Start the primary API server and the background execution worker:

```bash
# Start the Express API (Producer)
npm run dev

# In a separate terminal session, start the queue worker (Consumer)
node src/worker.js 
```

### 4. Frontend Initialization
```bash
cd ../frontend
npm install
npm run dev
```

## Production Deployment & Infrastructure

CodeSpace utilizes a distributed, cloud-native deployment architecture, mapping compute and data services to optimized runtime environments.

### Client Delivery
- **Frontend**: Hosted on **Vercel** to leverage its global edge CDN for low-latency React/Vite static asset delivery.

### Data Layer (Fully Managed)
- **Database**: Hosted on **MongoDB Atlas** for secure, high-availability cluster storage.
- **Message Queue**: Hosted on **Upstash** as a serverless Redis instance, providing low-latency, connection-optimized queuing without the overhead of maintaining a local Redis server.

### Backend APIs & Worker Nodes
- **Compute Instance**: The Node.js Express API and isolated Dockerized C++ worker nodes are deployed on an **AWS EC2 (Ubuntu)** server.
- **Process Management**: Both the Express API and the execution workers are managed via **PM2**. This daemonizes the processes, ensuring automated restarts and log aggregation for high availability.
- **Reverse Proxy**: **Nginx** operates on the EC2 instance as the primary internet-facing proxy. It handles:
  - **SSL Termination**: Offloading HTTPS cryptographic processes before routing internal requests.
  - **IPv4 Routing**: Forwarding standard REST API traffic directly to the Express service running on localhost.
  - **WebSocket Upgrades**: Nginx explicitly intercepts Socket.io HTTP polling sequences and injects `Connection: Upgrade` and `Upgrade: websocket` headers. This reliably transitions standard HTTP connections into permanent, bidirectional `wss://` WebSocket tunnels bridging the Vercel client and the AWS EC2 instance.
