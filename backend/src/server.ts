import express, { Request, Response } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// ======================================================
// TYPES
// ======================================================

interface Incident {
  id: string;
  timestamp: string;
  severity: "WARNING" | "CRITICAL";
  ruleViolated: string;
  affectedNode: string;
  message: string;
  resolved: boolean;
}

interface PipelineMetrics {
  throughput: number;
  errorRate: number;
  processedTotal: number;
  validEvents: number;
  invalidEvents: number;
  dlqCount: number;
  icebergCommits: number;
  nullTaxCount: number;
  negativeAmountCount: number;
  totalRowsEvaluated: number;
  kafkaLag: number;
  latencyMs: number;
}

// ======================================================
// PIPELINE STATE
// ======================================================

let isPipelineRunning = true;
let isAnomalyActive = false;

let processedTotal = 193000;
let validEvents = 192700;
let invalidEvents = 300;
let dlqCount = 12;
let icebergCommits = 1408;

let lastThroughput = 110;
let lastErrorRate = 0.35;

let totalRowsEvaluated = 250;
let nullTaxCount = 1;
let negativeAmountCount = 0;

let kafkaLag = 8;
let latencyMs = 18;

// ======================================================
// INCIDENT HISTORY
// ======================================================

let incidentHistory: Incident[] = [
  {
    id: "INC-3091",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    severity: "WARNING",
    ruleViolated: "tax_amount should not be null > 10% of rows",
    affectedNode: "Great Expectations",
    message:
      "Data validation warning: Null tax_amount rate touched 11.2%.",
    resolved: true,
  },
];

// ======================================================
// HELPERS
// ======================================================

function randomUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomUniform(min, max + 1));
}

function generateIncidentId(): string {
  return `INC-${randomInt(1000, 9999)}`;
}

function getNullTaxRatio(): number {
  if (totalRowsEvaluated === 0) {
    return 0;
  }

  return Number(
    ((nullTaxCount / totalRowsEvaluated) * 100).toFixed(2)
  );
}

function getQualitySuccessRate(): number {
  let successfulAssertions = 4;

  if (isAnomalyActive) {
    successfulAssertions = 2;
  }

  return Number(((successfulAssertions / 4) * 100).toFixed(1));
}

function getCurrentMetrics(): PipelineMetrics {
  return {
    throughput: lastThroughput,
    errorRate: lastErrorRate,
    processedTotal,
    validEvents,
    invalidEvents,
    dlqCount,
    icebergCommits,
    nullTaxCount,
    negativeAmountCount,
    totalRowsEvaluated,
    kafkaLag,
    latencyMs,
  };
}

// ======================================================
// WEBSOCKET BROADCAST
// ======================================================

