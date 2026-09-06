'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

function sceneSignature(elements: readonly unknown[]): string {
  return elements.map((element) => {
    if (!element || typeof element !== 'object') return '';
    const item = element as { id?: unknown; version?: unknown; isDeleted?: unknown };
    return `${String(item.id ?? '')}:${String(item.version ?? '')}:${String(item.isDeleted ?? false)}`;
  }).join('|');
}

export function ExcalidrawBoard({
  elements,
  disabled,
  onChange,
}: {
  elements: readonly unknown[];
  disabled: boolean;
  onChange: (elements: readonly unknown[]) => void;
}) {
  // Excalidraw emits onChange while it initializes. Keeping the initial scene,
  // toolbar options, and callback identity stable prevents that initialization
  // notification from bouncing state between the board and parent forever.
  const [initialData] = useState(() => ({ elements: elements as never[] }));
  const uiOptions = useMemo<NonNullable<ComponentProps<typeof Excalidraw>['UIOptions']>>(() => ({
    canvasActions: { changeViewBackgroundColor: true, clearCanvas: true, export: false, loadScene: false, saveToActiveFile: false },
  }), []);
  const latestOnChange = useRef(onChange);
  const lastScene = useRef(sceneSignature(elements));
  useEffect(() => { latestOnChange.current = onChange; }, [onChange]);
  const handleChange = useCallback((nextElements: readonly unknown[]) => {
    const signature = sceneSignature(nextElements);
    if (signature === lastScene.current) return;
    lastScene.current = signature;
    latestOnChange.current(nextElements);
  }, []);
  return (
    <div className="h-full min-h-[24rem] bg-[#f8fafc]">
      <Excalidraw
        initialData={initialData}
        viewModeEnabled={disabled}
        onChange={(nextElements) => handleChange(nextElements as unknown[])}
        UIOptions={uiOptions}
      />
    </div>
  );
}
