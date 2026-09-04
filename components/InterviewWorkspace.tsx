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
    <div className="flex h-full min-h-[28rem] w-full flex-col overflow-hidden rounded-lg border border-border/80 bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-2">
          <button onClick={() => setTab('code')} className={`rounded px-3 py-1 text-xs ${tab === 'code' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Code</button>
          <button onClick={() => setTab('canvas')} className={`rounded px-3 py-1 text-xs ${tab === 'canvas' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>System design</button>
        </div>
        <div className="flex gap-2">
          {tab === 'code' && <button onClick={runTests} className="rounded border border-border px-3 py-1 text-xs">Run tests</button>}
          <button onClick={() => void save(tab, true)} className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Checkpoint for AI</button>
        </div>
      </div>
      {constraints.length > 0 && <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">New constraint: {constraints.at(-1)}</div>}
      <div className="min-h-0 flex-1">
        {tab === 'code' ? (
          <Editor
            height="100%"
            language="typescript"
            theme="vs-dark"
            value={code}
            onChange={(value) => { dirty.current.code = true; setCode(value ?? ''); }}
            options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
          />
        ) : (
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        )}
      </div>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{status}</div>
      {testOutput && <pre className="max-h-28 overflow-auto border-t border-border bg-black p-2 text-xs text-green-300">{testOutput}</pre>}
    </div>
  );
}
