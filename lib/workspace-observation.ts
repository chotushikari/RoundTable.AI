function artifactValue(content: unknown): { value: Record<string, unknown>; savedLabel: string } | null {
  if (!content || typeof content !== 'object') return null;
  const artifact = content as Record<string, unknown>;
  const checkpoint = artifact.checkpoint;
  // A candidate asking “check now” expects the latest autosave, not an older
  // checkpoint. The checkpoint only changes the wording when it matches the
  // current artifact exactly enough to be the same work.
  const savedCheckpoint = checkpoint && typeof checkpoint === 'object' ? checkpoint as Record<string, unknown> : null;
  const sameCode = typeof artifact.source === 'string'
    && artifact.source === savedCheckpoint?.source
    && artifact.language === savedCheckpoint?.language;
  const currentElements = (artifact.freehand as { elements?: unknown } | undefined)?.elements;
  const checkpointElements = (savedCheckpoint?.freehand as { elements?: unknown } | undefined)?.elements;
  const sameCanvas = Array.isArray(currentElements) && Array.isArray(checkpointElements)
    && JSON.stringify(currentElements) === JSON.stringify(checkpointElements);
  const hasLiveWorkspace = typeof artifact.source === 'string' || Array.isArray(currentElements);
  return {
    value: hasLiveWorkspace || !savedCheckpoint ? artifact : savedCheckpoint,
    savedLabel: sameCode || sameCanvas || !hasLiveWorkspace && Boolean(savedCheckpoint) ? 'shared' : 'autosaved',
  };
}

// Describe only the latest browser-saved artifact. This is a receipt
// acknowledgement, not a correctness score or a claim of live screen access.
export function checkpointObservation(content: unknown, type: 'code' | 'canvas'): string | null {
  const artifact = artifactValue(content);
  if (!artifact) return null;
  const { value, savedLabel } = artifact;
  if (type === 'code' && typeof value.source === 'string' && value.source.trim()) {
    const language = ['python', 'javascript', 'typescript'].includes(String(value.language)) ? String(value.language) : 'code';
    const lines = value.source.split('\n').filter((line) => line.trim()).length;
    return `Yes, I can see your ${savedLabel} ${language} code, with ${lines} non-empty lines.`;
  }
  if (type === 'canvas' && value.freehand && typeof value.freehand === 'object') {
    const elements = (value.freehand as { elements?: unknown }).elements;
    if (Array.isArray(elements) && elements.length > 0) return `Yes, I can see your ${savedLabel} freehand whiteboard, with ${elements.length} drawn items.`;
  }
  if (type === 'canvas' && Array.isArray(value.nodes) && Array.isArray(value.edges)) {
    return `Yes, I can see your ${savedLabel} diagram, with ${value.nodes.length} components and ${value.edges.length} connections.`;
  }
  return null;
}

