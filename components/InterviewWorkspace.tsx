'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type Modality = 'voice' | 'code' | 'canvas' | 'scenario';
type ArtifactResponse = { artifact: { version: number; content: Record<string, unknown> } | null };

const STARTER_CODE = `// Export or define a function named solution.
function solution(input) {
  return input;
}`;

const STARTER_NODES: Node[] = [
  { id: 'client', position: { x: 40, y: 100 }, data: { label: 'Client' }, type: 'input' },
  { id: 'service', position: { x: 280, y: 100 }, data: { label: 'Service' } },
];
const STARTER_EDGES: Edge[] = [{ id: 'client-service', source: 'client', target: 'service' }];

export function InterviewWorkspace({ sessionId, activeModality }: { sessionId: string; activeModality: Modality }) {
  const [tab, setTab] = useState<'code' | 'canvas'>(activeModality === 'code' ? 'code' : 'canvas');
  const [code, setCode] = useState(STARTER_CODE);
  const [nodes, setNodes] = useState<Node[]>(STARTER_NODES);
  const [edges, setEdges] = useState<Edge[]>(STARTER_EDGES);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [versions, setVersions] = useState({ code: 0, canvas: 0 });
  const [codeCheckpoint, setCodeCheckpoint] = useState(STARTER_CODE);
  const [canvasCheckpoint, setCanvasCheckpoint] = useState({ nodes: STARTER_NODES, edges: STARTER_EDGES });
  const [status, setStatus] = useState('Autosave ready');
  const [testOutput, setTestOutput] = useState('');
  const loaded = useRef(false);
  const dirty = useRef({ code: false, canvas: false });

  useEffect(() => {
    if (activeModality === 'code') setTab('code');
    if (activeModality === 'canvas' || activeModality === 'scenario') setTab('canvas');
  }, [activeModality]);

  useEffect(() => {
    Promise.all(['code', 'canvas'].map(async (type) => {
      const response = await fetch(`/api/sessions/${sessionId}/artifacts/${type}`);
      return { type, data: response.ok ? (await response.json()) as ArtifactResponse : null };
    })).then((results) => {
      for (const { type, data } of results) {
        const artifact = data?.artifact;
        if (!artifact) continue;
        setVersions((current) => ({ ...current, [type]: artifact.version }));
        if (type === 'code') {
          const source = typeof artifact.content.source === 'string' ? artifact.content.source : STARTER_CODE;
          setCode(source);
          const checkpoint = artifact.content.checkpoint as { source?: unknown } | undefined;
          if (typeof checkpoint?.source === 'string') setCodeCheckpoint(checkpoint.source);
        } else {
          if (Array.isArray(artifact.content.nodes)) setNodes(artifact.content.nodes as Node[]);
          if (Array.isArray(artifact.content.edges)) setEdges(artifact.content.edges as Edge[]);
          if (Array.isArray(artifact.content.constraints)) setConstraints(artifact.content.constraints.filter((item): item is string => typeof item === 'string'));
          const checkpoint = artifact.content.checkpoint as { nodes?: unknown; edges?: unknown } | undefined;
          if (Array.isArray(checkpoint?.nodes) && Array.isArray(checkpoint?.edges)) setCanvasCheckpoint({ nodes: checkpoint.nodes as Node[], edges: checkpoint.edges as Edge[] });
        }
      }
      loaded.current = true;
    }).catch(() => setStatus('Could not load saved workspace'));
  }, [sessionId]);

  const save = useCallback(async (type: 'code' | 'canvas', checkpoint: boolean) => {
    const content = type === 'code'
      ? {
          language: 'typescript',
          source: code,
          checkpoint: { language: 'typescript', source: checkpoint ? code : codeCheckpoint, at: new Date().toISOString() },
        }
      : {
          nodes,
          edges,
          constraints,
          checkpoint: { ...(checkpoint ? { nodes, edges } : canvasCheckpoint), at: new Date().toISOString() },
        };
    setStatus(checkpoint ? 'Saving checkpoint…' : 'Autosaving…');
    const response = await fetch(`/api/sessions/${sessionId}/artifacts/${type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedVersion: versions[type], content }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(response.status === 409 ? 'A newer workspace version exists; reload before editing.' : (data.error ?? 'Save failed'));
      return;
    }
    setVersions((current) => ({ ...current, [type]: data.artifact.version }));
    if (checkpoint && type === 'code') setCodeCheckpoint(code);
    if (checkpoint && type === 'canvas') setCanvasCheckpoint({ nodes, edges });
    dirty.current[type] = false;
    setStatus(checkpoint ? `Checkpoint ${data.artifact.version} shared with the AI panel` : `Autosaved version ${data.artifact.version}`);
  }, [canvasCheckpoint, code, codeCheckpoint, constraints, edges, nodes, sessionId, versions]);

  useEffect(() => {
    if (!loaded.current || (!dirty.current.code && !dirty.current.canvas)) return;
    const timeout = window.setTimeout(() => {
      if (dirty.current.code) void save('code', false);
      if (dirty.current.canvas) void save('canvas', false);
    }, 1_500);
    return () => window.clearTimeout(timeout);
  }, [code, edges, nodes, save]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    dirty.current.canvas = true;
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    dirty.current.canvas = true;
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);
  const onConnect = useCallback((connection: Connection) => {
    dirty.current.canvas = true;
    setEdges((current) => addEdge(connection, current));
  }, []);

  const runTests = async () => {
    await save('code', true);
    setTestOutput('Running isolated tests…');
    const response = await fetch(`/api/sessions/${sessionId}/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'run_code_tests', arguments: {} }),
    });
    const data = await response.json();
    setTestOutput(JSON.stringify(data.output ?? data.error, null, 2));
  };

  return (
    <div className="flex h-full min-h-[28rem] w-full flex-col overflow-hidden bg-transparent">
      {/* Workspace Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 bg-surface/50 px-5 py-3 backdrop-blur-md">
        <div className="flex gap-2 p-1 rounded-lg bg-background/50 ring-1 ring-border/50">
          <button onClick={() => setTab('code')} className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${tab === 'code' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]' : 'text-muted-foreground hover:bg-surface/50 hover:text-foreground'}`}>Code Editor</button>
          <button onClick={() => setTab('canvas')} className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${tab === 'canvas' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]' : 'text-muted-foreground hover:bg-surface/50 hover:text-foreground'}`}>System Design</button>
        </div>
        <div className="flex gap-3 items-center">
          {tab === 'code' && <button onClick={runTests} className="rounded-md border border-border/50 bg-surface/50 px-4 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-surface hover:ring-1 hover:ring-border">Run Tests</button>}
          <button onClick={() => void save(tab, true)} className="rounded-md bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground shadow-[0_0_15px_hsl(var(--accent)/0.2)] transition-all hover:bg-accent/90">Share Checkpoint</button>
        </div>
      </div>

      {/* Constraint Banner */}
      {constraints.length > 0 && (
        <div className="flex shrink-0 animate-fade-up items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-xs font-semibold text-amber-500 backdrop-blur-md">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px]">!</span>
          New constraint injected: {constraints.at(-1)}
        </div>
      )}

      {/* Editor Content */}
      <div className="min-h-0 flex-1 relative bg-card/40 backdrop-blur-sm">
        {tab === 'code' ? (
          <Editor
            height="100%"
            language="typescript"
            theme="vs-dark"
            value={code}
            onChange={(value) => { dirty.current.code = true; setCode(value ?? ''); }}
            options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, padding: { top: 16 } }}
            className="absolute inset-0"
          />
        ) : (
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView className="absolute inset-0">
            <Background color="hsl(var(--border))" gap={16} />
            <Controls className="bg-surface/80 fill-foreground ring-1 ring-border/50 backdrop-blur-md" />
          </ReactFlow>
        )}
      </div>

      {/* Workspace Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-border/40 bg-surface/50 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-md">
        <span>{status}</span>
        {activeModality === 'scenario' && <span className="text-primary">Scenario Active</span>}
      </div>

      {/* Test Output Overlay */}
      {testOutput && (
        <div className="max-h-40 overflow-auto border-t border-primary/20 bg-black/90 p-4 font-mono text-xs leading-relaxed text-green-400 shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <pre>{testOutput}</pre>
        </div>
      )}
    </div>
  );
}
