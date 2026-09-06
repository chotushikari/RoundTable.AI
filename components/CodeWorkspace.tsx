'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

export type CodeWorkspaceTask = {
  id: string;
  title: string;
  language: string;
  starterCode: string;
  kind: string;
};

const FALLBACK_STARTER =
  '// The interviewer will bring up a problem here.\n// Start whenever you are ready.\n';

/**
 * The Monaco workspace. When the control plane opens a code turn it passes a
 * `task` (title + starter stub + language); the editor loads that stub. Each
 * distinct task id resets the buffer once — later edits by the candidate are
 * preserved. `onSubmit` hands the current buffer back up (Sprint 07 wires this
 * to the agent over RTM so the LLM can read the code).
 */
export function CodeWorkspace({
  task,
  onSubmit,
}: {
  task?: CodeWorkspaceTask | null;
  onSubmit?: (code: string) => void;
}) {
  const [code, setCode] = useState<string>(task?.starterCode ?? FALLBACK_STARTER);
  const [submitted, setSubmitted] = useState(false);
  const loadedTaskId = useRef<string | null>(task?.id ?? null);

  // Load a new stub exactly once when the task id changes (don't clobber edits).
  useEffect(() => {
    if (task && task.id !== loadedTaskId.current) {
      setCode(task.starterCode);
      loadedTaskId.current = task.id;
      setSubmitted(false);
    }
  }, [task]);

  const handleSubmit = () => {
    onSubmit?.(code);
    setSubmitted(true);
    // brief acknowledgement, then allow resubmits
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-muted/30 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-role-technical" />
          <h2 className="truncate text-sm font-medium text-foreground">
            {task?.title ?? 'Code Workspace'}
          </h2>
          {task?.kind === 'debug' && (
            <span className="rounded-full border border-role-customer/30 bg-role-customer/10 px-2 py-0.5 text-[11px] font-medium text-role-customer">
              Fix the bug
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {submitted ? 'Shared ✓' : 'Share with interviewer'}
          </button>
        </div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={task?.language ?? 'javascript'}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 24,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
          }}
        />
      </div>
    </div>
  );
}
