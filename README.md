# IceStream – Real-Time Lakehouse Observability

> **Real-time data quality, stream processing, and lakehouse observability platform built with Apache Kafka, Apache Flink, Apache Iceberg, MinIO, PostgreSQL, Node.js, React, and Docker.**

IceStream is a real-time data engineering and observability platform designed to detect data quality issues as streaming data moves through a modern lakehouse pipeline.

The system continuously generates simulated checkout events, ingests them through Apache Kafka, processes and validates the events using Apache Flink, identifies invalid or anomalous records, and exposes pipeline health and observability information through a web dashboard.

The project demonstrates how real-time data quality monitoring can help detect **bad data, schema drift, invalid records, and pipeline issues before they reach downstream analytics systems**.

---

## Table of Contents

* [Problem Statement](#problem-statement)
* [Solution](#solution)
* [Key Features](#key-features)
* [Architecture](#architecture)
* [Data Flow](#data-flow)
* [Technology Stack](#technology-stack)
* [Project Structure](#project-structure)
* [Components](#components)
* [Data Quality Monitoring](#data-quality-monitoring)
* [Failure and DLQ Handling](#failure-and-dlq-handling)
* [Observability Dashboard](#observability-dashboard)
* [Running the Project](#running-the-project)
* [Verifying the Pipeline](#verifying-the-pipeline)
* [Kafka Topics](#kafka-topics)
* [Flink Pipeline](#flink-pipeline)
* [Docker Services](#docker-services)
* [Example Event](#example-event)
* [Testing Data Quality](#testing-data-quality)
* [Troubleshooting](#troubleshooting)
* [Future Enhancements](#future-enhancements)
* [Learning Outcomes](#learning-outcomes)
* [Conclusion](#conclusion)

---

# Problem Statement

Traditional batch ETL pipelines can introduce significant delays between data generation and data availability for analytics.

Data quality problems such as:

* Missing fields
* Invalid values
* Schema changes
* Unexpected fields
* Malformed records
* Invalid business data

may remain undetected until downstream dashboards, reports, or analytics pipelines fail.

This creates a **"garbage in, garbage out"** problem.

IceStream addresses this by introducing **real-time data quality validation and observability directly into the streaming pipeline**.

---

# Solution

IceStream implements a real-time lakehouse observability pipeline:

```text
Data Generator
      │
      ▼
Apache Kafka
      │
      ▼
Apache Flink
      │
      ├── Data Validation
      ├── Data Quality Checks
      ├── Anomaly Detection
      ├── Circuit Breaker
      │
      ├──────────────► Valid Data
      │
      └──────────────► Invalid Data / DLQ
                            │
                            ▼
                     Observability Layer
                            │
                            ▼
                    Backend API / WebSocket
                            │
                            ▼
                    React Dashboard
```

The platform allows pipeline health and data quality issues to be detected while data is being processed instead of after downstream systems fail.

---

# Key Features

## Real-Time Event Ingestion

The Python data generator continuously creates simulated checkout transactions and publishes streaming events to Kafka.

Events contain information such as:

* Order ID
* User ID
* Amount
* Tax amount
* Currency
* Country
* Payment method
* Timestamp

The generator can also introduce intentionally invalid or unexpected data for testing the data-quality pipeline.

---

## Kafka-Based Streaming

Apache Kafka acts as the event streaming backbone of IceStream.

Kafka provides:

* High-throughput event ingestion
* Decoupled producers and consumers
* Persistent event storage
* Consumer group support
* Reliable streaming communication

---

## Apache Flink Stream Processing

Apache Flink consumes checkout events from Kafka and processes them continuously.

The Flink pipeline performs:

* Stream ingestion
* Data validation
* Data quality processing
* Error handling
* Event transformation
* Pipeline monitoring

The application uses Flink's streaming APIs and Kafka connector.

---

## Real-Time Data Quality Validation

IceStream validates incoming events before allowing them to continue through the processing pipeline.

Examples of checks include:

* Required field validation
* Schema validation
* Numeric field validation
* Unexpected field detection
* Malformed event detection
* Data consistency checks

Invalid events can be routed to a Dead Letter Queue instead of disrupting the complete pipeline.

---

## Dead Letter Queue

Invalid or problematic records can be isolated in a dedicated Kafka topic.

This prevents bad records from continuously affecting the main processing pipeline.

Example:

```text
checkout_events
       │
       ▼
     Flink
       │
   ┌───┴────┐
   │        │
Valid    Invalid
   │        │
   ▼        ▼
Process   DLQ
          │
          ▼
  lake-events-dlq
```

The DLQ provides a mechanism for later investigation and debugging of problematic events.

---

## Streaming Circuit Breaker

IceStream includes a streaming circuit-breaker component to prevent continuous processing failures from propagating through the pipeline.

The circuit-breaker logic uses Flink stateful processing to maintain processing state and react to repeated failures.

This improves pipeline resilience and provides a foundation for production-style failure handling.

---

# Architecture

```text
                         ┌─────────────────────┐
                         │   Python Generator  │
                         │                     │
                         │ Checkout Events     │
                         │ Normal / Bad Data   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Apache Kafka     │
                         │                     │
                         │ checkout_events     │
                         │ lake-events         │
                         │ lake-events-dlq      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Apache Flink     │
                         │                     │
                         │ Kafka Source        │
                         │ Validation          │
                         │ Processing          │
                         │ Circuit Breaker     │
                         └───────┬─────┬───────┘
                                 │     │
                         Valid ──┘     └── Invalid
                                 │             │
                                 ▼             ▼
                         ┌────────────┐  ┌────────────┐
                         │  Lakehouse  │  │    DLQ     │
                         │   Storage   │  │   Kafka    │
                         │             │  │            │
                         │ Iceberg     │  │ Bad Events │
                         │ MinIO       │  │            │
                         └──────┬──────┘  └────────────┘
                                │
                                ▼
                       ┌─────────────────────┐
                       │   Backend Gateway   │
                       │                     │
                       │ Node.js / Express   │
                       │ REST APIs           │
                       │ WebSocket           │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │   React Dashboard   │
                       │                     │
                       │ Pipeline Health     │
                       │ Event Metrics       │
                       │ Data Quality        │
                       │ Alerts / Status     │
                       └─────────────────────┘
```

---

# Data Flow

The complete data flow is:

### 1. Event Generation

The Python simulator generates checkout events continuously.

Example:

```json
{
  "order_id": "b2c64d43-46f1-405e-98aa-98bc51f75bca",
  "user_id": "2a917323-4c73-4f30-8aeb-40be30e8202b",
  "amount": 12.94,
  "tax_amount": 1.04,
  "currency": "USD",
  "country": "GBR",
  "payment_method": "CREDIT_CARD",
  "timestamp": "2026-08-16T06:26:29.247550+00:00"
}
```

---

### 2. Kafka Ingestion

Events are published to the Kafka streaming infrastructure.

Primary event topic:

```text
checkout_events
```

---

### 3. Flink Processing

Apache Flink consumes the events using the Kafka source connector.

The pipeline processes events continuously without requiring batch execution.

---

### 4. Validation

Incoming records are checked for data quality and structural problems.

Valid records continue through the pipeline.

Invalid records are isolated for further analysis.

---

### 5. Storage

Processed data can be persisted in the lakehouse layer using:

* Apache Iceberg
* MinIO object storage
* PostgreSQL catalog

---

### 6. Observability

The backend exposes pipeline information to the frontend through REST APIs and WebSocket communication.

---

### 7. Dashboard

The React dashboard provides a visual representation of:

* Pipeline status
* Streaming activity
* Event counts
* Data quality
* Errors
* DLQ activity
* Processing health

---

# Technology Stack

| Layer                   | Technology                            |
| ----------------------- | ------------------------------------- |
| Data Generator          | Python                                |
| Event Streaming         | Apache Kafka                          |
| Stream Processing       | Apache Flink                          |
| Data Quality            | Flink validation / Great Expectations |
| Lakehouse Format        | Apache Iceberg                        |
| Object Storage          | MinIO                                 |
| Metadata Catalog        | PostgreSQL                            |
| Backend                 | Node.js                               |
| API                     | Express.js                            |
| Real-Time Communication | WebSocket                             |
| Frontend                | React                                 |
| Containerization        | Docker                                |
| Orchestration           | Docker Compose                        |
| Build Tool              | Maven                                 |

---

# Project Structure

```text
ICESTREAM/
│
├── docker-compose.yml
│
├── flink-pipeline/
│   ├── pom.xml
│   ├── src/
│   │   └── main/
│   │       └── java/
│   │           └── com/
│   │               └── icestream/
│   │                   └── pipeline/
│   │                       ├── IceStreamPipeline.java
│   │                       ├── process/
│   │                       │   ├── IceStreamPipelineDLQ.java
│   │                       │   └── StreamingCircuitBreaker.java
│   │                       └── util/
│   │                           └── Constants.java
│   └── target/
│       └── flink-pipeline-1.0.0.jar
│
├── data-generator/
│   ├── src/
│   ├── Dockerfile
│   └── requirements.txt
│
├── express-gateway/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── frontend-dashboard/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── minio/
│
└── README.md
```

---

# Components

## 1. Data Generator

The generator simulates a continuous stream of checkout transactions.

It supports different event scenarios so the pipeline can be tested with:

* Normal events
* Invalid events
* Unexpected fields
* Data-quality problems
* Schema-related problems

The generator runs as a Docker service.

---

# 2. Apache Kafka

Kafka is responsible for receiving and distributing streaming events.

The project uses topics including:

```text
checkout_events
lake-events
lake-events-dlq
```

Kafka decouples the data generator from the Flink processing layer.

---

# 3. Apache Flink

The main Flink application is:

```text
IceStreamPipeline.java
```

The Kafka source is configured using:

```java
KafkaSource.<String>builder()
    .setBootstrapServers(kafkaBroker)
    .setTopics(topic)
    .setGroupId("icestream-flink-consumer")
    .setStartingOffsets(OffsetsInitializer.latest())
    .setValueOnlyDeserializer(new SimpleStringSchema())
    .build();
```

The Kafka broker is configurable through:

```text
KAFKA_BOOTSTRAP_SERVERS
```

For Docker-based execution:

```text
kafka:9092
```

The Kafka topic is configurable through:

```text
KAFKA_TOPIC
```

with the default:

```text
checkout_events
```

---

# 4. Data Quality / DLQ Processing

The pipeline is designed to separate valid and problematic records.

A problematic record should not automatically cause the complete streaming application to fail.

Instead, the system provides a Dead Letter Queue mechanism for isolating problematic events.

This makes debugging and later remediation easier.

---

# 5. Lakehouse Storage

The lakehouse layer uses Apache Iceberg for table-oriented analytical storage.

MinIO provides S3-compatible object storage for the data layer.

PostgreSQL is used as the metadata/catalog component.

Conceptually:

```text
Flink
  │
  ▼
Apache Iceberg
  │
  ├── Metadata
  │      │
  │      ▼
  │   PostgreSQL
  │
  └── Data Files
         │
         ▼
       MinIO
```

This architecture provides a foundation for scalable analytical storage while retaining streaming ingestion.

---

# 6. Backend Gateway

The Node.js/Express backend acts as the API and orchestration layer.

Responsibilities include:

* Exposing pipeline information
* Providing dashboard APIs
* Managing real-time communication
* Connecting frontend clients with pipeline information
* Supporting observability controls

WebSocket communication is used where real-time dashboard updates are required.

---

# 7. React Dashboard

The React frontend provides the observability interface.

The dashboard is designed to make the streaming pipeline easier to monitor by exposing:

* Pipeline status
* Event processing activity
* Data quality information
* Error information
* DLQ information
* Streaming metrics

The frontend is containerized and exposed through port `3000`.

---

# Data Quality Monitoring

IceStream focuses on detecting data problems as early as possible.

Examples of intentionally introduced problematic data include unexpected fields:

```json
{
  "order_id": "123",
  "amount": 250.50,
  "currency": "INR",
  "extra_field": "unexpected"
}
```

The presence of unexpected fields can be used to demonstrate schema-drift detection.

Other validation scenarios can include:

```text
Missing order_id
Invalid amount
Missing currency
Malformed JSON
Unexpected fields
Invalid payment method
Invalid country
```

The goal is to prevent such records from silently propagating into downstream analytical systems.

---

# Failure and DLQ Handling

A key design principle of IceStream is:

> **A bad record should not bring down the entire streaming pipeline.**

The processing architecture therefore separates:

```text
Valid Data
    │
    ▼
Normal Processing
```

from:

```text
Invalid Data
    │
    ▼
Dead Letter Queue
    │
    ▼
Investigation / Remediation
```

This approach improves:

* Reliability
* Debuggability
* Data quality
* Fault isolation
* Operational visibility

---

# Observability Dashboard

The dashboard provides a centralized view of the streaming pipeline.

Expected observability areas include:

### Pipeline Health

```text
Pipeline Status
Kafka Status
Flink Status
Backend Status
```

### Streaming Metrics

```text
Events processed
Events received
Processing activity
Error count
```

### Data Quality

```text
Valid records
Invalid records
Schema issues
Validation failures
```

### DLQ

```text
DLQ events
Failure reasons
Problematic records
```

---

# Running the Project

## Prerequisites

Install the following:

* Docker Desktop
* Git
* Java/JDK compatible with the Flink build
* Maven
* Node.js (for local frontend/backend development if required)

Docker Desktop should be running before starting the project.

---

# 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd ICESTREAM
```

---

# 2. Build the Flink Pipeline

From the project root:

```powershell
cd flink-pipeline
mvn clean package -DskipTests
```

The generated JAR should be available at:

```text
target/flink-pipeline-1.0.0.jar
```

---

# 3. Start the Docker Environment

Return to the project root:

```powershell
cd ..
docker compose up -d
```

Check the services:

```powershell
docker compose ps
```

All required services should show a running status.

---

# 4. Start Kafka

If Kafka needs to be restarted independently:

```powershell
docker compose up -d kafka
```

Verify Kafka:

```powershell
docker compose ps kafka
```

---

# 5. Verify Kafka Topics

Run:

```powershell
docker exec icestream-kafka kafka-topics --bootstrap-server kafka:9092 --list
```

Expected topics include:

```text
checkout_events
lake-events
lake-events-dlq
```

---

# 6. Verify the Data Generator

Check the generator:

```powershell
docker logs --tail 30 icestream-generator
```

The output should contain continuously generated checkout events.

---

# 7. Verify Flink

Open the Flink dashboard:

```text
http://localhost:8081
```

Or check from PowerShell:

```powershell
curl.exe -s http://localhost:8081/jobs/overview
```

---

# 8. Submit the Flink Job

The Flink JAR is available inside the JobManager container at:

```text
/opt/flink/usrlib/flink-pipeline-1.0.0.jar
```

Submit the streaming job:

```powershell
docker exec icestream-flink-jobmanager flink run -d /opt/flink/usrlib/flink-pipeline-1.0.0.jar
```

A successful submission returns a JobID.

Example:

```text
Job has been submitted with JobID b7ef74526500a934da75c025baa8ce38
```

---

# 9. Verify Job Status

Run:

```powershell
curl.exe -s http://localhost:8081/jobs/overview
```

The submitted job should eventually show:

```text
"state":"RUNNING"
```

The Flink job should contain:

```text
Source: Kafka Checkout Stream
```

followed by the processing/sink stage.

---

# 10. Monitor TaskManager Logs

Use:

```powershell
docker logs --tail 100 icestream-flink-taskmanager
```

To specifically search for errors:

```powershell
docker logs --tail 200 icestream-flink-taskmanager |
    Select-String "ERROR|Exception|Kafka|DLQ"
```

---

# Verifying the Pipeline

A complete verification should confirm the following:

### Kafka

```text
Kafka container → RUNNING
```

### Data Generator

```text
Events → continuously generated
```

### Kafka Topic

```text
checkout_events → receiving events
```

### Flink

```text
Job → RUNNING
```

### Flink Source

```text
Kafka Checkout Stream → RUNNING
```

### Processing

```text
Events → processed continuously
```

### DLQ

```text
Invalid events → isolated for investigation
```

### Dashboard

```text
Frontend → accessible
Backend → accessible
Observability metrics → displayed
```

---

# Kafka Topics

| Topic                | Purpose                                |
| -------------------- | -------------------------------------- |
| `checkout_events`    | Main stream of checkout events         |
| `lake-events`        | Lakehouse/processed event stream       |
| `lake-events-dlq`    | Invalid or failed events               |
| `__consumer_offsets` | Kafka internal consumer offset storage |

---

# Docker Services

The project runs multiple services using Docker Compose.

| Service                       | Purpose               | Port            |
| ----------------------------- | --------------------- | --------------- |
| `icestream-kafka`             | Event streaming       | `9092`, `29092` |
| `icestream-zookeeper`         | Kafka coordination    | `2181`          |
| `icestream-flink-jobmanager`  | Flink JobManager      | `8081`          |
| `icestream-flink-taskmanager` | Flink processing      | `6123`          |
| `icestream-generator`         | Event generation      | -               |
| `icestream-minio`             | Object storage        | `9000`, `9001`  |
| `icestream-backend`           | Node.js API/WebSocket | `3001`          |
| `icestream-frontend`          | React dashboard       | `3000`          |

---

# Useful Docker Commands

### View all services

```powershell
docker compose ps
```

### Start the complete stack

```powershell
docker compose up -d
```

### Stop the stack

```powershell
docker compose down
```

### Restart Kafka

```powershell
docker compose restart kafka
```

### Restart Flink

```powershell
docker compose restart flink-jobmanager flink-taskmanager
```

### View generator logs

```powershell
docker logs -f icestream-generator
```

### View Flink TaskManager logs

```powershell
docker logs -f icestream-flink-taskmanager
```

### View backend logs

```powershell
docker logs -f icestream-backend
```

---

# Example Event

A normal checkout event looks like:

```json
{
  "order_id": "b2c64d43-46f1-405e-98aa-98bc51f75bca",
  "user_id": "2a917323-4c73-4f30-8aeb-40be30e8202b",
  "amount": 12.94,
  "tax_amount": 1.04,
  "currency": "USD",
  "country": "GBR",
  "payment_method": "CREDIT_CARD",
  "timestamp": "2026-08-16T06:26:29.247550+00:00"
}
```

---

# Testing Data Quality

The simulator can generate intentionally problematic events.

For example:

```json
{
  "order_id": "123",
  "amount": 250.00,
  "currency": "INR",
  "extra_field": "unexpected"
}
```

This allows the pipeline to demonstrate how schema drift or unexpected fields can be detected.

The system can then route the problematic event toward the DLQ rather than allowing it to silently continue through the main processing path.

---

# Troubleshooting

## Flink job repeatedly enters RESTARTING

Check the Flink TaskManager logs:

```powershell
docker logs --tail 200 icestream-flink-taskmanager
```

Search for Kafka-related errors:

```powershell
docker logs --tail 200 icestream-flink-taskmanager |
    Select-String "ERROR|Exception|Kafka"
```

---

## Kafka hostname cannot be resolved

From the Flink JobManager:

```powershell
docker exec icestream-flink-jobmanager getent hosts kafka
```

Expected:

```text
172.x.x.x kafka
```

Test Kafka connectivity:

```powershell
docker exec icestream-flink-jobmanager bash -c "echo > /dev/tcp/kafka/9092 && echo KAFKA_OK || echo KAFKA_FAILED"
```

Expected:

```text
KAFKA_OK
```

The Flink container should use the Docker-internal Kafka address:

```text
kafka:9092
```

rather than:

```text
localhost:9092
```

---

## Check the configured Kafka broker

```powershell
docker exec icestream-flink-jobmanager printenv KAFKA_BOOTSTRAP_SERVERS
```

Expected:

```text
kafka:9092
```

---

## No running Flink jobs

Check:

```powershell
docker exec icestream-flink-jobmanager flink list
```

Submit the pipeline again:

```powershell
docker exec icestream-flink-jobmanager flink run -d /opt/flink/usrlib/flink-pipeline-1.0.0.jar
```

---

# Current Pipeline Status

The project has been containerized using Docker Compose and integrates the major components required for a real-time lakehouse observability workflow.

The verified environment includes:

```text
Docker Compose
      │
      ├── Kafka
      ├── Zookeeper
      ├── Flink JobManager
      ├── Flink TaskManager
      ├── Python Data Generator
      ├── MinIO
      ├── Node.js Backend
      └── React Dashboard
```

The Flink application consumes the Kafka checkout stream through the configured Docker-network Kafka endpoint.

---

# Future Enhancements

Potential improvements include:

* Persistent Iceberg table optimization
* Advanced schema evolution detection
* Apache Flink metrics integration
* Prometheus/Grafana integration
* Advanced anomaly detection
* Automated alerting
* Historical data-quality analysis
* Flink savepoint orchestration
* Pipeline restart automation
* Advanced DLQ replay functionality
* Data-quality trend analysis
* Authentication and role-based dashboard access
* Kubernetes deployment
* Cloud object storage integration

---

# Learning Outcomes

This project provides practical experience with:

### Data Engineering

* Real-time streaming pipelines
* Event-driven architectures
* Data quality engineering
* Dead Letter Queues
* Lakehouse architecture

### Apache Kafka

* Topics
* Producers
* Consumers
* Consumer groups
* Streaming event ingestion

### Apache Flink

* DataStream API
* Kafka Source
* Stateful stream processing
* Checkpointing
* Fault tolerance
* Stream validation

### Data Storage

* Apache Iceberg
* MinIO
* PostgreSQL catalogs
* Object storage concepts

### Backend Development

* Node.js
* Express.js
* REST APIs
* WebSockets

### Frontend Development

* React
* Real-time dashboards
* Pipeline monitoring interfaces

### DevOps

* Docker
* Docker Compose
* Container networking
* Service orchestration
* Application debugging

---

# Why IceStream?

Modern organizations increasingly process data continuously rather than waiting for scheduled batch pipelines.

IceStream demonstrates how a streaming architecture can combine:

```text
Real-Time Ingestion
        +
Stream Processing
        +
Data Quality
        +
Fault Isolation
        +
Lakehouse Storage
        +
Observability
```

into a single engineering workflow.

The main objective is to identify data-quality and pipeline problems **before they reach downstream analytics and business applications**.

---

# Conclusion

IceStream is a practical implementation of a real-time lakehouse observability platform.

By combining **Apache Kafka, Apache Flink, Apache Iceberg, MinIO, PostgreSQL, Node.js, React, Python, and Docker**, the project demonstrates an end-to-end approach to:

* Streaming data ingestion
* Real-time processing
* Data-quality validation
* Fault isolation
* Dead Letter Queue handling
* Lakehouse storage
* Real-time observability
* Containerized deployment

The architecture provides a foundation that can be extended toward production-grade data platforms and cloud-native streaming systems.

---

## Author

**Monika Suresh**

B.E. Computer Science & Engineering
Dayananda Sagar Academy of Technology and Management
Bengaluru, India

**Project:** IceStream – Real-Time Lakehouse Observability

**Batch:** 2027
