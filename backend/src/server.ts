import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

const server = createServer(app);

// WebSocket server attached to the same HTTP server port
const wss = new WebSocketServer({ server });

// State store
interface Incident {
  id: string;
  timestamp: string;
  severity: 'WARNING' | 'CRITICAL';
  ruleViolated: string;
  affectedNode: string;
  message: string;
  resolved: boolean;
}

let isPipelineRunning = true;
let isAnomalyActive = false;
let incidentHistory: Incident[] = [
  {
    id: "INC-3091",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    severity: "WARNING",
    ruleViolated: "tax_amount should not be null > 10% of rows",
    affectedNode: "Great Expectations",
    message: "Data validation warning: Null tax_amount rate touched 11.2%.",
    resolved: true
  }
];

// Helper to broadcast WS messages
const broadcast = (data: any) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// ==========================================
// REST ENDPOINTS
// ==========================================

// 1. Get current pipeline state and data health ratios
app.get('/api/pipeline-status', (req: Request, res: Response) => {
  // Read from real Great Expectations JSON file if available
  let geReport: any = null;
  const geReportPath = '/tmp/validation_report.json';
  
  if (fs.existsSync(geReportPath)) {
    try {
      geReport = JSON.parse(fs.readFileSync(geReportPath, 'utf-8'));
    } catch (e) {
      // Ignored, fallback to simulation
    }
  }

  res.json({
    status: isPipelineRunning ? "RUNNING" : "PAUSED",
    anomalyModeActive: isAnomalyActive,
    greatExpectationsReport: geReport || {
      status: isAnomalyActive ? "ERROR" : "OK",
      total_assertions: 2,
      successful_assertions: isAnomalyActive ? 1 : 2,
      success_rate_percent: isAnomalyActive ? 50.0 : 100.0,
      failures: isAnomalyActive ? ["CRITICAL_RULE_FAILED: Negative amounts detected.", "WARNING_THRESHOLD_EXCEEDED: Null tax_amount exceeded 10%."] : [],
      metrics: {
        total_rows_evaluated: 250,
        null_tax_count: isAnomalyActive ? 42 : 1,
        negative_amount_count: isAnomalyActive ? 8 : 0
      }
    },
    circuitBreakerState: {
      status: isAnomalyActive ? "ENGAGED" : "CLOSED",
      route: isAnomalyActive ? "ecommerce_events_dlq" : "ecommerce_events",
      reason: isAnomalyActive ? "Null tax rate exceeded 2% (current error rate: 16.8%)" : "Data streams healthy"
    }
  });
});

// 2. Fetch history of system incidents
app.get('/api/incidents', (req: Request, res: Response) => {
  res.json(incidentHistory);
});

// 3. Command: Trigger an anomaly (simulates real-time pipeline alerts)
app.post('/api/trigger-anomaly', (req: Request, res: Response) => {
  isAnomalyActive = !isAnomalyActive;
  
  if (isAnomalyActive) {
    // Generate new incident
    const newIncident: Incident = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      severity: "CRITICAL",
      ruleViolated: "Null tax_amount > 2% (Flink Circuit Breaker Threshold)",
      affectedNode: "Apache Flink",
      message: "STREAM CIRCUIT BREAKER ENGAGED. Anomaly rate touched 16.8%. Diverting all events to ecommerce_events_dlq.",
      resolved: false
    };
    incidentHistory.unshift(newIncident);
    
    // Broadcast active incident immediately over WebSocket
    broadcast({
      event: "INCIDENT_TRIGGERED",
      data: newIncident
    });
  } else {
    // Resolve unresolved incidents
    incidentHistory = incidentHistory.map(inc => ({ ...inc, resolved: true }));
    broadcast({
      event: "INCIDENTS_RESOLVED",
      message: "All stream anomalies resolved. Pipeline returned to standard state."
    });
  }

  res.json({ 
    success: true, 
    anomalyActive: isAnomalyActive,
    message: isAnomalyActive ? "Anomaly injected." : "Standard conditions restored." 
  });
});

// 4. Command: Pause/Resume pipeline
app.post('/api/toggle-pipeline', (req: Request, res: Response) => {
  isPipelineRunning = !isPipelineRunning;
  broadcast({
    event: "PIPELINE_STATE_CHANGED",
    status: isPipelineRunning ? "RUNNING" : "PAUSED"
  });
  res.json({ success: true, status: isPipelineRunning ? "RUNNING" : "PAUSED" });
});

// ==========================================
// WEBSOCKET TELEMETRY BROADCAST (1Hz)
// ==========================================
setInterval(() => {
  if (!isPipelineRunning) return;

  const baseLoad = 120; // records per second
  const loadNoise = Math.floor(randomUniform(-15, 15));
  const currentLoad = baseLoad + loadNoise;
  
  // Under normal conditions, error rate is <0.5%. Under anomaly, it shoots up.
  const baseErrorRate = isAnomalyActive ? 16.8 : 0.4;
  const errorNoise = randomUniform(-1.5, 1.5);
  const currentErrorRate = Math.max(0, parseFloat((baseErrorRate + errorNoise).toFixed(2)));

  broadcast({
    event: "METRICS_UPDATE",
    timestamp: new Date().toISOString(),
    metrics: {
      throughput: currentLoad,
      errorRate: currentErrorRate,
      activeConnections: wss.clients.size,
      processedTotal: Math.floor(Date.now() / 1000) % 1000000 // running simulation count
    }
  });
}, 1000);

// Helper function
function randomUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log(`New client connected to WS. Total clients: ${wss.clients.size}`);
  
  // Push initial sync immediately
  ws.send(JSON.stringify({
    event: "INITIAL_SYNC",
    status: isPipelineRunning ? "RUNNING" : "PAUSED",
    isAnomalyActive,
    incidents: incidentHistory
  }));

  ws.on('close', () => {
    console.log('Client disconnected from WS.');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`IceStream Gateway server booting...`);
  console.log(`HTTP API available at http://0.0.0.0:${PORT}`);
  console.log(`WS stream available at ws://0.0.0.0:${PORT}`);
});
