import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  GitBranch,
  Layers3,
  Play,
  Radio,
  Server,
  ShieldCheck,
  Square,
  Zap,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Status = "CONNECTED" | "DISCONNECTED" | "CONNECTING";
type PipelineState = "RUNNING" | "PAUSED";

interface Incident {
  id: string;
  timestamp: string;
  severity: "WARNING" | "CRITICAL";
  ruleViolated: string;
  affectedNode: string;
  message: string;
  resolved: boolean;
}

interface ChartPoint {
  time: string;
  throughput: number;
  errorRate: number;
}

interface Metrics {
  throughput: number;
  errorRate: number;
  processedTotal: number;
  activeConnections: number;
}

export default function App() {
  const [wsStatus, setWsStatus] =
    useState<Status>("DISCONNECTED");

  const [pipelineState, setPipelineState] =
    useState<PipelineState>("RUNNING");

  const [anomalyActive, setAnomalyActive] =
    useState(false);

  const [circuitBreakerEngaged, setCircuitBreakerEngaged] =
    useState(false);

  const [metrics, setMetrics] = useState<Metrics>({
    throughput: 112,
    errorRate: 0.41,
    processedTotal: 0,
    activeConnections: 1,
  });

  const [chartData, setChartData] =
    useState<ChartPoint[]>([]);

  const [incidents, setIncidents] =
    useState<Incident[]>([]);

  const [geReport, setGeReport] =
    useState<any>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline-status");

      if (!res.ok) {
        throw new Error("Pipeline status request failed");
      }

      const data = await res.json();

      if (!mountedRef.current) return;

      setPipelineState(
        data.status === "PAUSED"
          ? "PAUSED"
          : "RUNNING"
      );

      setAnomalyActive(
        Boolean(data.anomalyModeActive)
      );

      setCircuitBreakerEngaged(
        data.circuitBreakerState?.status ===
          "ENGAGED"
      );

      setGeReport(
        data.greatExpectationsReport ?? null
      );
    } catch (error) {
      console.error(
        "Failed to fetch pipeline status:",
        error
      );
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents");

      if (!res.ok) {
        throw new Error("Incident request failed");
      }

      const data = await res.json();

      if (!mountedRef.current) return;

      setIncidents(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Failed to fetch incidents:",
        error
      );
    }
  }, []);

  /*
   * IMPORTANT:
   * This effect runs ONLY ONCE.
   *
   * Previously the effect depended on:
   * anomalyActive
   * pipelineState
   * wsStatus
   *
   * That caused a new WebSocket to be created
   * every time the dashboard state changed.
   *
   * Now there is only ONE WebSocket connection.
   */
  useEffect(() => {
    mountedRef.current = true;

    fetchStatus();
    fetchIncidents();

    let reconnecting = false;

    const connect = () => {
      if (!mountedRef.current) return;

      if (
        socketRef.current &&
        (
          socketRef.current.readyState ===
            WebSocket.OPEN ||
          socketRef.current.readyState ===
            WebSocket.CONNECTING
        )
      ) {
        return;
      }

      try {
        setWsStatus("CONNECTING");

        const protocol =
          window.location.protocol === "https:"
            ? "wss:"
            : "ws:";

        const host =
          window.location.hostname || "localhost";

        const socket = new WebSocket(
          `${protocol}//${host}:3001`
        );

        socketRef.current = socket;

        socket.onopen = () => {
          if (!mountedRef.current) return;

          reconnecting = false;

          setWsStatus("CONNECTED");

          console.log(
            "IceStream WebSocket connected"
          );
        };

        socket.onmessage = (event) => {
          if (!mountedRef.current) return;

          try {
            const payload = JSON.parse(
              event.data
            );

            /*
             * LIVE METRICS
             */
            if (
              payload.event ===
              "METRICS_UPDATE"
            ) {
              const m = payload.metrics;

              if (!m) return;

              const throughput =
                Number(m.throughput ?? 0);

              const errorRate =
                Number(m.errorRate ?? 0);

              const processedTotal =
                Number(
                  m.processedTotal ?? 0
                );

              const activeConnections =
                Number(
                  m.activeConnections ?? 1
                );

              setMetrics({
                throughput,
                errorRate,
                processedTotal,
                activeConnections,
              });

              const chartPoint: ChartPoint = {
                time: new Date(
                  payload.timestamp ||
                    Date.now()
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
                throughput,
                errorRate,
              };

              setChartData((prev) =>
                [...prev, chartPoint].slice(
                  -30
                )
              );
            }

            /*
             * INITIAL SYNC
             */
            if (
              payload.event ===
              "INITIAL_SYNC"
            ) {
              setPipelineState(
                payload.status ===
                  "PAUSED"
                  ? "PAUSED"
                  : "RUNNING"
              );

              setAnomalyActive(
                Boolean(
                  payload.isAnomalyActive
                )
              );

              setCircuitBreakerEngaged(
                Boolean(
                  payload.circuitBreakerState
                    ?.status === "ENGAGED"
                )
              );

              if (
                Array.isArray(
                  payload.incidents
                )
              ) {
                setIncidents(
                  payload.incidents
                );
              }

              if (payload.metrics) {
                setMetrics({
                  throughput: Number(
                    payload.metrics
                      .throughput ?? 0
                  ),
                  errorRate: Number(
                    payload.metrics
                      .errorRate ?? 0
                  ),
                  processedTotal: Number(
                    payload.metrics
                      .processedTotal ?? 0
                  ),
                  activeConnections: Number(
                    payload.metrics
                      .activeConnections ?? 1
                  ),
                });
              }
            }

            /*
             * INCIDENT TRIGGERED
             */
            if (
              payload.event ===
              "INCIDENT_TRIGGERED"
            ) {
              setAnomalyActive(true);
              setCircuitBreakerEngaged(
                true
              );

              if (payload.data) {
                setIncidents((prev) => {
                  const exists =
                    prev.some(
                      (item) =>
                        item.id ===
                        payload.data.id
                    );

                  if (exists) {
                    return prev;
                  }

                  return [
                    payload.data,
                    ...prev,
                  ];
                });
              }

              fetchStatus();
              fetchIncidents();
            }

            /*
             * INCIDENTS RESOLVED
             */
            if (
              payload.event ===
              "INCIDENTS_RESOLVED"
            ) {
              setAnomalyActive(false);

              setCircuitBreakerEngaged(
                false
              );

              fetchStatus();
              fetchIncidents();
            }

            /*
             * PIPELINE STATE
             */
            if (
              payload.event ===
              "PIPELINE_STATE_CHANGED"
            ) {
              setPipelineState(
                payload.status ===
                  "PAUSED"
                  ? "PAUSED"
                  : "RUNNING"
              );
            }
          } catch (error) {
            console.error(
              "Invalid WebSocket payload:",
              error
            );
          }
        };

        socket.onerror = (error) => {
          console.error(
            "IceStream WebSocket error:",
            error
          );
        };

        socket.onclose = () => {
          if (!mountedRef.current) return;

          setWsStatus("DISCONNECTED");

          socketRef.current = null;

          /*
           * Reconnect only ONCE.
           */
          if (!reconnecting) {
            reconnecting = true;

            if (
              reconnectTimerRef.current
            ) {
              clearTimeout(
                reconnectTimerRef.current
              );
            }

            reconnectTimerRef.current =
              setTimeout(() => {
                reconnecting = false;
                connect();
              }, 4000);
          }
        };
      } catch (error) {
        console.error(
          "WebSocket connection failed:",
          error
        );

        setWsStatus("DISCONNECTED");

        if (!reconnecting) {
          reconnecting = true;

          reconnectTimerRef.current =
            setTimeout(() => {
              reconnecting = false;
              connect();
            }, 4000);
        }
      }
    };

    connect();

    /*
     * Refresh REST data periodically.
     * This does NOT create another WebSocket.
     */
    const refreshTimer =
      setInterval(() => {
        fetchStatus();
        fetchIncidents();
      }, 10000);

    return () => {
      mountedRef.current = false;

      clearInterval(refreshTimer);

      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );
      }

      if (socketRef.current) {
        socketRef.current.onclose =
          null;

        socketRef.current.close();

        socketRef.current = null;
      }
    };
  }, [fetchStatus, fetchIncidents]);

  const togglePipeline = async () => {
    try {
      const res = await fetch(
        "/api/toggle-pipeline",
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to toggle pipeline"
        );
      }

      const data = await res.json();

      setPipelineState(
        data.status === "PAUSED"
          ? "PAUSED"
          : "RUNNING"
      );

      await fetchStatus();
    } catch (error) {
      console.error(
        "Pipeline toggle failed:",
        error
      );
    }
  };

  const toggleAnomaly = async () => {
    try {
      const res = await fetch(
        "/api/trigger-anomaly",
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to toggle anomaly"
        );
      }

      const data = await res.json();

      setAnomalyActive(
        Boolean(data.anomalyActive)
      );

      setCircuitBreakerEngaged(
        Boolean(data.anomalyActive)
      );

      await fetchStatus();
      await fetchIncidents();
    } catch (error) {
      console.error(
        "Anomaly request failed:",
        error
      );
    }
  };

  const nodes: Node[] = useMemo(
    () => [
      {
        id: "kafka",
        position: {
          x: 30,
          y: 115,
        },
        sourcePosition: Position.Right,
        data: {
          label: (
            <NodeCard
              icon={<Radio size={18} />}
              title="Kafka"
              subtitle="checkout_events"
              color="cyan"
              status={
                pipelineState === "RUNNING"
                  ? "LIVE"
                  : "PAUSED"
              }
            />
          ),
        },
        style: nodeStyle("#22d3ee"),
      },

      {
        id: "flink",
        position: {
          x: 280,
          y: 115,
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        data: {
          label: (
            <NodeCard
              icon={<Server size={18} />}
              title="Apache Flink"
              subtitle="Stream Processor"
              color="purple"
              status={
                anomalyActive
                  ? "BREAKER ON"
                  : "HEALTHY"
              }
            />
          ),
        },
        style: nodeStyle(
          anomalyActive
            ? "#fb7185"
            : "#a78bfa"
        ),
      },

      {
        id: "iceberg",
        position: {
          x: 540,
          y: 40,
        },
        targetPosition: Position.Left,
        data: {
          label: (
            <NodeCard
              icon={<Database size={18} />}
              title="Iceberg"
              subtitle="ecommerce_events"
              color="emerald"
              status={
                anomalyActive
                  ? "PROTECTED"
                  : "WRITING"
              }
            />
          ),
        },
        style: nodeStyle(
          anomalyActive
            ? "#475569"
            : "#34d399"
        ),
      },

      {
        id: "dlq",
        position: {
          x: 540,
          y: 195,
        },
        targetPosition: Position.Left,
        data: {
          label: (
            <NodeCard
              icon={
                <AlertTriangle size={18} />
              }
              title="DLQ"
              subtitle="events_dlq"
              color="rose"
              status={
                anomalyActive
                  ? "RECEIVING"
                  : "IDLE"
              }
            />
          ),
        },
        style: nodeStyle(
          anomalyActive
            ? "#fb7185"
            : "#475569"
        ),
      },
    ],
    [
      anomalyActive,
      pipelineState,
    ]
  );

  const edges: Edge[] = [
    {
      id: "kafka-flink",
      source: "kafka",
      target: "flink",
      animated:
        pipelineState === "RUNNING",
      style: {
        stroke: "#22d3ee",
        strokeWidth: 3,
      },
    },

    {
      id: "flink-iceberg",
      source: "flink",
      target: "iceberg",
      animated:
        pipelineState === "RUNNING" &&
        !anomalyActive,
      style: {
        stroke: anomalyActive
          ? "#334155"
          : "#34d399",
        strokeWidth: 3,
      },
    },

    {
      id: "flink-dlq",
      source: "flink",
      target: "dlq",
      animated:
        pipelineState === "RUNNING" &&
        anomalyActive,
      style: {
        stroke: anomalyActive
          ? "#fb7185"
          : "#334155",
        strokeWidth: 3,
      },
    },
  ];

  const health = anomalyActive ? 64 : 98;

  const activeIncidents =
    incidents.filter(
      (item) => !item.resolved
    );

  const displayedIncidents =
    incidents.slice(0, 5);

  const qualitySuccess =
    geReport?.success_rate_percent ??
    (anomalyActive ? 50 : 100);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full" />

        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-violet-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl px-7 py-5">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap
                size={23}
                className="text-white fill-white"
              />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight">
                  IceStream
                </h1>

                <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                  LIVE OBSERVABILITY
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                Real-Time Lakehouse Data Reliability Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  wsStatus === "CONNECTED"
                    ? "bg-emerald-400 shadow-lg shadow-emerald-400/60"
                    : wsStatus ===
                      "CONNECTING"
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />

              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">
                  Gateway
                </div>

                <div className="text-xs font-semibold">
                  {wsStatus}
                </div>
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold">
              v1.0.0
            </div>
          </div>
        </div>
      </header>

      {circuitBreakerEngaged && (
        <div className="relative z-10 border-b border-rose-500/30 bg-rose-500/[0.08] px-7 py-3">
          <div className="max-w-[1500px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle
                  size={17}
                  className="text-rose-400"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-rose-300">
                  CIRCUIT BREAKER ENGAGED
                </div>

                <div className="text-[11px] text-rose-400/70">
                  Null tax ratio exceeded the
                  2.0% safety threshold. Traffic
                  diverted to DLQ.
                </div>
              </div>
            </div>

            <span className="hidden sm:block text-[9px] uppercase tracking-widest font-bold text-rose-300 border border-rose-400/20 px-3 py-1 rounded-full">
              Incident Active
            </span>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-[1500px] mx-auto px-7 py-7 space-y-6">
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">
              <Activity size={14} />
              System Overview
            </div>

            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Streaming Operations
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Monitor ingestion, quality, lineage and
              storage health in real time.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={togglePipeline}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                pipelineState === "RUNNING"
                  ? "bg-amber-400/10 border-amber-400/20 text-amber-300 hover:bg-amber-400/20"
                  : "bg-emerald-400/10 border-emerald-400/20 text-emerald-300 hover:bg-emerald-400/20"
              }`}
            >
              {pipelineState === "RUNNING" ? (
                <>
                  <Square
                    size={14}
                    fill="currentColor"
                  />
                  Halt Ingestion
                </>
              ) : (
                <>
                  <Play
                    size={14}
                    fill="currentColor"
                  />
                  Resume Ingestion
                </>
              )}
            </button>

            <button
              onClick={toggleAnomaly}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                anomalyActive
                  ? "bg-rose-500/15 border-rose-400/30 text-rose-300"
                  : "bg-violet-500/10 border-violet-400/20 text-violet-300 hover:bg-violet-500/20"
              }`}
            >
              <Zap size={14} />

              {anomalyActive
                ? "Resolve Anomaly"
                : "Inject Anomaly"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            icon={<Gauge />}
            label="Stream Throughput"
            value={metrics.throughput.toLocaleString()}
            unit="evt/s"
            detail="Kafka ingestion rate"
            color="cyan"
            trend="+8.4%"
          />

          <MetricCard
            icon={<ShieldCheck />}
            label="Null Tax Ratio"
            value={metrics.errorRate.toFixed(2)}
            unit="%"
            detail="Safety threshold 2.0%"
            color={
              anomalyActive
                ? "rose"
                : "emerald"
            }
            trend={
              anomalyActive
                ? "CRITICAL"
                : metrics.errorRate >= 1.5
                ? "WARNING"
                : "HEALTHY"
            }
          />

          <MetricCard
            icon={<Database />}
            label="Events Processed"
            value={metrics.processedTotal.toLocaleString()}
            unit="events"
            detail="Iceberg commits"
            color="violet"
            trend="+12.6%"
          />

          <MetricCard
            icon={<Radio />}
            label="Active Connections"
            value={metrics.activeConnections.toString()}
            unit="streams"
            detail="Live pipeline links"
            color="blue"
            trend="STABLE"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-xl overflow-hidden">
            <PanelHeader
              icon={<GitBranch size={17} />}
              title="Live Data Lineage"
              subtitle="Kafka → Flink → Iceberg"
              badge={
                anomalyActive
                  ? "DIVERTING"
                  : pipelineState ===
                    "RUNNING"
                  ? "STREAMING"
                  : "PAUSED"
              }
              badgeColor={
                anomalyActive
                  ? "rose"
                  : pipelineState ===
                    "RUNNING"
                  ? "emerald"
                  : "violet"
              }
            />

            <div className="h-[390px] bg-[#030914]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{
                  padding: 0.25,
                }}
                nodesDraggable={false}
                nodesConnectable={false}
                zoomOnScroll={false}
              >
                <Background
                  gap={22}
                  color="rgba(148,163,184,0.08)"
                />

                <Controls
                  showInteractive={false}
                  className="!bg-slate-900/80 !border-white/10"
                />
              </ReactFlow>
            </div>

            <div className="grid grid-cols-3 border-t border-white/10">
              <StatusCell
                label="INGESTION"
                value="Kafka"
                status={
                  pipelineState ===
                  "RUNNING"
                    ? "LIVE"
                    : "PAUSED"
                }
                statusColor={
                  pipelineState ===
                  "RUNNING"
                    ? "emerald"
                    : "amber"
                }
              />

              <StatusCell
                label="PROCESSING"
                value="Flink"
                status={
                  anomalyActive
                    ? "PROTECTED"
                    : "HEALTHY"
                }
                statusColor={
                  anomalyActive
                    ? "rose"
                    : "emerald"
                }
              />

              <StatusCell
                label="STORAGE"
                value="Iceberg"
                status={
                  anomalyActive
                    ? "PROTECTED"
                    : "WRITING"
                }
                statusColor={
                  anomalyActive
                    ? "amber"
                    : "emerald"
                }
              />
            </div>
          </div>

          <div className="xl:col-span-4 rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-xl p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Platform Health
                </div>

                <h3 className="text-xl font-black mt-1">
                  System Status
                </h3>
              </div>

              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  anomalyActive
                    ? "bg-rose-400/10"
                    : "bg-emerald-400/10"
                }`}
              >
                {anomalyActive ? (
                  <AlertTriangle
                    className="text-rose-400"
                    size={20}
                  />
                ) : (
                  <CheckCircle2
                    className="text-emerald-400"
                    size={20}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-center py-4">
              <div
                className="relative w-44 h-44 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(
                    #22d3ee 0deg,
                    #22d3ee ${
                      health * 3.6
                    }deg,
                    rgba(255,255,255,0.05) ${
                      health * 3.6
                    }deg
                  )`,
                }}
              >
                <div className="absolute inset-[10px] rounded-full bg-[#07101d] flex flex-col items-center justify-center">
                  <span className="text-4xl font-black">
                    {health}%
                  </span>

                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                    Health Score
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-5">
              <HealthRow
                label="Kafka Broker"
                value="Operational"
                ok
              />

              <HealthRow
                label="Flink Processor"
                value={
                  anomalyActive
                    ? "Circuit Breaker"
                    : "Operational"
                }
                ok={!anomalyActive}
              />

              <HealthRow
                label="Iceberg Storage"
                value={
                  anomalyActive
                    ? "Protected"
                    : "Operational"
                }
                ok={!anomalyActive}
              />

              <HealthRow
                label="Data Quality"
                value={
                  anomalyActive
                    ? "Degraded"
                    : "100% Valid"
                }
                ok={!anomalyActive}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-8 gap-6">
          <div className="xl:col-span-5 rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-xl p-5">
            <PanelHeader
              icon={<Activity size={17} />}
              title="Real-Time Telemetry"
              subtitle="Throughput vs error rate"
              badge="LIVE"
              badgeColor="cyan"
            />

            <div className="h-[270px] mt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={chartData}
                  >
                    <CartesianGrid
                      stroke="rgba(148,163,184,0.06)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      stroke="#475569"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      yAxisId="left"
                      stroke="#22d3ee"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#fb7185"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        background:
                          "#07101d",
                        border:
                          "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    />

                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="throughput"
                      stroke="#22d3ee"
                      strokeWidth={3}
                      dot={false}
                      name="Throughput"
                    />

                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="errorRate"
                      stroke="#fb7185"
                      strokeWidth={2}
                      dot={false}
                      name="Error %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                  Waiting for telemetry stream...
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 text-[10px] text-slate-500 mt-2">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Throughput
              </span>

              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Error Rate
              </span>
            </div>
          </div>

          <div className="xl:col-span-3 rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-xl p-5">
            <PanelHeader
              icon={<Layers3 size={17} />}
              title="Data Quality"
              subtitle="Great Expectations"
              badge="v0.17"
              badgeColor="violet"
            />

            <div className="mt-5 rounded-2xl bg-slate-950/70 border border-white/5 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    Assertion Success
                  </div>

                  <div className="text-4xl font-black mt-1">
                    {Number(
                      qualitySuccess
                    ).toFixed(1)}

                    <span className="text-lg text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                {anomalyActive ? (
                  <AlertTriangle
                    size={28}
                    className="text-rose-400"
                  />
                ) : (
                  <CheckCircle2
                    size={28}
                    className="text-emerald-400"
                  />
                )}
              </div>

              <div className="h-2 bg-slate-800 rounded-full mt-5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    anomalyActive
                      ? "bg-gradient-to-r from-rose-500 to-orange-400"
                      : "bg-gradient-to-r from-emerald-500 to-cyan-400"
                  }`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        Number(
                          qualitySuccess
                        )
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <QualityRow
                name="amount > 0"
                pass={!anomalyActive}
              />

              <QualityRow
                name="tax not null > 90%"
                pass={!anomalyActive}
              />

              <QualityRow
                name="schema validation"
                pass
              />

              <QualityRow
                name="Iceberg write contract"
                pass={!anomalyActive}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-xl overflow-hidden">
          <PanelHeader
            icon={<AlertTriangle size={17} />}
            title="Incident Timeline"
            subtitle="Detected data quality and pipeline events"
            badge={`${activeIncidents.length} ACTIVE`}
            badgeColor={
              activeIncidents.length > 0
                ? "rose"
                : "emerald"
            }
          />

          <div className="p-5">
            {displayedIncidents.length ===
            0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-400/10 flex items-center justify-center">
                  <ShieldCheck
                    size={23}
                    className="text-emerald-400"
                  />
                </div>

                <div className="font-bold mt-3">
                  No incidents detected
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  All streaming validation checks
                  are green.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedIncidents.map(
                  (incident) => (
                    <div
                      key={incident.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border ${
                        incident.resolved
                          ? "bg-white/[0.02] border-white/5"
                          : "bg-rose-500/[0.05] border-rose-500/20"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          incident.resolved
                            ? "bg-emerald-400/10"
                            : "bg-rose-400/10"
                        }`}
                      >
                        {incident.resolved ? (
                          <CheckCircle2
                            size={18}
                            className="text-emerald-400"
                          />
                        ) : (
                          <AlertTriangle
                            size={18}
                            className="text-rose-400"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold">
                            {
                              incident.ruleViolated
                            }
                          </div>

                          {incident.resolved && (
                            <span className="text-[8px] font-bold tracking-widest px-2 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">
                              RESOLVED
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1">
                          {
                            incident.affectedNode
                          }{" "}
                          ·{" "}
                          {
                            incident.message
                          }
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-600">
                        {new Date(
                          incident.timestamp
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="flex flex-col md:flex-row items-center justify-between gap-3 py-4 text-[10px] text-slate-600">
          <div>
            IceStream · Real-Time Lakehouse
            Observability
          </div>

          <div className="flex items-center gap-5">
            <span>Kafka</span>
            <span>Apache Flink</span>
            <span>Apache Iceberg</span>
            <span>Great Expectations</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  detail,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  detail: string;
  color: string;
  trend: string;
}) {
  const colors: Record<
    string,
    string
  > = {
    cyan:
      "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    emerald:
      "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    violet:
      "text-violet-400 bg-violet-400/10 border-violet-400/20",
    blue:
      "text-blue-400 bg-blue-400/10 border-blue-400/20",
    rose:
      "text-rose-400 bg-rose-400/10 border-rose-400/20",
  };

  return (
    <div className="group relative rounded-3xl border border-white/10 bg-white/[0.025] p-5 overflow-hidden hover:border-white/20 transition-all">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100" />

      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}
        >
          {icon}
        </div>

        <span className="text-[9px] font-bold tracking-widest text-slate-600">
          LIVE
        </span>
      </div>

      <div className="mt-5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        {label}
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl font-black tracking-tight">
          {value}
        </span>

        <span className="text-xs text-slate-500">
          {unit}
        </span>
      </div>

      <div className="flex justify-between items-center mt-3">
        <span className="text-[10px] text-slate-600">
          {detail}
        </span>

        <span
          className={`text-[9px] font-bold ${
            color === "rose"
              ? "text-rose-400"
              : "text-emerald-400"
          }`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  subtitle,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
}) {
  const colors: Record<
    string,
    string
  > = {
    cyan:
      "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
    emerald:
      "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    violet:
      "text-violet-300 bg-violet-400/10 border-violet-400/20",
    rose:
      "text-rose-300 bg-rose-400/10 border-rose-400/20",
  };

  return (
    <div className="flex items-center justify-between p-5 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">
          {icon}
        </div>

        <div>
          <h3 className="text-sm font-bold">
            {title}
          </h3>

          <p className="text-[10px] text-slate-600 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <span
        className={`text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full border ${colors[badgeColor]}`}
      >
        {badge}
      </span>
    </div>
  );
}

function StatusCell({
  label,
  value,
  status,
  statusColor = "emerald",
}: {
  label: string;
  value: string;
  status: string;
  statusColor?: string;
}) {
  const colors: Record<
    string,
    string
  > = {
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
  };

  return (
    <div className="p-4 border-r border-white/10 last:border-r-0">
      <div className="text-[9px] tracking-widest text-slate-600">
        {label}
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-bold">
          {value}
        </span>

        <span
          className={`text-[9px] ${colors[statusColor]}`}
        >
          ● {status}
        </span>
      </div>
    </div>
  );
}

function HealthRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.025] border border-white/5">
      <span className="text-xs text-slate-400">
        {label}
      </span>

      <span
        className={`flex items-center gap-1.5 text-[10px] font-bold ${
          ok
            ? "text-emerald-400"
            : "text-rose-400"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {value}
      </span>
    </div>
  );
}

function QualityRow({
  name,
  pass,
}: {
  name: string;
  pass: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.025] border border-white/5">
      <span className="text-[11px] text-slate-400">
        {name}
      </span>

      {pass ? (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
          <CheckCircle2 size={13} />
          PASS
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
          <AlertTriangle size={13} />
          FAIL
        </span>
      )}
    </div>
  );
}

function NodeCard({
  icon,
  title,
  subtitle,
  color,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  status: string;
}) {
  const text: Record<
    string,
    string
  > = {
    cyan: "text-cyan-400",
    purple: "text-violet-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
  };

  return (
    <div className="px-4 py-3 min-w-[180px]">
      <div
        className={`flex items-center gap-2 ${text[color]}`}
      >
        {icon}

        <span className="text-xs font-black text-white">
          {title}
        </span>
      </div>

      <div className="text-[9px] text-slate-500 mt-2">
        {subtitle}
      </div>

      <div className="text-[9px] text-emerald-400 mt-1 font-bold">
        ● {status}
      </div>
    </div>
  );
}

function nodeStyle(border: string) {
  return {
    background:
      "rgba(7, 16, 29, 0.96)",
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 0,
    boxShadow: `0 0 25px ${border}18`,
  };
}