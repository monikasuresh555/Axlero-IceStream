# IceStream: Real-Time Lakehouse Observability

An enterprise-grade, event-driven streaming pipeline and observability cockpit built to trace, audit, and safeguard real-time data flows before they commit to an Apache Iceberg lakehouse. 

This repository was designed as a high-performance monorepo for **Axlero Solutions** to demonstrate real-time stream processing, dynamic data-quality guardrails, and automated circuit breaker mechanisms.

---

## 📌 Project Overview (For Resumes & Interviews)

**IceStream** is a modern data platform designed to tackle **silent data corruption** in high-throughput streaming environments. In typical lakehouses, schema drifts, null injections, and out-of-bounds metrics (e.g. negative prices, unmapped taxes) bypass traditional ingestion layers and land in long-term tables, corrupting analytics.

### Key Achievements & Architecture
1. **Upstream Streaming**: A robust Python transaction simulator (under `generator/`) streams synthetic e-commerce traffic into **Apache Kafka** topic `checkout_events` with random data quality anomalies (e.g., negative prices and missing tax indicators).
2. **Stateful Stream Processing & Circuit Breaking**: **Apache Flink** (under `flink-pipeline/`) reads the Kafka stream, tracking rolling error statistics in low-latency managed states. If the null-tax anomaly rate exceeds **2.0%**, a custom **Flink Circuit Breaker** triggers instantly, dynamically diverting corrupt records away from primary storage to an Apache Iceberg Dead Letter Queue (DLQ) table (`ecommerce_events_dlq`).
3. **Data Quality Assertions**: **Great Expectations** (under `observability/`) acts as an asynchronous batch auditor, asserting strict structural boundaries (`amount > 0`, `tax_amount is not null` on 90% of rows) to establish trust.
4. **Real-time API Gateway**: A **Node.js + Express + TypeScript** server (under `backend/`) aggregates Great Expectations validation reports, exposes REST APIs for incidents, and establishes standard **WebSockets** to push live telemetry.
5. **Observability Cockpit**: An immersive React dashboard (under `frontend/`) visualizing the dynamic data-lineage topology via **React Flow**, plotting throughput metrics via **Recharts**, and displaying a live feed of active incidents.

---

## 🛠 Tech Stack

* **Streaming Core**: Python 3.10, Apache Kafka 3.4
* **Stream Processor**: Apache Flink 1.17 (Java 11)
* **Storage Engine**: Apache Iceberg 1.3 (backed by MinIO object storage)
* **Data Validation**: Great Expectations 0.17
* **API Ingress & Real-time WS**: Node.js, Express, TypeScript, WebSocket (ws)
* **Observability UI**: React 18, Vite, Tailwind CSS, React Flow, Recharts
* **Infrastructure**: Docker, Docker Compose

---

## 📂 Repository Layout

```
├── generator/                 # Python telemetry stream generator
│   ├── main.py                # Producer logic with anomaly injection
│   ├── requirements.txt
│   └── Dockerfile
├── flink-pipeline/            # Apache Flink stream job (Java + Maven)
│   ├── src/main/java/...      # Stateful stream circuit breaker code
│   ├── pom.xml                # Maven dependencies
│   └── Dockerfile
├── observability/             # Great Expectations quality engine
│   ├── validate.py            # GE validation suite 
│   ├── requirements.txt
│   └── Dockerfile
├── backend/                   # Node.js Express server + WebSocket 
│   ├── src/server.ts          # REST endpoints & telemetry broadcaster
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── frontend/                  # React Vite client dashboard
│   ├── src/App.tsx            # React Flow & Recharts visual layout
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml         # Container orchestration map
└── README.md                  # Detailed platform documentation
```

---

## 🚀 How to Run the Monorepo (Step-by-Step)

### Prerequisites
Make sure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your local machine.

### Step 1: Boot the Platform Services
Spin up Kafka, Flink, MinIO, Great Expectations, the Express gateway, and the React frontend with a single command:
```bash
docker-compose up --build -d
```
*This command compiles the Flink Java fat-jar inside the builder container, configures the environment variables, and launches all microservices in the background.*

### Step 2: Verify Running Containers
Check the status of your containers to make sure everything booted successfully:
```bash
docker-compose ps
```
You will see the following services listening:
* **Vite React Dashboard**: `http://localhost:3000`
* **Express Gateway Server**: `http://localhost:3001`
* **Flink Web Dashboard**: `http://localhost:8081`
* **MinIO Object Console**: `http://localhost:9001` (User: `admin` | Pass: `password123`)

### Step 3: Stream Live Telemetry & Test Circuit Breakers
1. Open `http://localhost:3000` in your browser.
2. Observe the standard, healthy flow: particles streaming from **Kafka** through **Flink** into the primary **Iceberg main table** (`ecommerce_events`). The error rate remains `< 1%`.
3. Click the **"Inject Anomalous Stream"** button on the control bar.
4. Watch the Flink processor and Great Expectations validate live. The error rate spikes immediately.
5. Once the null-tax rate crosses **2.0%**, the Flink stateful evaluator engages the **Stream Circuit Breaker**. 
6. Watch the **React Flow Lineage Map** change instantly: traffic is rerouted into the **DLQ Iceberg table** (`ecommerce_events_dlq`), and a critical system warning is dispatched to the incident log.
7. Click **"Resolve Injected Anomaly"** to return the pipeline to healthy conditions.

---

## 🧪 Development & Testing (Manual Mode)

If you wish to run services locally (outside of Docker container networks) for debugging, use these commands:

### Running the Python Generator
```bash
cd generator
pip install -r requirements.txt
export KAFKA_BOOTSTRAP_SERVERS="localhost:29092"
python main.py
```

### Building the Flink Java Jar
```bash
cd flink-pipeline
mvn clean package
```

### Booting the Express API Gateway
```bash
cd backend
npm install
npm run dev
```

### Launching the Frontend Client
```bash
cd frontend
npm install
npm run dev


```## Running IceStream with Docker

docker compose up -d

Check services:
docker compose ps

Flink Dashboard:
http://localhost:8081

Kafka:
localhost:9092

MinIO Console:
http://localhost:9001


## Pipeline Verification

Check Flink jobs:

docker exec icestream-flink-jobmanager /opt/flink/bin/flink list

Check Kafka topics:

docker exec icestream-kafka kafka-topics --bootstrap-server kafka:9092 --list

Send test checkout events:

docker exec -it icestream-kafka kafka-console-producer --bootstrap-server kafka:9092 --topic checkout_events
