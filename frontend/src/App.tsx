import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Position, 
  Background, 
  Controls,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  Play, 
  Square, 
  Zap, 
  Server, 
  Database, 
  Layers, 
  ExternalLink,
  Info,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

// Interfaces mapping backend models
interface Incident {
  id: string;
  timestamp: string;
  severity: 'WARNING' | 'CRITICAL';
  ruleViolated: string;
  affectedNode: string;
  message: string;
  resolved: boolean;
}

interface TelemetryPoint {
  time: string;
  throughput: number;
  errorRate: number;
}

export default function App() {
  // Connection states
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('CONNECTING');
  const [pipelineState, setPipelineState] = useState<'RUNNING' | 'PAUSED'>('RUNNING');
  const [anomalyActive, setAnomalyActive] = useState<boolean>(false);
  const [circuitBreakerEngaged, setCircuitBreakerEngaged] = useState<boolean>(false);
  const [circuitBreakerReason, setCircuitBreakerReason] = useState<string>('');
  
  // Real-time metrics
  const [currentMetrics, setCurrentMetrics] = useState({
    throughput: 0,
    errorRate: 0.0,
    processedTotal: 0,
    activeConnections: 0
  });

  // Series for Recharts
  const [chartData, setChartData] = useState<TelemetryPoint[]>([]);
  
  // Incidents log
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Great expectations status panel
  const [geReport, setGeReport] = useState<any>(null);

  // REST endpoints integration
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline-status');
      const data = await res.json();
      setPipelineState(data.status);
      setAnomalyActive(data.anomalyModeActive);
      setCircuitBreakerEngaged(data.circuitBreakerState.status === 'ENGAGED');
      setCircuitBreakerReason(data.circuitBreakerState.reason);
      setGeReport(data.greatExpectationsReport);
    } catch (e) {
      console.warn('API server offline, running in mock simulation mode.');
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      const data = await res.json();
      setIncidents(data);
    } catch (e) {
      // Fallback local mock incidents
    }
  }, []);

  // Set up WebSocket connection with automatic retry
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connectWS = () => {
      setWsStatus('CONNECTING');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Proxied via Vite or direct gateway
      // Since backend runs on 3001, connect directly if in separate local dev, 
      // or proxy if combined. Let's make it robust:
      const wsUrl = host.includes('3000') 
        ? `${protocol}//${window.location.hostname}:3001`
        : `${protocol}//${host}`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsStatus('CONNECTED');
        console.log('Connected to IceStream telemetry WebSocket.');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.event === 'INITIAL_SYNC') {
            setPipelineState(payload.status);
            setAnomalyActive(payload.isAnomalyActive);
            setIncidents(payload.incidents);
          } 
          else if (payload.event === 'METRICS_UPDATE') {
            const data = payload.metrics;
            setCurrentMetrics(data);
            
            // Append line chart series up to 20 ticks
            setChartData((prev) => {
              const updated = [
                ...prev,
                {
                  time: new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  throughput: data.throughput,
                  errorRate: data.errorRate
                }
              ];
              return updated.slice(-20); // Slider constraints
            });
          }
          else if (payload.event === 'INCIDENT_TRIGGERED') {
            setIncidents((prev) => [payload.data, ...prev]);
            setAnomalyActive(true);
            setCircuitBreakerEngaged(true);
            fetchStatus(); // Refresh quality stats
          }
          else if (payload.event === 'INCIDENTS_RESOLVED') {
            setAnomalyActive(false);
            setCircuitBreakerEngaged(false);
            fetchStatus();
            fetchIncidents();
          }
          else if (payload.event === 'PIPELINE_STATE_CHANGED') {
            setPipelineState(payload.status);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setWsStatus('DISCONNECTED');
        console.log('WS connection closed. Reconnecting in 3s...');
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWS();
    fetchStatus();
    fetchIncidents();

    // Secondary interval fallback for metrics in case backend isn't booted
    const mockInterval = setInterval(() => {
      if (wsStatus === 'CONNECTED') return; // Bypass if active
      
      const simulatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const mockLoad = pipelineState === 'RUNNING' ? 120 + Math.floor(Math.random() * 20 - 10) : 0;
      const mockErr = pipelineState === 'RUNNING' ? (anomalyActive ? 15.4 + Math.random() * 2 : 0.3 + Math.random() * 0.2) : 0;
      
      setCurrentMetrics({
        throughput: mockLoad,
        errorRate: parseFloat(mockErr.toFixed(2)),
        processedTotal: currentMetrics.processedTotal + mockLoad,
        activeConnections: 1
      });

      setChartData((prev) => [
        ...prev,
        { time: simulatedTime, throughput: mockLoad, errorRate: parseFloat(mockErr.toFixed(2)) }
      ].slice(-20));
    }, 1000);

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
      clearInterval(mockInterval);
    };
  }, [wsStatus, pipelineState, anomalyActive, currentMetrics.processedTotal, fetchStatus, fetchIncidents]);

  // Action: Toggle pipeline stream
  const handleTogglePipeline = async () => {
    try {
      const res = await fetch('/api/toggle-pipeline', { method: 'POST' });
      const data = await res.json();
      setPipelineState(data.status);
    } catch (e) {
      // Local state fallback
      setPipelineState(prev => prev === 'RUNNING' ? 'PAUSED' : 'RUNNING');
    }
  };

  // Action: Inject / Resolve Anomaly
  const handleTriggerAnomaly = async () => {
    try {
      const res = await fetch('/api/trigger-anomaly', { method: 'POST' });
      const data = await res.json();
      setAnomalyActive(data.anomalyActive);
      setCircuitBreakerEngaged(data.anomalyActive);
      fetchStatus();
      fetchIncidents();
    } catch (e) {
      // Local state fallback
      const newState = !anomalyActive;
      setAnomalyActive(newState);
      setCircuitBreakerEngaged(newState);
      
      if (newState) {
        const localInc: Incident = {
          id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString(),
          severity: "CRITICAL",
          ruleViolated: "Null tax_amount > 2% (Circuit Breaker Triggered)",
          affectedNode: "Apache Flink",
          message: "FALLBACK TRIGGER: Simulation anomaly injected. Redirecting load to ecommerce_events_dlq.",
          resolved: false
        };
        setIncidents(prev => [localInc, ...prev]);
      } else {
        setIncidents(prev => prev.map(inc => ({ ...inc, resolved: true })));
      }
    }
  };

  // React Flow configuration mapping data lineage Kafka -> Flink -> S3 (Main) / S3 (DLQ)
  const nodes: Node[] = useMemo(() => {
    const isError = anomalyActive;
    
    return [
      {
        id: 'node-kafka',
        type: 'input',
        position: { x: 50, y: 150 },
        data: { 
          label: (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono">
              <Layers className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-bold text-white block">Kafka Ingestion</span>
                <span className="text-[9px] text-slate-400">topic: checkout_events</span>
              </div>
            </div>
          )
        },
        style: { 
          background: 'rgba(15, 23, 42, 0.95)', 
          border: '1.5px solid #22d3ee',
          boxShadow: '0 0 10px rgba(34,211,238,0.1)'
        }
      },
      {
        id: 'node-flink',
        position: { x: 280, y: 150 },
        data: { 
          label: (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono">
              <Server className="w-4 h-4 text-purple-400" />
              <div>
                <span className="font-bold text-white block">Flink Stream Engine</span>
                <span className="text-[9px] text-slate-400">Circuit Breaker: {isError ? '💥 ENGAGED' : '✓ CLOSED'}</span>
              </div>
            </div>
          )
        },
        style: { 
          background: 'rgba(15, 23, 42, 0.95)', 
          border: isError ? '1.5px solid #f43f5e' : '1.5px solid #a855f7',
          boxShadow: isError ? '0 0 15px rgba(244,63,94,0.2)' : '0 0 10px rgba(168,85,247,0.1)'
        }
      },
      {
        id: 'node-iceberg-main',
        type: 'output',
        position: { x: 560, y: 70 },
        data: { 
          label: (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono">
              <Database className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold text-white block">Iceberg ecommerce_events</span>
                <span className="text-[9px] text-slate-400">Active: {!isError ? '🟢 YES' : '⚪ STALLED'}</span>
              </div>
            </div>
          )
        },
        style: { 
          background: 'rgba(15, 23, 42, 0.95)', 
          border: !isError ? '1.5px solid #10b981' : '1.5px solid #475569',
          boxShadow: !isError ? '0 0 10px rgba(16,185,129,0.1)' : 'none'
        }
      },
      {
        id: 'node-iceberg-dlq',
        type: 'output',
        position: { x: 560, y: 230 },
        data: { 
          label: (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono">
              <AlertTriangle className={`w-4 h-4 ${isError ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
              <div>
                <span className="font-bold text-white block">Iceberg events_dlq</span>
                <span className="text-[9px] text-slate-400">Diverted Traffic: {isError ? '🔴 ACTIVE' : '⚪ IDLE'}</span>
              </div>
            </div>
          )
        },
        style: { 
          background: 'rgba(15, 23, 42, 0.95)', 
          border: isError ? '1.5px solid #ef4444' : '1.5px solid #334155',
          boxShadow: isError ? '0 0 15px rgba(239,68,68,0.2)' : 'none'
        }
      }
    ];
  }, [anomalyActive]);

  const edges: Edge[] = useMemo(() => {
    const isError = anomalyActive;
    return [
      { 
        id: 'e-k-f', 
        source: 'node-kafka', 
        target: 'node-flink', 
        animated: pipelineState === 'RUNNING',
        style: { stroke: '#22d3ee' }
      },
      { 
        id: 'e-f-main', 
        source: 'node-flink', 
        target: 'node-iceberg-main', 
        animated: pipelineState === 'RUNNING' && !isError,
        style: { stroke: !isError ? '#10b981' : '#475569', strokeDasharray: !isError ? 'none' : '5 5' }
      },
      { 
        id: 'e-f-dlq', 
        source: 'node-flink', 
        target: 'node-iceberg-dlq', 
        animated: pipelineState === 'RUNNING' && isError,
        style: { stroke: isError ? '#ef4444' : '#334155', strokeDasharray: isError ? 'none' : '5 5' }
      }
    ];
  }, [anomalyActive, pipelineState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* HEADER BAR */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white font-mono flex items-center gap-1.5">
              <span className="text-cyan-400 text-lg">⚡</span>
              IceStream
            </h1>
            <span className="text-[9px] bg-cyan-950/40 text-cyan-400 font-bold border border-cyan-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Real-Time Lakehouse Observability
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Corporate Internship Observability Monorepo Workspace</p>
        </div>

        {/* WebSocket status badge */}
        <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${
            wsStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 
            wsStatus === 'CONNECTING' ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
          <span className="font-mono text-slate-300">Gateway: {wsStatus}</span>
        </div>
      </header>

      {/* OPERATIONAL ALERTS / BANNERS */}
      {circuitBreakerEngaged && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-6 py-3 flex items-center justify-between gap-4 text-xs text-rose-300 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <span className="font-black font-mono block">CRITICAL: FLINK CIRCUIT BREAKER TRIGGERED</span>
              <span className="text-[11px] text-rose-400">{circuitBreakerReason || 'Null tax values exceed 2% limit. Inbound events redirected to DLQ.'}</span>
            </div>
          </div>
          <div className="px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/30 text-[9px] font-bold uppercase rounded font-mono">
            Diverting Stream
          </div>
        </div>
      )}

      {/* DASHBOARD GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE TOPOLOGY & METRICS (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* CONTROL STRIP */}
          <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleTogglePipeline}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  pipelineState === 'RUNNING' 
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20' 
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {pipelineState === 'RUNNING' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Halt Ingestion
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Resume Ingestion
                  </>
                )}
              </button>

              <button
                onClick={handleTriggerAnomaly}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  anomalyActive 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${anomalyActive ? 'text-rose-400 fill-rose-500' : ''}`} />
                {anomalyActive ? 'Resolve Injected Anomaly' : 'Inject Anomalous Stream'}
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <div>State: <span className={`font-bold ${pipelineState === 'RUNNING' ? 'text-emerald-400' : 'text-slate-500'}`}>{pipelineState}</span></div>
              <div className="w-px h-4 bg-slate-800" />
              <div>Fault Rate limit: <span className="text-cyan-400 font-bold">2.0%</span></div>
            </div>
          </div>

          {/* TELEMETRY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Stream Throughput</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-white font-mono">{currentMetrics.throughput}</span>
                <span className="text-[10px] text-slate-400 font-mono">evt/sec</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                Live Kafka Broker load
              </p>
            </div>

            <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Null Tax Ratio</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className={`text-2xl font-black font-mono ${circuitBreakerEngaged ? 'text-rose-500' : 'text-cyan-400'}`}>
                  {currentMetrics.errorRate}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">error rate</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck className={`w-3 h-3 ${circuitBreakerEngaged ? 'text-rose-500' : 'text-emerald-400'}`} />
                Threshold limit 2.0%
              </p>
            </div>

            <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Total Aggregated</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-white font-mono">{currentMetrics.processedTotal.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-mono">events</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Sum of commits inside S3</p>
            </div>
          </div>

          {/* DYNAMIC LINEAGE MAP (React Flow) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white">Dynamic Lineage Network Trace</h3>
                <p className="text-[11px] text-slate-400">Visual mapping of active streams diverted by circuit breaker thresholds.</p>
              </div>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">React Flow Canvas</span>
            </div>

            <div className="flex-1 h-[220px] bg-slate-950/60 rounded-xl overflow-hidden relative border border-slate-850">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                preventScrolling
                zoomOnScroll={false}
                zoomOnPinch={false}
                panOnDrag={false}
              >
                <Background color="rgba(148, 163, 184, 0.05)" gap={16} />
              </ReactFlow>
            </div>
          </div>

          {/* TELEMETRY CHART (Recharts) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[250px]">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white">Observability Metrics Trace</h3>
                <p className="text-[11px] text-slate-400">Real-time throughput streams paired with null field incident frequencies.</p>
              </div>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">Recharts Line Trace</span>
            </div>

            <div className="flex-1 h-[180px] pr-4">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                  Loading streaming observability charts...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.05)" />
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#22d3ee" fontSize={9} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={9} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: '11px' }} 
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="throughput" name="Load (evt/s)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="errorRate" name="Error Rate (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DATA QUALITY AUDITS & INCIDENTS (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* GREAT EXPECTATIONS SANITY CHECK */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-850 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-cyan-400 font-mono uppercase block">Batch Validations</span>
                <h3 className="text-sm font-black text-white">Great Expectations Assertions</h3>
              </div>
              <span className="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono">v0.17</span>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>ASSERTION RATIO</span>
                  <span className={geReport?.status === 'OK' ? 'text-emerald-400' : 'text-rose-400'}>
                    {geReport?.success_rate_percent || (anomalyActive ? '50.0%' : '100.0%')}
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${geReport?.status === 'OK' ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                    style={{ width: geReport?.success_rate_percent ? `${geReport.success_rate_percent}%` : (anomalyActive ? '50%' : '100%') }}
                  />
                </div>
              </div>

              {/* Expectations Lists */}
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-850/60 items-center">
                  <span className="text-slate-300">expect_amount_to_be_gt_0</span>
                  <span className={anomalyActive ? 'text-rose-400' : 'text-emerald-400'}>
                    {anomalyActive ? '❌ FAIL (8 rows)' : '✓ PASS'}
                  </span>
                </div>
                
                <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-850/60 items-center">
                  <span className="text-slate-300">expect_tax_not_null_mostly_90</span>
                  <span className={anomalyActive ? 'text-rose-400' : 'text-emerald-400'}>
                    {anomalyActive ? '❌ FAIL (42 rows)' : '✓ PASS'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-xl text-[10px] text-cyan-300 flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Great Expectations runs asserts directly on generated stream frames, preventing structural anomalies from landing in clean iceberg tables.
                </p>
              </div>
            </div>
          </div>

          {/* SEVERE INCIDENTS LOG */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between min-h-[350px]">
            <div className="border-b border-slate-850 pb-3 mb-4">
              <span className="text-[9px] font-bold text-rose-500 font-mono uppercase block">System Anomalies</span>
              <h3 className="text-sm font-black text-white">Lineage Incidents</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1">
              {incidents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-500 text-xs font-mono">
                  <CheckCircle2 className="w-8 h-8 text-slate-700 mb-2" />
                  No incidents logged. Stream validation checks green.
                </div>
              ) : (
                incidents.map((inc) => (
                  <div 
                    key={inc.id}
                    className={`p-3.5 rounded-xl border font-mono text-xs space-y-2 transition-all ${
                      inc.resolved 
                        ? 'bg-slate-950/40 border-slate-850 text-slate-400' 
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        inc.resolved 
                          ? 'bg-slate-800 text-slate-400' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/25'
                      }`}>
                        {inc.id} • {inc.resolved ? 'RESOLVED' : 'ACTIVE'}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-[11px] text-slate-200">{inc.ruleViolated}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{inc.message}</p>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1.5 border-t border-slate-850/40">
                      <span>Node: {inc.affectedNode}</span>
                      <span className="uppercase">{inc.severity}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-850 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>Axlero Observability Framework</span>
              <span>v1.0.0 SPEC</span>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-xs text-center text-slate-500 mt-12 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>Axlero Solutions Internship Project Template © 2026</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> 
              Vite Dev (Port 3000)
            </span>
            <span>Security: Local Sandbox Layer</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
