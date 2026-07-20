// Structured data index of the IceStream codebase and architecture configurations

export interface ProjectFile {
  name: string;
  path: string;
  language: string;
  description: string;
  purpose: string;
  content: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  role: string;
  technology: string;
  status: 'active' | 'pending' | 'standby';
  description: string;
  envVars: string[];
  ports: string[];
}

export interface TaskItem {
  id: string;
  name: string;
  objective: string;
  expectedOutput: string;
  estimatedTime: number; // in minutes
  assignedTo: 1 | 2 | 3 | 4;
  week: 1 | 2 | 3 | 4;
  dependencies: string[];
  parallelCapable: boolean;
}

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: 'generator',
    label: 'Python Mock Generator',
    role: 'Synthetic telemetry and transactional log ingestion engine.',
    technology: 'Python 3.10 + Pandas + Numpy',
    status: 'active',
    description: 'Generates structured schemas modeling operational latency, transaction failures, and file states, inserting data quality annotations via Great Expectations before queuing in Kafka.',
    envVars: ['KAFKA_BOOTSTRAP_SERVERS', 'GENERATION_INTERVAL_MS', 'ANOMALY_PROBABILITY'],
    ports: ['Local Process']
  },
  {
    id: 'validation',
    label: 'Great Expectations',
    role: 'Streaming schema and data quality validator.',
    technology: 'Great Expectations v0.17',
    status: 'active',
    description: 'Enforces robust row-level assertions. Validates that timestamps exist, latency calculations are non-negative, and file structures map strictly to expected table partitioning specifications.',
    envVars: ['GREAT_EXPECTATIONS_SUITE_NAME'],
    ports: ['Embedded Library']
  },
  {
    id: 'kafka',
    label: 'Apache Kafka Broker',
    role: 'Highly durable streaming transaction message broker.',
    technology: 'Confluent Platform CP-Kafka v7.4.0',
    status: 'active',
    description: 'Acts as the central operational log. Feeds live observability packets through isolated topics with dynamic consumers (Flink and Express API).',
    envVars: ['KAFKA_BROKER_ID', 'KAFKA_ZOOKEEPER_CONNECT', 'KAFKA_ADVERTISED_LISTENERS'],
    ports: ['29092 (Host)', '9092 (Container)']
  },
  {
    id: 'flink',
    label: 'Apache Flink Job',
    role: 'Distributed stateful stream processing pipeline.',
    technology: 'Apache Flink v1.17 + Java 11',
    status: 'active',
    description: 'Consumes real-time topics, manages windowed metric aggregations (e.g. 5-min rolling latency statistics), and commits structured batches safely into Parquet formats via the Iceberg sink.',
    envVars: ['FLINK_PROPERTIES', 'jobmanager.rpc.address'],
    ports: ['8081 (Web UI)']
  },
  {
    id: 'iceberg',
    label: 'Apache Iceberg Lakehouse',
    role: 'Metadata resolution and open transactional table format.',
    technology: 'Apache Iceberg REST Catalog + Parquet',
    status: 'active',
    description: 'Provides acid transaction guarantees and schema-evolution capabilities. Keeps tracking catalogs updated with metadata snapshots while parquet data files sit on local MinIO Object Storage.',
    envVars: ['CATALOG_WAREHOUSE', 'CATALOG_IO__IMPL', 'CATALOG_S3_ENDPOINT'],
    ports: ['8181 (REST Catalog API)']
  },
  {
    id: 'minio',
    label: 'MinIO Storage (S3)',
    role: 'S3-compatible persistent object warehouse storage.',
    technology: 'MinIO Server',
    status: 'active',
    description: 'Holds the binary Parquet file outputs written by the Flink Iceberg Sink. Offers browser consoles for inspecting lakehouse partition structures.',
    envVars: ['MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD'],
    ports: ['9000 (API)', '9001 (Console)']
  },
  {
    id: 'express',
    label: 'Express & WS Gateway',
    role: 'Low-latency API access and WebSocket stream proxy.',
    technology: 'Node.js 18 + Express + TypeScript + ws',
    status: 'active',
    description: 'Proxies Kafka topics directly to client WebSockets. Serves HTTP endpoints mapping Iceberg metadata structures, partition details, and catalog health indicators.',
    envVars: ['PORT', 'KAFKA_BOOTSTRAP_SERVERS', 'ICEBERG_CATALOG_URL'],
    ports: ['3001 (API & WS Server)']
  },
  {
    id: 'frontend',
    label: 'Observability UI',
    role: 'Real-time monitoring console & architecture map.',
    technology: 'React 19 + Vite + React Flow + Recharts',
    status: 'active',
    description: 'Renders streaming time-series dashboards and custom network canvases, allowing operators to visually navigate active cluster health, latency anomalies, and validation rules.',
    envVars: ['VITE_PORT', 'VITE_API_PROXY'],
    ports: ['3000 (Local App)']
  }
];

