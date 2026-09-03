import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

export function CodeWorkspace() {
  const [code, setCode] = useState('// Implement your LRU Cache here\n\nclass LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.cache = new Map();\n  }\n\n  get(key) {\n    \n  }\n\n  put(key, value) {\n    \n  }\n}');

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-muted/30 px-4 py-2">
        <h2 className="text-sm font-medium text-foreground">Code Workspace</h2>
        <div className="flex gap-2">
          <button className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            Run Code
          </button>
        </div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
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