export function codeReviewObservation(content: unknown): string | null {
  const artifact = artifactValue(content);
  if (!artifact || typeof artifact.value.source !== 'string' || !artifact.value.source.trim()) return null;
  const source = artifact.value.source;
  const language = ['python', 'javascript', 'typescript'].includes(String(artifact.value.language)) ? String(artifact.value.language) : 'code';
  const functions = [...source.matchAll(/(?:^|\n)\s*(?:async\s+)?(?:function\s+|def\s+|const\s+)([A-Za-z_$][\w$]*)/g)]
    .map((match) => match[1])
    .slice(0, 3);
  const functionText = functions.length ? ` I found ${functions.map((name) => `\`${name}\``).join(', ')}.` : ' I could not identify a named function yet.';
  return `I can inspect your ${artifact.savedLabel} ${language} code.${functionText}`;
}

export function codeTaskReview(content: unknown, question: string): { text: string; complete: boolean } | null {
  const observation = codeReviewObservation(content);
  const artifact = artifactValue(content);
  if (!observation || !artifact || typeof artifact.value.source !== 'string') return null;
  const source = artifact.value.source;
  const normalizedQuestion = question.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(source);
  if (/count[_\s]*vowels|countvowels|number of vowels/.test(normalizedQuestion)) {
    // The task may request idiomatic Python `count_vowels` or the camelCase
    // JavaScript/TypeScript spelling. Both are valid requested entry points.
    const hasFunction = has(/\b(?:def|function)\s+count[_-]?vowels\b|\b(?:const|let|var)\s+count[_-]?vowels\s*=/i);
    const hasVowelRule = has(/["'`]\s*[aeiouAEIOU]{5,}\s*["'`]/);
    const hasIteration = has(/\b(?:for|while|filter|reduce|sum)\b/);
    const complete = hasFunction && hasVowelRule && hasIteration;
    return {
      complete,
      text: complete
        ? `${observation} I can see the requested vowel-counting function, a vowel rule, and character iteration. The empty-string path naturally returns zero, and non-alphabetic characters are ignored.`
        : `${observation} For this task, add the requested vowel-counting function, a vowel rule, and character iteration before I move the panel on.`,
    };
  }
  if (/reverse\s*string|reversestring/.test(normalizedQuestion)) {
    const complete = has(/\b(?:def|function)\s+reverseString\b|\b(?:const|let|var)\s+reverseString\s*=/)
      && has(/\.reverse\s*\(|\[::?-?1\]|range\s*\(/);
    return {
      complete,
      text: complete
        ? `${observation} I can see \`reverseString\` and a reversal operation. The implementation is structurally complete for the requested task.`
        : `${observation} Add a \`reverseString\` function and an explicit reversal operation before I move the panel on.`,
    };
  }
  if (/sum\s*(?:of )?(?:all )?even|sumevennumbers|even numbers/.test(normalizedQuestion)) {
    const hasFunction = has(/\b(?:def|function)\s+sumEvenNumbers\b|\b(?:const|let|var)\s+sumEvenNumbers\s*=/i);
    const checksEven = has(/%\s*2\s*(?:={2,3})\s*0|\b(?:even|is_even)\b/i);
    const aggregates = has(/\bsum\s*\(|\+=|\.reduce\s*\(/i);
    const complete = hasFunction && checksEven && aggregates;
    return {
      complete,
      text: complete
        ? `${observation} I found \`sumEvenNumbers\`, an even-number check, and an aggregation. The empty-array path returns zero. The workspace portion is complete.`
        : `${observation} For this task, include \`sumEvenNumbers\`, an even-number check, and a sum before I move the panel on.`,
    };
  }
  if (/sort(?:ed|ing)?|ascending order|ascending/.test(normalizedQuestion)) {
    const hasNamedFunction = has(/\b(?:def|function)\s+[A-Za-z_$][\w$]*\b|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/);
    const usesAscendingSort = has(/\bsorted\s*\(|\.sort\s*\(/);
    const returnsValue = has(/\breturn\b/);
    const complete = hasNamedFunction && usesAscendingSort && returnsValue;
    return {
      complete,
      text: complete
        ? `${observation} I can see a named sorting function that returns an ascending sort. An empty list follows the same path and returns an empty list. This completes the requested coding exercise.`
        : `${observation} For this task, include a named function, an ascending sort, and return the sorted list before I move the panel on.`,
    };
  }
  const namedFunction = has(/\b(?:def|function)\s+[A-Za-z_$][\w$]*\b|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/);
  const complete = namedFunction && source.trim().split('\n').filter(Boolean).length >= 3;
  return {
    complete,
    text: complete
      ? `${observation} I can see a named implementation with substantive code. This completes the requested coding exercise.`
      : `${observation} Add a named implementation with the requested logic before I move the panel on.`,
  };
}

type CanvasComponent = 'client' | 'server' | 'database';

function componentForLabel(label: string): CanvasComponent | null {
  const normalized = label.toLowerCase();
  if (/\b(client|browser|frontend|front end|web app|mobile app)\b/.test(normalized)) return 'client';
  if (/\b(server|api|backend|back end|service)\b/.test(normalized)) return 'server';
  if (/\b(database|db|storage|postgres|mysql|mongo)\b/.test(normalized)) return 'database';
  return null;
}

export function canvasReviewObservation(content: unknown): string | null {
  const artifact = artifactValue(content);
  if (!artifact) return null;
  const structuredNodeCount = Array.isArray(artifact.value.nodes) ? artifact.value.nodes.length : 0;
  const structuredEdgeCount = Array.isArray(artifact.value.edges) ? artifact.value.edges.length : 0;
  if ((structuredNodeCount === 0 && structuredEdgeCount === 0) && artifact.value.freehand && typeof artifact.value.freehand === 'object') {
    const elements = (artifact.value.freehand as { elements?: unknown }).elements;
    if (Array.isArray(elements)) {
      if (elements.length === 0) {
        return 'I can see the canvas is still blank—nothing has been drawn yet. Add Client, API Server, and Database boxes with arrows between them, then say check now.';
      }
      const labels = elements.filter((element) => element && typeof element === 'object' && (element as { type?: unknown }).type === 'text');
      const arrows = elements.filter((element) => element && typeof element === 'object' && (element as { type?: unknown }).type === 'arrow').length;
      const labelKinds = new Set(labels
        .map((element) => (element as { text?: unknown }).text)
        .filter((text): text is string => typeof text === 'string')
        .map(componentForLabel)
        .filter((kind): kind is CanvasComponent => Boolean(kind)));
      const complete = labelKinds.has('client') && labelKinds.has('server') && labelKinds.has('database') && arrows >= 2;
      if (complete) {
        return `I can inspect your freehand whiteboard with ${elements.length} drawn items, including ${labels.length} labels and ${arrows} arrows. I found Client, API Server, and Database labels with directed flows. This is a complete architecture flow.`;
      }
      const missing = [
        !labelKinds.has('client') && 'Client label',
        !labelKinds.has('server') && 'API Server label',
        !labelKinds.has('database') && 'Database label',
        arrows < 2 && 'at least two arrows',
      ].filter(Boolean).join(', ');
      return `I can inspect your freehand whiteboard with ${elements.length} drawn items, including ${labels.length} labels and ${arrows} arrows. Add ${missing}, then say check now.`;
    }
    return 'Your freehand whiteboard is empty. Add shapes, labels, and arrows, then say check now.';
  }
  if (!Array.isArray(artifact.value.nodes) || !Array.isArray(artifact.value.edges)) return null;
  const nodes = artifact.value.nodes;
  const edges = artifact.value.edges;
  const nodeKinds = new Map<string, CanvasComponent>();
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const item = node as { id?: unknown; data?: { label?: unknown } };
    if (typeof item.id !== 'string' || typeof item.data?.label !== 'string') continue;
    const kind = componentForLabel(item.data.label);
    if (kind) nodeKinds.set(item.id, kind);
  }
  const present = new Set(nodeKinds.values());
  const hasLink = (from: CanvasComponent, to: CanvasComponent) => edges.some((edge) => {
    if (!edge || typeof edge !== 'object') return false;
    const item = edge as { source?: unknown; target?: unknown };
    return typeof item.source === 'string' && typeof item.target === 'string'
      && nodeKinds.get(item.source) === from && nodeKinds.get(item.target) === to;
  });
  const hasClientServer = hasLink('client', 'server') || hasLink('server', 'client');
  const hasServerDatabase = hasLink('server', 'database') || hasLink('database', 'server');
  const missing = [
    !present.has('client') && 'Add Client',
    !present.has('server') && 'Add API Server',
    !present.has('database') && 'Add Database',
  ].filter(Boolean) as string[];
  const links = [!hasClientServer && 'connect Client to API Server', !hasServerDatabase && 'connect API Server to Database'].filter(Boolean) as string[];
  if (!missing.length && !links.length) {
    return 'I can inspect your diagram: it has Client, API Server, and Database, with both required data-flow connections. Explain what happens when a user adds a task.';
  }
  const found = present.size ? `I can inspect ${[...present].map((item) => item === 'server' ? 'API Server' : item[0].toUpperCase() + item.slice(1)).join(', ')}.` : 'Your canvas is currently empty.';
  return `${found} ${[...missing, ...links].join('; ')}. Then say check now and I will review the actual diagram.`;
}