export const ROADMAP_TASKS: TaskItem[] = [
  // WEEK 1
  {
    id: 'T101',
    name: 'Monorepo Setup & Git Configuration',
    objective: 'Create git repository, configure .gitignore, env templates and directory structures.',
    expectedOutput: 'Functional folder layout with configuration presets verified locally.',
    estimatedTime: 45,
    assignedTo: 1,
    week: 1,
    dependencies: [],
    parallelCapable: true
  },
  {
    id: 'T102',
    name: 'Docker Infrastructure Orchestration',
    objective: 'Design and verify Docker Compose setup for Zookeeper, Kafka, MinIO, and Flink instances.',
    expectedOutput: 'Local cluster booting successfully via "docker-compose up -d".',
    estimatedTime: 90,
    assignedTo: 2,
    week: 1,
    dependencies: ['T101'],
    parallelCapable: false
  },
  {
    id: 'T103',
    name: 'Python Environment Boilerplate',
    objective: 'Configure pip packages, requirements.txt, and verify base Python 3.10 compiler images.',
    expectedOutput: 'Docker containers spinning up with packages cached successfully.',
    estimatedTime: 30,
    assignedTo: 3,
    week: 1,
    dependencies: ['T101'],
    parallelCapable: true
  },
  {
    id: 'T104',
    name: 'Flink Java Boilerplate with Maven',
    objective: 'Initialize pom.xml config with Flink/Iceberg connectors and build initial empty Main classes.',
    expectedOutput: 'Clean compilation output when running "mvn clean package" inside container.',
    estimatedTime: 90,
    assignedTo: 4,
    week: 1,
    dependencies: ['T101'],
    parallelCapable: true
  },
  {
    id: 'T105',
    name: 'Python Kafka Simulation Skeleton',
    objective: 'Create mock generator class producing structured telemetry packets with timestamp intervals.',
    expectedOutput: 'Stdout logging printing synthetic packets correctly.',
    estimatedTime: 60,
    assignedTo: 3,
    week: 1,
    dependencies: ['T103'],
    parallelCapable: true
  },
  {
    id: 'T106',
    name: 'Express TypeScript Setup',
    objective: 'Build tsconfig configurations, package dependencies, and establish Express initializations.',
    expectedOutput: 'Running server listening on port 3001 with hot module reloads working.',
    estimatedTime: 60,
    assignedTo: 1,
    week: 1,
    dependencies: ['T101'],
    parallelCapable: true
  },
  {
    id: 'T107',
    name: 'Frontend Client Shell Init',
    objective: 'Scaffold React + Vite + TypeScript dashboard shell and install Tailwind classes.',
    expectedOutput: 'React client serving basic structural grids on browser port 3000.',
    estimatedTime: 60,
    assignedTo: 1,
    week: 1,
    dependencies: ['T101'],
    parallelCapable: true
  },
  {
    id: 'T108',
    name: 'GitHub CI Workflows Configuration',
    objective: 'Create YAML workflows targeting Python linter checkouts, Maven builds, and TypeScript compile tests.',
    expectedOutput: 'Green checks on initial mock pull-requests.',
    estimatedTime: 45,
    assignedTo: 2,
    week: 1,
    dependencies: ['T101'],
    parallelCapable: true
  },

  // WEEK 2
  {
    id: 'T201',
    name: 'Python Kafka Publisher Integration',
    objective: 'Integrate confluent-kafka/kafka-python to push synthetic telemetry to Kafka topic.',
    expectedOutput: 'Kafka CLI commands displaying published payloads in real-time.',
    estimatedTime: 60,
    assignedTo: 3,
    week: 2,
    dependencies: ['T105', 'T102'],
    parallelCapable: false
  },
  {
    id: 'T202',
    name: 'Great Expectations Suite Builder',
    objective: 'Scaffold expectations profiles evaluating metric constraints (latency limits, timestamp bounds).',
    expectedOutput: 'GE check reports logging evaluation status for each generated record.',
    estimatedTime: 90,
    assignedTo: 3,
    week: 2,
    dependencies: ['T105'],
    parallelCapable: true
  },
  {
    id: 'T203',
    name: 'Kafka Consumer Node API Connect',
    objective: 'Establish Kafkajs subscriber inside Express gateway connecting to metrics topics.',
    expectedOutput: 'Express logs logging received messages from local broker queues.',
    estimatedTime: 60,
    assignedTo: 1,
    week: 2,
    dependencies: ['T106', 'T102'],
    parallelCapable: false
  },
  {
    id: 'T204',
    name: 'WebSocket Broadcast Server Logic',
    objective: 'Initialize WS socket proxy to broadcast incoming Kafka telemetry stream to UI sockets.',
    expectedOutput: 'Logs detailing broadcast loops and concurrent active client counters.',
    estimatedTime: 60,
    assignedTo: 1,
    week: 2,
    dependencies: ['T203'],
    parallelCapable: true
  },
  {
    id: 'T205',
    name: 'Flink Kafka Source Configuration',
    objective: 'Integrate Flink KafkaSource class reading stream queues with watermarking strategies.',
    expectedOutput: 'Flink execution managers displaying running consumers with offsets.',
    estimatedTime: 90,
    assignedTo: 4,
    week: 2,
    dependencies: ['T104', 'T102'],
    parallelCapable: false
  },
  {
    id: 'T206',
    name: 'MinIO Lakehouse Bucket Verification',
    objective: 'Create MinIO bucket and connect MC client scripts to verify user credentials.',
    expectedOutput: 'Verified empty "lakehouse" bucket visible inside MinIO web explorer.',
    estimatedTime: 45,
    assignedTo: 2,
    week: 2,
    dependencies: ['T102'],
    parallelCapable: true
  },
  {
    id: 'T207',
    name: 'React WS Client Setup',
    objective: 'Establish basic client-side WebSocket hook to listen to gateway streams.',
    expectedOutput: 'Client console logging live JSON payloads from local server.',
    estimatedTime: 45,
    assignedTo: 2,
    week: 2,
    dependencies: ['T107', 'T204'],
    parallelCapable: true
  },

  // WEEK 3
  {
    id: 'T301',
    name: 'Iceberg Catalog REST Setup',
    objective: 'Spin up and configure Iceberg REST service container integrating MinIO credentials.',
    expectedOutput: 'Curl requests returning positive catalog status codes.',
    estimatedTime: 60,
    assignedTo: 2,
    week: 3,
    dependencies: ['T206'],
    parallelCapable: false
  },
  {
    id: 'T302',
    name: 'Flink Iceberg Schema Design',
    objective: 'Design Iceberg RowData schema map for telemetry metrics (tables, fields, partitioning specs).',
    expectedOutput: 'Catalog database schema initialized with table columns mapped.',
    estimatedTime: 90,
    assignedTo: 4,
    week: 3,
    dependencies: ['T205', 'T301'],
    parallelCapable: false
  },
  {
    id: 'T303',
    name: 'Flink Iceberg Sink Implementation',
    objective: 'Build Iceberg FlinkSink writing mapped streams to catalog paths with exactly-once checkpoints.',
    expectedOutput: 'Parquet files compiling inside MinIO "lakehouse" directories after Flink checkpoints.',
    estimatedTime: 120,
    assignedTo: 4,
    week: 3,
    dependencies: ['T302'],
    parallelCapable: false
  },
  {
    id: 'T304',
    name: 'Express Metadata Fetch Services',
    objective: 'Add Express API endpoints reading catalog stats and MinIO metadata logs.',
    expectedOutput: '/api/lakehouse/tables returning structured catalog metadata details.',
    estimatedTime: 75,
    assignedTo: 1,
    week: 3,
    dependencies: ['T203', 'T301'],
    parallelCapable: false
  },
  {
    id: 'T305',
    name: 'React Flow System Canvas Init',
    objective: 'Scaffold basic React Flow workspace mapping ingestion nodes in interactive layout.',
    expectedOutput: 'Visual canvas diagram rendering nodes and connective flow wires.',
    estimatedTime: 90,
    assignedTo: 2,
    week: 3,
    dependencies: ['T107'],
    parallelCapable: true
  },
  {
    id: 'T306',
    name: 'Anomalous Metric Injector (Python)',
    objective: 'Build dynamic controller inside generator allowing manual toggle of anomalous outputs.',
    expectedOutput: 'Generator occasionally outputting validation failures based on rates.',
    estimatedTime: 60,
    assignedTo: 3,
    week: 3,
    dependencies: ['T201'],
    parallelCapable: true
  },

  // WEEK 4
  {
    id: 'T401',
    name: 'Dashboard Real-Time Graph Panels',
    objective: 'Integrate Recharts curves tracking streaming throughput rate and commit latencies.',
    expectedOutput: 'Fluid interactive lines updating dynamically in real-time.',
    estimatedTime: 90,
    assignedTo: 1,
    week: 4,
    dependencies: ['T207'],
    parallelCapable: true
  },
  {
    id: 'T402',
    name: 'React Flow Integration with Metrics',
    objective: 'Animate flow lines inside React Flow canvas using live message activity frequencies.',
    expectedOutput: 'Glow pulses visualising load and data pacing across systems.',
    estimatedTime: 90,
    assignedTo: 2,
    week: 4,
    dependencies: ['T305', 'T207'],
    parallelCapable: true
  },
  {
    id: 'T403',
    name: 'Great Expectations Error Log UI',
    objective: 'Create dashboard panel displaying row-level validation anomalies and error states.',
    expectedOutput: 'Warning indicators appearing when mock anomaly injector is toggled.',
    estimatedTime: 75,
    assignedTo: 3,
    week: 4,
    dependencies: ['T401', 'T202'],
    parallelCapable: true
  },
  {
    id: 'T404',
    name: 'Iceberg Catalog Metadata Panel',
    objective: 'Create a detail tab displaying partition structures and transaction commit histories.',
    expectedOutput: 'Table showing snapshot chains and active files lists.',
    estimatedTime: 60,
    assignedTo: 1,
    week: 4,
    dependencies: ['T304'],
    parallelCapable: true
  },
  {
    id: 'T405',
    name: 'E2E Testing and Performance Triage',
    objective: 'Execute end-to-end stream pipelines and trace latency rates, optimizing JVM memory.',
    expectedOutput: 'System running smoothly with zero lag or loss for over 2 hours.',
    estimatedTime: 120,
    assignedTo: 4,
    week: 4,
    dependencies: ['T303', 'T402'],
    parallelCapable: false
  },
  {
    id: 'T406',
    name: 'Documentation, Demos & Setup scripts',
    objective: 'Consolidate launch command scripts and create comprehensive user documentation.',
    expectedOutput: 'Single-command launching procedures mapped and verified.',
    estimatedTime: 60,
    assignedTo: 2,
    week: 4,
    dependencies: ['T405'],
    parallelCapable: true
  }
];