function broadcast(data: unknown) {
  const payload = JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ======================================================
// GREAT EXPECTATIONS STYLE REPORT
// ======================================================

function buildGreatExpectationsReport() {
  const nullTaxRatio = getNullTaxRatio();

  const failures: string[] = [];

  if (isAnomalyActive) {
    failures.push(
      "tax_amount null ratio exceeded 2% safety threshold."
    );

    failures.push(
      "Negative amount validation failed."
    );
  }

  return {
    status: isAnomalyActive ? "ERROR" : "OK",

    total_assertions: 4,

    successful_assertions: isAnomalyActive ? 2 : 4,

    success_rate_percent: getQualitySuccessRate(),

    failures,

    metrics: {
      total_rows_evaluated: totalRowsEvaluated,

      null_tax_count: nullTaxCount,

      null_tax_ratio_percent: nullTaxRatio,

      negative_amount_count: negativeAmountCount,

      valid_events: validEvents,

      invalid_events: invalidEvents,

      dlq_count: dlqCount,
    },

    expectations: [
      {
        expectation: "amount > 0",
        status: isAnomalyActive ? "FAIL" : "PASS",
      },
      {
        expectation: "tax_amount not null > 90%",
        status: isAnomalyActive ? "FAIL" : "PASS",
      },
      {
        expectation: "schema validation",
        status: "PASS",
      },
      {
        expectation: "Iceberg write contract",
        status: isAnomalyActive ? "FAIL" : "PASS",
      },
    ],
  };
}

// ======================================================
// PIPELINE SIMULATION
// ======================================================

function processStreamingBatch() {
  if (!isPipelineRunning) {
    lastThroughput = 0;
    lastErrorRate = 0;
    kafkaLag = Math.min(kafkaLag + 1, 999);

    return;
  }

  // --------------------------------------------
  // Kafka ingestion
  // --------------------------------------------

  const incomingEvents = randomInt(95, 135);

  // --------------------------------------------
  // Flink processing
  // --------------------------------------------

  let invalidBatch = 0;

  if (isAnomalyActive) {
    // Inject bad records.
    invalidBatch = Math.floor(
      incomingEvents * randomUniform(0.08, 0.18)
    );
  } else {
    // Normal background invalid events.
    invalidBatch = Math.floor(
      incomingEvents * randomUniform(0.002, 0.008)
    );
  }

  const validBatch = incomingEvents - invalidBatch;

  // --------------------------------------------
  // Data quality metrics
  // --------------------------------------------

  totalRowsEvaluated = incomingEvents;

  if (isAnomalyActive) {
    nullTaxCount = Math.floor(
      incomingEvents * randomUniform(0.08, 0.18)
    );

    negativeAmountCount = Math.floor(
      incomingEvents * randomUniform(0.01, 0.04)
    );
  } else {
    nullTaxCount = Math.floor(
      incomingEvents * randomUniform(0.001, 0.008)
    );

    negativeAmountCount = 0;
  }

  // --------------------------------------------
  // Valid / invalid events
  // --------------------------------------------

  validEvents += validBatch;
  invalidEvents += invalidBatch;

  processedTotal += incomingEvents;

  // --------------------------------------------
  // Circuit breaker / DLQ
  // --------------------------------------------

  if (isAnomalyActive) {
    dlqCount += invalidBatch;

    // Iceberg is protected while anomaly is active.
    // Only valid records are allowed through.
    icebergCommits += Math.max(
      1,
      Math.floor(validBatch / 10)
    );
  } else {
    // Healthy pipeline writes normally.
    icebergCommits += Math.max(
      1,
      Math.floor(incomingEvents / 10)
    );
  }

  // --------------------------------------------
  // Telemetry
  // --------------------------------------------

  lastThroughput = incomingEvents;

  const nullTaxRatio = getNullTaxRatio();

  if (isAnomalyActive) {
    lastErrorRate = Number(
      Math.max(
        nullTaxRatio,
        2 + randomUniform(0, 2)
      ).toFixed(2)
    );
  } else {
    lastErrorRate = Number(
      Math.max(
        0.05,
        randomUniform(0.1, 0.6)
      ).toFixed(2)
    );
  }

  kafkaLag = isAnomalyActive
    ? Math.min(
        999,
        kafkaLag + randomInt(1, 5)
      )
    : Math.max(
        0,
        kafkaLag + randomInt(-3, 2)
      );

  latencyMs = isAnomalyActive
    ? randomInt(25, 55)
    : randomInt(12, 22);
}

// ======================================================
// INCIDENT MANAGEMENT
// ======================================================

function createAnomalyIncident() {
  const incident: Incident = {
    id: generateIncidentId(),

    timestamp: new Date().toISOString(),

    severity: "CRITICAL",

    ruleViolated:
      "tax_amount null ratio exceeded 2% safety threshold",

    affectedNode: "Apache Flink",

    message:
      "Great Expectations detected anomalous records. Circuit breaker engaged and invalid events diverted to DLQ.",

    resolved: false,
  };

  incidentHistory.unshift(incident);

  return incident;
}

function resolveIncidents() {
  incidentHistory = incidentHistory.map((incident) => ({
    ...incident,
    resolved: true,
  }));
}

// ======================================================
// REST API
// ======================================================

app.get(
  "/api/pipeline-status",
  (_req: Request, res: Response) => {
    const reportPath = "/tmp/validation_report.json";

    let externalReport = null;

    if (fs.existsSync(reportPath)) {
      try {
        externalReport = JSON.parse(
          fs.readFileSync(reportPath, "utf-8")
        );
      } catch {
        externalReport = null;
      }
    }

    res.json({
      status: isPipelineRunning
        ? "RUNNING"
        : "PAUSED",

      anomalyModeActive: isAnomalyActive,

      greatExpectationsReport:
        externalReport ||
        buildGreatExpectationsReport(),

      metrics: getCurrentMetrics(),

      circuitBreakerState: {
        status: isAnomalyActive
          ? "ENGAGED"
          : "CLOSED",

        route: isAnomalyActive
          ? "ecommerce_events_dlq"
          : "ecommerce_events",

        reason: isAnomalyActive
          ? `Null tax ratio exceeded 2% safety threshold. Current rate: ${getNullTaxRatio()}%`
          : "Data streams healthy",
      },

      services: {
        kafka: "OPERATIONAL",
        flink: isAnomalyActive
          ? "PROTECTED"
          : "OPERATIONAL",
        iceberg: isAnomalyActive
          ? "PROTECTED"
          : "OPERATIONAL",
        minio: "OPERATIONAL",
        greatExpectations: isAnomalyActive
          ? "DEGRADED"
          : "OPERATIONAL",
      },
    });
  }
);

app.get(
  "/api/incidents",
  (_req: Request, res: Response) => {
    res.json(incidentHistory);
  }
);

app.get(
  "/api/status",
  (_req: Request, res: Response) => {
    res.json({
      status: isPipelineRunning
        ? "RUNNING"
        : "PAUSED",

      pipeline_health: isAnomalyActive
        ? "DEGRADED"
        : "HEALTHY",

      circuit_breaker: isAnomalyActive
        ? "OPEN"
        : "CLOSED",

      flink_job: "RUNNING",

      kafka: "CONNECTED",

      iceberg: "CONNECTED",

      minio: "CONNECTED",

      websocket_clients: wss.clients.size,

      metrics: getCurrentMetrics(),
    });
  }
);

app.get(
  "/api/metrics",
  (_req: Request, res: Response) => {
    const metrics = getCurrentMetrics();

    res.json({
      throughput_events_per_sec:
        metrics.throughput,

      processed_total:
        metrics.processedTotal,

      error_rate:
        metrics.errorRate,

      dlq_count:
        metrics.dlqCount,

      checkpoint:
        metrics.icebergCommits,

      checkpoint_duration_ms:
        metrics.latencyMs,

      kafka_consumer_lag:
        metrics.kafkaLag,

      latency_ms:
        metrics.latencyMs,

      valid_events:
        metrics.validEvents,

      invalid_events:
        metrics.invalidEvents,
    });
  }
);

// ======================================================
// ICEBERG SNAPSHOTS
// ======================================================

app.get(
  "/api/iceberg/snapshots",
  (_req: Request, res: Response) => {
    res.json([
      {
        snapshot_id: "snap-current",
        current: true,
        operation: "append",
        records_added: lastThroughput,
        total_records: processedTotal,
        committed_at: new Date().toISOString(),
      },

      {
        snapshot_id: "snap-previous",
        current: false,
        operation: "append",
        records_added: 100,
        total_records:
          Math.max(
            0,
            processedTotal - 100
          ),
        committed_at: new Date(
          Date.now() - 60000
        ).toISOString(),
      },
    ]);
  }
);

// ======================================================
// TOGGLE ANOMALY
// ======================================================

app.post(
  "/api/trigger-anomaly",
  (_req: Request, res: Response) => {
    isAnomalyActive = !isAnomalyActive;

    if (isAnomalyActive) {
      const incident =
        createAnomalyIncident();

      broadcast({
        event: "INCIDENT_TRIGGERED",
        data: incident,
      });

      broadcast({
        event: "PIPELINE_STATE_CHANGED",
        status: isPipelineRunning
          ? "RUNNING"
          : "PAUSED",
      });
    } else {
      resolveIncidents();

      broadcast({
        event: "INCIDENTS_RESOLVED",

        message:
          "All stream anomalies resolved. Pipeline returned to standard state.",
      });
    }

    res.json({
      success: true,

      anomalyActive:
        isAnomalyActive,

      message: isAnomalyActive
        ? "Anomaly injected. Circuit breaker engaged."
        : "Standard conditions restored.",
    });
  }
);

// ======================================================
// TOGGLE PIPELINE
// ======================================================

app.post(
  "/api/toggle-pipeline",
  (_req: Request, res: Response) => {
    isPipelineRunning =
      !isPipelineRunning;

    broadcast({
      event:
        "PIPELINE_STATE_CHANGED",

      status: isPipelineRunning
        ? "RUNNING"
        : "PAUSED",
    });

    res.json({
      success: true,

      status: isPipelineRunning
        ? "RUNNING"
        : "PAUSED",
    });
  }
);

// ======================================================
// WEBSOCKET
// ======================================================

wss.on(
  "connection",
  (ws: WebSocket) => {
    console.log(
      `New client connected to WS. Total clients: ${wss.clients.size}`
    );

    ws.send(
      JSON.stringify({
        event: "INITIAL_SYNC",

        status: isPipelineRunning
          ? "RUNNING"
          : "PAUSED",

        isAnomalyActive,

        incidents: incidentHistory,

        metrics:
          getCurrentMetrics(),

        greatExpectationsReport:
          buildGreatExpectationsReport(),
      })
    );

    ws.on(
      "close",
      () => {
        console.log(
          `Client disconnected from WS. Total clients: ${wss.clients.size}`
        );
      }
    );
  }
);

// ======================================================
// REAL-TIME PIPELINE LOOP
// ======================================================

setInterval(() => {
  processStreamingBatch();

  broadcast({
    event: "METRICS_UPDATE",

    timestamp:
      new Date().toISOString(),

    metrics: {
      throughput:
        lastThroughput,

      errorRate:
        lastErrorRate,

      processedTotal:
        processedTotal,

      activeConnections:
        wss.clients.size,

      validEvents:
        validEvents,

      invalidEvents:
        invalidEvents,

      dlqCount:
        dlqCount,

      icebergCommits:
        icebergCommits,

      kafkaLag:
        kafkaLag,

      latencyMs:
        latencyMs,
    },

    pipeline: {
      status: isPipelineRunning
        ? "RUNNING"
        : "PAUSED",

      anomalyActive:
        isAnomalyActive,

      circuitBreaker:
        isAnomalyActive
          ? "ENGAGED"
          : "CLOSED",
    },

    greatExpectations:
      buildGreatExpectationsReport(),
  });
}, 1000);

// ======================================================
// SERVER START
// ======================================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "IceStream Gateway server booting..."
    );

    console.log(
      `HTTP API available at http://0.0.0.0:${PORT}`
    );

    console.log(
      `WS stream available at ws://0.0.0.0:${PORT}`
    );

    console.log(
      "Real-time pipeline simulation started."
    );
  }
);