import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  FolderGit, 
  Calendar, 
  Copy, 
  Check, 
  Server, 
  Database, 
  Activity, 
  Users, 
  Network, 
  Key, 
  ShieldAlert, 
  FileCode, 
  Terminal, 
  ArrowRight, 
  Zap, 
  GitPullRequest,
  CheckCircle2,
  Lock,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ARCHITECTURE_NODES, 
  ROADMAP_TASKS, 
  REPOSITORY_FILES, 
  ProjectFile, 
  ArchitectureNode, 
  TaskItem 
} from './data';

export default function App() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'repository' | 'roadmap' | 'docker'>('architecture');
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode>(ARCHITECTURE_NODES[0]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(REPOSITORY_FILES[0]);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [roadmapWeek, setRoadmapWeek] = useState<number | 'all'>('all');
  const [roadmapMember, setRoadmapMember] = useState<number | 'all'>('all');
  const [simulatedLoad, setSimulatedLoad] = useState<number>(100); // msgs/sec
  const [anomalyMode, setAnomalyMode] = useState<boolean>(false);

  // Copy code utility
  const handleCopyCode = (filename: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // Filter roadmap tasks
  const filteredTasks = ROADMAP_TASKS.filter(task => {
    const weekMatch = roadmapWeek === 'all' || task.week === roadmapWeek;
    const memberMatch = roadmapMember === 'all' || task.assignedTo === roadmapMember;
    return weekMatch && memberMatch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl shadow-lg shadow-cyan-500/10">
                <Cpu className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono">IceStream</h1>
                <span className="text-[10px] bg-slate-800 text-cyan-400 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-widest">
                  v1.0.0 SPEC
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-Time Lakehouse Observability Monorepo Architecture</p>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex flex-wrap items-center gap-3 md:gap-6 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 px-2.5 py-1">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">Stream Load</span>
                <span className="font-semibold text-slate-300 font-mono">
                  {anomalyMode ? (simulatedLoad * 2.4).toFixed(0) : simulatedLoad} rec/s
                </span>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex items-center gap-2 px-2.5 py-1">
              <ShieldAlert className={`w-4 h-4 ${anomalyMode ? 'text-rose-500 animate-bounce' : 'text-emerald-400'}`} />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">Data State</span>
                <span className={`font-semibold font-mono ${anomalyMode ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {anomalyMode ? 'ANOMALOUS (5.2%)' : 'VALIDATED (100%)'}
                </span>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex items-center gap-2 px-2.5 py-1">
              <GitPullRequest className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">CI Status</span>
                <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1">
                  PASSING <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* PRIMARY CONTROLS & NAVIGATION */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          
          {/* Tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-950/60 rounded-lg border border-slate-800/50 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-slate-800 text-cyan-400 shadow-md border border-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Pipeline Map
            </button>
            <button
              onClick={() => setActiveTab('repository')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                activeTab === 'repository'
                  ? 'bg-slate-800 text-cyan-400 shadow-md border border-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <FolderGit className="w-3.5 h-3.5" />
              Code Skeletons
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                activeTab === 'roadmap'
                  ? 'bg-slate-800 text-cyan-400 shadow-md border border-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              4-Week Kanban
            </button>
            <button
              onClick={() => setActiveTab('docker')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                activeTab === 'docker'
                  ? 'bg-slate-800 text-cyan-400 shadow-md border border-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Compose Topology
            </button>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="flex items-center gap-3 bg-slate-950/30 px-3 py-1 rounded-lg border border-slate-800/60 justify-between sm:justify-start">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Simulator Toggles</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnomalyMode(!anomalyMode)}
                className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-all border ${
                  anomalyMode 
                    ? 'bg-rose-950/60 text-rose-400 border-rose-500/50 hover:bg-rose-900/80' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                {anomalyMode ? '⚠️ Inject Latency Anomaly' : '✓ Standard Conditions'}
              </button>
              <button
                onClick={() => setSimulatedLoad(prev => prev === 100 ? 500 : prev === 500 ? 1000 : 100)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono px-2 py-1 rounded-md hover:text-cyan-400 hover:bg-slate-800 cursor-pointer"
              >
                Speed: {simulatedLoad} Hz
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* VIEW CONTAINER */}
        <div className="lg:col-span-8 flex flex-col min-h-[550px] bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 md:p-6 overflow-hidden">
          
          {/* TAB 1: PIPELINE INTERACTIVE MAP */}
          {activeTab === 'architecture' && (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  Real-Time Observability Data-Flow Pipeline Map
                </h2>
                <p className="text-xs text-slate-400">
                  Interactive network trace showing the stream topology. Click nodes to inspect environments, microservice ports, and configuration attributes.
                </p>
              </div>

              {/* FLOW CANVAS DIAGRAM */}
              <div className="relative bg-slate-950/80 rounded-xl p-6 border border-slate-800/50 flex-1 flex flex-col justify-center items-center overflow-x-auto min-h-[350px]">
                
                {/* Simulated Flow Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                  <div className={`absolute left-0 right-0 top-1/2 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-transparent ${anomalyMode ? 'animate-pulse' : ''}`} />
                  {/* Floating particles */}
                  <span className="absolute h-1.5 w-1.5 bg-cyan-400 rounded-full animate-[ping_1.5s_infinite] top-[34%] left-[18%]" />
                  <span className="absolute h-1.5 w-1.5 bg-purple-400 rounded-full animate-[ping_2s_infinite] top-[34%] left-[45%]" />
                  <span className="absolute h-1.5 w-1.5 bg-emerald-400 rounded-full animate-[ping_1.2s_infinite] top-[50%] left-[72%]" />
                </div>

                <div className="grid grid-cols-3 gap-y-12 gap-x-8 w-full max-w-3xl relative z-10">
                  
                  {/* Row 1: Generation & Validation */}
                  <div className="col-span-1 flex flex-col items-center">
                    <button 
                      onClick={() => setSelectedNode(ARCHITECTURE_NODES[0])}
                      className={`w-full group p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer text-left ${
                        selectedNode.id === 'generator'
                          ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-400/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg">
                          <Terminal className="w-4 h-4" />
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Service 1</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">Python Generator</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">Simulates live transactional activity metrics</span>
                    </button>
                    <div className="h-6 w-[2px] bg-slate-800 mt-2 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                    </div>
                  </div>

                  <div className="col-span-1" /> {/* Spacer */}

                  <div className="col-span-1 flex flex-col items-center">
                    <button 
                      onClick={() => setSelectedNode(ARCHITECTURE_NODES[2])}
                      className={`w-full group p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer text-left ${
                        selectedNode.id === 'kafka'
                          ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-400/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                          <Layers className="w-4 h-4" />
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Stream Broker</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">Apache Kafka</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">Durably logs ingest and validation errors</span>
                    </button>
                  </div>

                  {/* Connecting line Row 1 -> Row 2 */}
                  <div className="col-span-3 flex justify-between px-[16%] -my-4 relative h-4">
                    <div className="w-[2px] h-6 bg-slate-800" />
                    <div className="w-[2px] h-6 bg-slate-800" />
                  </div>

                  {/* Row 2: Validation Checkpoint & Stream Processor */}
                  <div className="col-span-1 flex flex-col items-center">
                    <button 
                      onClick={() => setSelectedNode(ARCHITECTURE_NODES[1])}
                      className={`w-full group p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer text-left ${
                        selectedNode.id === 'validation'
                          ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-400/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Quality</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">Great Expectations</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">Executes schema checks on streams</span>
                    </button>
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-600 font-mono text-[9px] uppercase tracking-wider">
                      <span>Stream Raw</span>
                      <ArrowRight className="w-3.5 h-3.5 animate-[translateX_1s_infinite]" />
                    </div>
                  </div>

                  <div className="col-span-1 flex flex-col items-center">
                    <button 
                      onClick={() => setSelectedNode(ARCHITECTURE_NODES[3])}
                      className={`w-full group p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer text-left ${
                        selectedNode.id === 'flink'
                          ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-400/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
                          <Cpu className="w-4 h-4" />
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Processor</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">Apache Flink</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">Aggregates and transforms streams</span>
                    </button>
                    <div className="h-6 w-[2px] bg-slate-800 mt-2" />
                  </div>

                  {/* Connecting line Row 2 -> Row 3 */}
                  <div className="col-span-3 flex justify-between px-[16%] -my-4 relative h-4">
                    <div className="w-[2px] h-6 bg-slate-800" />
                    <div className="w-[2px] h-6 bg-slate-800" />
                  </div>

                  {/* Row 3: Lakehouse Catalog & Gateway API */}
                  <div className="col-span-1 flex flex-col items-center">
                    <button 
                      onClick={() => setSelectedNode(ARCHITECTURE_NODES[5])}
                      className={`w-full group p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer text-left ${
                        selectedNode.id === 'minio'
                          ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-400/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="p-1.5 bg-pink-500/10 text-pink-500 rounded-lg">
                          <Database className="w-4 h-4" />
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Storage</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">MinIO S3</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">Stores parquet files and tables</span>
                    </button>
                  </div>

                  <div className="col-span-1 flex items-center justify-center flex-col text-slate-600">
                    <span className="text-[9px] font-mono uppercase">REST Catalog</span>
                    <div className="w-full flex items-center">
                      <div className="h-[2px] w-full bg-slate-850 relative" />
                    </div>
                  </div>

                  <div className="col-span-1 flex flex-col items-center">
                    <button 
                      onClick={() => setSelectedNode(ARCHITECTURE_NODES[4])}
                      className={`w-full group p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer text-left ${
                        selectedNode.id === 'iceberg'
                          ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-400/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
                          <Lock className="w-4 h-4" />
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Catalog</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">Apache Iceberg</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">Locks table transactions ACID</span>
                    </button>
                  </div>

                  {/* Connect Row 3 to Express Ingestion Gateway */}
                  <div className="col-span-3 flex justify-center py-2">
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                      <span>Query & Fetch</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  </div>

                  <div className="col-span-1" /> {/* Spacer */}
                  
                  <div className="col-span-1 flex flex-col items-center">
                    <button 
                      onClick={() => setSelectedNode(ARCHITECTURE_NODES[6])}
                      className={`w-full group p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer text-left ${
                        selectedNode.id === 'express'
                          ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-400/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                          <Server className="w-4 h-4" />
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Gateway API</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">Express Gateway</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">Brokers WebSockets & routes HTTP schemas</span>
                    </button>
                  </div>

                  <div className="col-span-1" /> {/* Spacer */}

                </div>
              </div>

              {/* Legend/Tip banner */}
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/10 rounded-xl flex items-start gap-2.5 text-xs text-cyan-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block">Architecture Tip:</span>
                  Each microservice is entirely self-contained. The data-generator evaluates its schema with GE before sending, Kafka provides reliable queueing, Flink ensures stateful aggregating, Iceberg guarantees database-like transactions on raw S3 buckets, and Express proxies those commits instantly to the UI.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REPOSITORY CODE EXPLORER */}
          {activeTab === 'repository' && (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  Production Microservice Configuration & Skeletons
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect the physical template files written directly into your workspace. Copy the initial environment parameters and clean configurations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                
                {/* File Tree Explorer (Left side) */}
                <div className="md:col-span-4 bg-slate-950/80 rounded-xl border border-slate-800/80 p-3 space-y-2 max-h-[400px] overflow-y-auto">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block px-1">WORKSPACE REPO FILE TREE</span>
                  <div className="space-y-1 font-mono text-xs">
                    
                    {/* Monorepo root files */}
                    <div className="text-slate-500 text-[10px] uppercase font-bold pt-1.5 px-1 border-b border-slate-900 pb-1">ROOT CONFIGS</div>
                    {REPOSITORY_FILES.filter(f => !f.path.includes('/services/')).map(file => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left p-1.5 rounded flex items-center gap-2 transition-all cursor-pointer ${
                          selectedFile.path === file.path
                            ? 'bg-slate-800/80 text-cyan-400'
                            : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}

                    {/* Microservices folders */}
                    <div className="text-slate-500 text-[10px] uppercase font-bold pt-3 px-1 border-b border-slate-900 pb-1">MICROSERVICES</div>
                    {REPOSITORY_FILES.filter(f => f.path.includes('/services/')).map(file => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left p-1.5 rounded flex items-center gap-2 transition-all cursor-pointer ${
                          selectedFile.path === file.path
                            ? 'bg-slate-800/80 text-cyan-400'
                            : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                        }`}
                      >
                        <Terminal className="w-3.5 h-3.5 text-purple-400/80 shrink-0" />
                        <span className="truncate text-[11px]" title={file.path}>{file.name}</span>
                      </button>
                    ))}

                  </div>
                </div>

                {/* File Code Viewer (Right side) */}
                <div className="md:col-span-8 flex flex-col bg-slate-950/50 rounded-xl border border-slate-800/80 overflow-hidden max-h-[400px]">
                  
                  {/* Code Header */}
                  <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-300 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      {selectedFile.path}
                    </span>
                    <button
                      onClick={() => handleCopyCode(selectedFile.name, selectedFile.content)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedFile === selectedFile.name ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code Body */}
                  <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed bg-slate-950 text-slate-300 select-all max-h-[350px]">
                    <pre className="whitespace-pre">{selectedFile.content}</pre>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: 4-WEEK INTERNSHIP KANBAN ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  IceStream 4-Week Internship Implementation Kanban
                </h2>
                <p className="text-xs text-slate-400">
                  A professional breakdown of 40-50 granular, 30-90 minute tasks mapped for a team of 4 interns to deliver IceStream from scratch inside 4 weeks.
                </p>
              </div>

              {/* Interactive roadmap filters */}
              <div className="flex flex-wrap gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-xs">
                
                {/* Week Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Filter Week:</span>
                  <div className="flex bg-slate-900 border border-slate-800 rounded-md overflow-hidden">
                    {['all', 1, 2, 3, 4].map(w => (
                      <button
                        key={w}
                        onClick={() => setRoadmapWeek(w as any)}
                        className={`px-2.5 py-1 text-[11px] font-medium border-r border-slate-800 last:border-0 cursor-pointer ${
                          roadmapWeek === w ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {w === 'all' ? 'All' : `W${w}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Member Filter */}
                <div className="flex items-center gap-2 ml-0 sm:ml-4">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Assignee:</span>
                  <div className="flex bg-slate-900 border border-slate-800 rounded-md overflow-hidden">
                    {['all', 1, 2, 3, 4].map(m => (
                      <button
                        key={m}
                        onClick={() => setRoadmapMember(m as any)}
                        className={`px-2.5 py-1 text-[11px] font-medium border-r border-slate-800 last:border-0 cursor-pointer ${
                          roadmapMember === m ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m === 'all' ? 'All' : `Intern ${m}`}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Task Cards Grid */}
              <div className="bg-slate-950/40 rounded-xl border border-slate-800/50 p-4 flex-1 overflow-y-auto max-h-[350px] space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No active tasks match current filter selection. Adjust assignee or week markers.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="bg-slate-900 border border-slate-800/85 p-3.5 rounded-xl space-y-2 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all duration-200"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wide bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded">
                              {task.id}
                            </span>
                            <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                              Week {task.week}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">{task.name}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{task.objective}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-950 flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span>Intern {task.assignedTo}</span>
                          </div>
                          <span className="font-mono text-slate-400">{task.estimatedTime} mins</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DOCKER COMPOSE TOPOLOGY */}
          {activeTab === 'docker' && (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Local Docker Compose Orchestration Topology
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect cluster containers, overlay networks, and persistent storage bounds designed to simulate real-world conditions.
                </p>
              </div>

              <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 flex-1 overflow-y-auto max-h-[350px] space-y-4">
                
                {/* Docker network diagram */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
                  
                  {/* Container 1 */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-bold">KAFKA</span>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      </div>
                      <span className="font-bold text-slate-200 mt-1 block">icestream-kafka</span>
                      <span className="text-[10px] text-slate-500 block">cp-kafka:7.4.0</span>
                    </div>
                    <div className="border-t border-slate-950 pt-2 text-[10px] text-slate-400 space-y-1">
                      <div>Host: <span className="text-cyan-400">29092</span></div>
                      <div>Internal: <span className="text-slate-400">9092</span></div>
                    </div>
                  </div>

                  {/* Container 2 */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-bold">FLINK UI</span>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      </div>
                      <span className="font-bold text-slate-200 mt-1 block">flink-jobmanager</span>
                      <span className="text-[10px] text-slate-500 block">flink:1.17.1-java11</span>
                    </div>
                    <div className="border-t border-slate-950 pt-2 text-[10px] text-slate-400 space-y-1">
                      <div>Host: <span className="text-cyan-400">8081</span></div>
                      <div>Web Console: <span className="text-slate-400">Available</span></div>
                    </div>
                  </div>

                  {/* Container 3 */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-bold">MINIO</span>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      </div>
                      <span className="font-bold text-slate-200 mt-1 block">icestream-minio</span>
                      <span className="text-[10px] text-slate-500 block">minio:RELEASE</span>
                    </div>
                    <div className="border-t border-slate-950 pt-2 text-[10px] text-slate-400 space-y-1">
                      <div>API: <span className="text-cyan-400">9000</span></div>
                      <div>Console: <span className="text-slate-400">9001</span></div>
                    </div>
                  </div>

                  {/* Container 4 */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded font-bold">CATALOG</span>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      </div>
                      <span className="font-bold text-slate-200 mt-1 block">iceberg-catalog</span>
                      <span className="text-[10px] text-slate-500 block">iceberg-rest:0.6.0</span>
                    </div>
                    <div className="border-t border-slate-950 pt-2 text-[10px] text-slate-400 space-y-1">
                      <div>Host: <span className="text-cyan-400">8181</span></div>
                      <div>Protocol: <span className="text-slate-400">REST API</span></div>
                    </div>
                  </div>

                </div>

                {/* Sub-networks block */}
                <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono block">SHARED OVERLAY DATA VOLUMES</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/60 flex justify-between">
                      <span>zookeeper_data:</span>
                      <span className="text-slate-400">Active Mount</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/60 flex justify-between">
                      <span>kafka_data:</span>
                      <span className="text-slate-400">Active Mount</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/60 flex justify-between">
                      <span>flink_shared:</span>
                      <span className="text-slate-400">Shared Fat JARs</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/60 flex justify-between">
                      <span>minio_data:</span>
                      <span className="text-slate-400">Lakehouse Parquet Block</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* SIDEBAR: ACTIVE SYSTEM COMPONENT ANALYSIS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* SECTOR FOCUS PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-widest uppercase block">Selected Sector Details</span>
              <h3 className="text-lg font-extrabold text-white mt-0.5">{selectedNode.label}</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 block font-mono text-[9px] uppercase">Technology Stack</span>
                <span className="text-slate-200 font-semibold bg-slate-950 px-2.5 py-1 rounded border border-slate-800/80 block">
                  {selectedNode.technology}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 block font-mono text-[9px] uppercase">Architectural Role</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">{selectedNode.description}</p>
              </div>

              {selectedNode.ports && selectedNode.ports.length > 0 && (
                <div className="space-y-1">
                  <span className="text-slate-500 block font-mono text-[9px] uppercase">Port Configuration</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.ports.map(port => (
                      <span key={port} className="bg-slate-950 text-cyan-400/90 border border-slate-850 px-2 py-0.5 rounded font-mono text-[10px]">
                        {port}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.envVars && selectedNode.envVars.length > 0 && (
                <div className="space-y-1">
                  <span className="text-slate-500 block font-mono text-[9px] uppercase">Primary Environmental Variables</span>
                  <div className="space-y-1 font-mono text-[10px]">
                    {selectedNode.envVars.map(ev => (
                      <div key={ev} className="bg-slate-950 p-1.5 rounded border border-slate-850/80 text-slate-400 flex justify-between items-center select-all">
                        <span>{ev}</span>
                        <span className="text-[8px] text-slate-600">env</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QUICK LINKS / ROADMAP PROGRESS SUMMARY */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl text-xs">
            <h4 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-400" />
              Intern Team Role Definitions
            </h4>
            
            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-850 hover:border-slate-800 transition-all">
                <div className="flex justify-between font-mono text-[10px] text-slate-400 font-bold">
                  <span>INTERN 1</span>
                  <span className="text-cyan-400">Lead Gateway API</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Responsible for Node.js Express setups, tsconfigs, WebSocket servers, and Recharts endpoints.</p>
              </div>

              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-850 hover:border-slate-800 transition-all">
                <div className="flex justify-between font-mono text-[10px] text-slate-400 font-bold">
                  <span>INTERN 2</span>
                  <span className="text-purple-400">Lead Devops & UI</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Responsible for Docker orchestrations, MinIO setups, GitHub workflows, and React canvas flows.</p>
              </div>

              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-850 hover:border-slate-800 transition-all">
                <div className="flex justify-between font-mono text-[10px] text-slate-400 font-bold">
                  <span>INTERN 3</span>
                  <span className="text-yellow-500">Data & Quality</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Responsible for Python simulators, data generator anomalies, and Great Expectations suites.</p>
              </div>

              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-850 hover:border-slate-800 transition-all">
                <div className="flex justify-between font-mono text-[10px] text-slate-400 font-bold">
                  <span>INTERN 4</span>
                  <span className="text-sky-400">Stream Processing</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Responsible for Flink Java configurations, pom.xml catalogs, and exactly-once Iceberg sinks.</p>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 px-6 text-xs text-center text-slate-500 mt-12 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>Axlero Solutions Internship Project Template © 2026</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Server Live (Port 3000)</span>
            <span>Security: Local Sandbox Layer</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
