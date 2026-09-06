'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Editor from '@monaco-editor/react';

const ExcalidrawBoard = dynamic(() => import('./ExcalidrawBoard').then((module) => module.ExcalidrawBoard), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[24rem] place-items-center bg-slate-50 text-sm text-slate-600">Loading canvas…</div>,
});

type Modality = 'voice' | 'code' | 'canvas' | 'scenario';
type ArtifactResponse = { artifact: { version: number; content: Record<string, unknown> } | null };
type CodeLanguage = 'python' | 'javascript' | 'typescript';

const STARTER_CODE = `// Export or define a function named solution.
function solution(input) {
  return input;
}`;

export function InterviewWorkspace({ sessionId, activeModality }: { sessionId: string; activeModality: Modality }) {
  const [tab, setTab] = useState<'code' | 'canvas'>(activeModality === 'code' ? 'code' : 'canvas');
  const [code, setCode] = useState(STARTER_CODE);
  const [language, setLanguage] = useState<CodeLanguage>('javascript');
  const languageDrafts = useRef<Partial<Record<CodeLanguage, string>>>({});
  const [freehandElements, setFreehandElements] = useState<unknown[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [versions, setVersions] = useState({ code: 0, canvas: 0 });
  const checkpoints = useRef<Record<'code' | 'canvas', unknown>>({ code: null, canvas: null });
  const [status, setStatus] = useState('Autosave ready');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const revisions = useRef({ code: 0, canvas: 0 });
  const loaded = useRef(false);
  const dirty = useRef({ code: false, canvas: false });

  useEffect(() => {
    if (activeModality === 'code') setTab('code');
    if (activeModality === 'canvas' || activeModality === 'scenario') setTab('canvas');
  }, [activeModality]);

  useEffect(() => {
    Promise.all(['code', 'canvas'].map(async (type) => {
      const response = await fetch(`/api/sessions/${sessionId}/artifacts/${type}`);
      if (!response.ok) throw new Error('Workspace load failed');
      return { type, data: (await response.json()) as ArtifactResponse };
    })).then((results) => {
      for (const { type, data } of results) {
        const artifact = data?.artifact;
        if (!artifact) continue;
        setVersions((current) => ({ ...current, [type]: artifact.version }));
        if (type === 'code') {
          const source = typeof artifact.content.source === 'string' ? artifact.content.source : STARTER_CODE;
          setCode(source);
          if (['python', 'javascript', 'typescript'].includes(String(artifact.content.language))) setLanguage(artifact.content.language as CodeLanguage);
          const checkpoint = artifact.content.checkpoint as { source?: unknown } | undefined;
          if (typeof checkpoint?.source === 'string') checkpoints.current.code = checkpoint;
        } else {
          if (Array.isArray(artifact.content.constraints)) setConstraints(artifact.content.constraints.filter((item): item is string => typeof item === 'string'));
          const freehand = artifact.content.freehand as { elements?: unknown } | undefined;
          if (Array.isArray(freehand?.elements)) setFreehandElements(freehand.elements);
          const checkpoint = artifact.content.checkpoint as { freehand?: unknown } | undefined;
          if (checkpoint?.freehand && typeof checkpoint.freehand === 'object') checkpoints.current.canvas = checkpoint;
        }
      }
      loaded.current = true;
      setReady(true);
    }).catch(() => setStatus('Could not load saved workspace'));
  }, [sessionId]);

  const save = useCallback(async (type: 'code' | 'canvas', checkpoint: boolean) => {
    if (!loaded.current || saving.current) return false;
    saving.current = true;
    setBusy(true);
    const revision = revisions.current[type];
    try {
      const content = type === 'code'
        ? { language, source: code, checkpoint: checkpoint ? { language, source: code, at: new Date().toISOString() } : checkpoints.current.code }
        : { freehand: { elements: freehandElements, at: new Date().toISOString() }, constraints, checkpoint: checkpoint ? { freehand: { elements: freehandElements }, at: new Date().toISOString() } : checkpoints.current.canvas };
      setStatus(checkpoint ? 'Saving checkpoint…' : 'Autosaving…');
      const response = await fetch(`/api/sessions/${sessionId}/artifacts/${type}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: versions[type], content, checkpoint }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(response.status === 409 ? 'A newer workspace version exists; reload before editing.' : (data.error ?? 'Save failed'));
        return false;
      }
      setVersions((current) => ({ ...current, [type]: data.artifact.version }));
      if (checkpoint) checkpoints.current[type] = content.checkpoint;
      if (revisions.current[type] === revision) dirty.current[type] = false;
      setStatus(checkpoint ? `Checkpoint ${data.artifact.version} shared with the AI panel` : `Autosaved version ${data.artifact.version}`);
      return true;
    } catch {
      setStatus('Save failed. Your draft is kept here; try sharing again.');
      return false;
    } finally { saving.current = false; setBusy(false); }
  }, [code, constraints, freehandElements, language, sessionId, versions]);

  useEffect(() => {
    if (!loaded.current || (!dirty.current.code && !dirty.current.canvas)) return;
    const timeout = window.setTimeout(() => {
      if (dirty.current.code) void save('code', false);
      if (dirty.current.canvas) void save('canvas', false);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [busy, code, freehandElements, ready, save]);

  const onFreehandChange = useCallback((next: readonly unknown[]) => {
    revisions.current.canvas++;
    dirty.current.canvas = true;
    setFreehandElements([...next]);
  }, []);

  return (
    <div className="flex h-full min-h-[28rem] w-full flex-col overflow-hidden rounded-lg border border-border/80 bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-2">
          <button onClick={() => setTab('code')} className={`rounded px-3 py-1 text-xs ${tab === 'code' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Code</button>
          <button onClick={() => setTab('canvas')} className={`rounded px-3 py-1 text-xs ${tab === 'canvas' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Canvas</button>
        </div>
        <div className="flex gap-2">
          {tab === 'code' && <select aria-label="Coding language" disabled={!ready || busy} value={language} className="rounded border border-border bg-background px-2 text-xs" onChange={(event) => {
            const next = event.target.value as CodeLanguage;
            languageDrafts.current[language] = code;
            setCode(languageDrafts.current[next] ?? (next === 'python' ? 'def solution(values):\n    return values\n' : next === 'typescript' ? 'function solution(values: number[]): number {\n  return 0;\n}' : STARTER_CODE));
            setLanguage(next); dirty.current.code = true; revisions.current.code++;
          }}><option value="python">Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option></select>}
          <button disabled={!ready || busy} onClick={() => void save(tab, true)} className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50">Share checkpoint</button>
        </div>
      </div>
      {constraints.length > 0 && <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">New constraint: {constraints.at(-1)}</div>}
      {tab === 'canvas' && <div className="border-b border-border bg-slate-50 px-3 py-2 text-xs text-slate-700">Draw with shapes, text, and arrows. For this task, label Client, API Server, and Database, then connect them with arrows. Say “check now” when you want a review.</div>}
      <div className="min-h-[24rem] flex-1">
        {tab === 'code' ? <Editor height="100%" language={language} theme="vs-dark" value={code} onChange={(value) => { dirty.current.code = true; revisions.current.code++; setCode(value ?? ''); }} options={{ readOnly: !ready, automaticLayout: true, minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }} /> : <ExcalidrawBoard elements={freehandElements} disabled={!ready} onChange={onFreehandChange} />}
      </div>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{status}</div>
    </div>
  );
}