export const REPOSITORY_FILES: ProjectFile[] = [
  {
    name: 'docker-compose.yml',
    path: '/docker-compose.yml',
    language: 'yaml',
    description: 'Docker infrastructure orchestration topology.',
    purpose: 'Coordinates local networks including Kafka, Flink, MinIO, Python generators, Great Expectations, and client gateways.',
    content: `version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.0
    container_name: icestream-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - icestream-network

  kafka:
    image: confluentinc/cp-kafka:7.3.0
    container_name: icestream-kafka
    ports:
      - "9092:9092"
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
    networks:
      - icestream-network

  flink-jobmanager:
    build:
      context: ./flink-pipeline
      dockerfile: Dockerfile
    container_name: icestream-flink-jobmanager
    ports:
      - "8081:8081"
    command: jobmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: flink-jobmanager
    networks:
      - icestream-network

  flink-taskmanager:
    build:
      context: ./flink-pipeline
      dockerfile: Dockerfile
    container_name: icestream-flink-taskmanager
    depends_on:
      - flink-jobmanager
    command: taskmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: flink-jobmanager
        taskmanager.numberOfTaskSlots: 2
    networks:
      - icestream-network

  minio:
    image: minio/minio:RELEASE.2023-05-18T00-12-52Z
    container_name: icestream-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    command: server /data --console-address ":9001"
    networks:
      - icestream-network

  data-generator:
    build:
      context: ./generator
      dockerfile: Dockerfile
    container_name: icestream-generator
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      KAFKA_TOPIC: checkout_events
      SEND_INTERVAL_SEC: 1.0
      ANOMALY_RATE: 0.05
    depends_on:
      - kafka
    networks:
      - icestream-network

  observability-validator:
    build:
      context: ./observability
      dockerfile: Dockerfile
    container_name: icestream-validator
    volumes:
      - shared-data:/tmp
    environment:
      VALIDATION_REPORT_PATH: /tmp/validation_report.json
    networks:
      - icestream-network

  express-gateway:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: icestream-backend
    ports:
      - "3001:3001"
    volumes:
      - shared-data:/tmp
    environment:
      PORT: 3001
      VALIDATION_REPORT_PATH: /tmp/validation_report.json
    depends_on:
      - kafka
    networks:
      - icestream-network

  frontend-dashboard:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: icestream-frontend
    ports:
      - "3000:80"
    depends_on:
      - express-gateway
    networks:
      - icestream-network

networks:
  icestream-network:
    name: icestream-network
    driver: bridge

volumes:
  shared-data:
    name: icestream-shared-data`
  },
  {
    name: 'main.py',
    path: '/generator/main.py',
    language: 'python',
    description: 'Python transactional event stream generator.',
    purpose: 'Simulates transaction logs and publishes payloads to Kafka topic checkout_events.',
    content: `import os
import time
import random
import json
from confluent_kafka import Producer

KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
TOPIC_NAME = os.getenv("KAFKA_TOPIC", "checkout_events")
ANOMALY_RATE = float(os.getenv("ANOMALY_RATE", "0.05"))

class PurchaseGenerator:
    def __init__(self):
        conf = {'bootstrap.servers': KAFKA_BROKER, 'client.id': 'icestream-generator'}
        self.producer = Producer(conf)

    def generate_event(self):
        order_id = f"ORD-{random.randint(100000, 999999)}"
        amount = round(random.uniform(5.0, 500.0), 2)
        tax_amount = round(amount * 0.08, 2)
        
        # Inject null tax anomaly
        if random.random() < ANOMALY_RATE:
            tax_amount = None
            
        return {
            "order_id": order_id,
            "user_id": f"USR-{random.randint(1000, 9999)}",
            "amount": amount,
            "tax_amount": tax_amount,
            "status": "COMPLETED",
            "timestamp": int(time.time() * 1000)
        }

    def start(self):
        while True:
            event = self.generate_event()
            self.producer.produce(TOPIC_NAME, key=event["order_id"], value=json.dumps(event))
            self.producer.poll(0)
            time.sleep(1.0)`
  },
  {
    name: 'validate.py',
    path: '/observability/validate.py',
    language: 'python',
    description: 'Great Expectations data quality auditor.',
    purpose: 'Performs pandas batch validation checks asserting data structural health.',
    content: `import pandas as pd
import great_expectations as ge

class IceStreamDataValidator:
    def run_validation(self, records):
        df = pd.DataFrame(records)
        ge_df = ge.from_pandas(df)
        
        # Expect amount > 0
        r1 = ge_df.expect_column_values_to_be_greater_than("amount", min_value=0)
        
        # Expect tax_amount not to be null on at least 90% of rows
        r2 = ge_df.expect_column_values_to_not_be_null("tax_amount", mostly=0.90)
        
        status = "OK" if r1.success and r2.success else "ERROR"
        return {
            "status": status,
            "success_rate_percent": 100.0 if status == "OK" else 50.0
        }`
  },
  {
    name: 'pom.xml',
    path: '/flink-pipeline/pom.xml',
    language: 'xml',
    description: 'Maven configurations for Apache Flink.',
    purpose: 'Builds Flink streaming JAR containing Kafka, Iceberg, and Jackson modules.',
    content: `<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.icestream</groupId>
    <artifactId>flink-pipeline</artifactId>
    <version>1.0.0</version>
    <properties>
        <flink.version>1.17.1</flink.version>
        <iceberg.version>1.3.0</iceberg.version>
    </properties>
</project>`
  },
  {
    name: 'IceStreamPipeline.java',
    path: '/flink-pipeline/src/main/java/.../IceStreamPipeline.java',
    language: 'java',
    description: 'Flink stateful stream processing with circuit breaking.',
    purpose: 'Monitors rolling null tax_amount ratios, routing faulty transactions into an Iceberg DLQ.',
    content: `package com.icestream.pipeline;

import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.connector.kafka.source.KafkaSource;

public class IceStreamPipeline {
    public static void main(String[] args) throws Exception {
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.enableCheckpointing(10000);
        
        // Stateful Streaming Circuit Breaker Routing ...
        env.execute("IceStream-Realtime-Lakehouse-Pipeline");
    }
}`
  },
  {
    name: 'server.ts',
    path: '/backend/src/server.ts',
    language: 'typescript',
    description: 'Express Gateway & WebSocket Telemetry Server.',
    purpose: 'Exposes HTTP routes for incident logs and streams metrics over WebSocket.',
    content: `import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.get('/api/pipeline-status', (req, res) => {
  res.json({ status: "RUNNING" });
});

wss.on('connection', (ws) => {
  console.log("Telemetry client connected.");
});

server.listen(3001, '0.0.0.0', () => {
  console.log("IceStream server booted on port 3001");
});`
  }
];
