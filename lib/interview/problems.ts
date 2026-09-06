import type { Competency, NextInterviewAction } from './types';

/**
 * Code-task library for the multimodal workspace (Sprint 06).
 *
 * When the control plane decides the candidate should BUILD something concrete
 * (action.modality === 'code' | 'debug' | 'design'), it selects one of these
 * tasks and ships the stub to the frontend, which opens the Monaco workspace
 * pre-loaded with `starterCode`. Kept deterministic + pure so the same state
 * always yields the same task (decision replay).
 */

export interface CodeTask {
  id: string;
  title: string;
  /** One-line framing the interviewer will speak while the workspace opens. */
  prompt: string;
  language: 'javascript' | 'typescript' | 'python';
  starterCode: string;
  /** Competencies this task is designed to produce evidence for. */
  competencies: Competency[];
  /** 'code' = build from scratch; 'debug' = fix given code. */
  kind: 'code' | 'debug' | 'design';
}

export const CODE_TASKS: Record<string, CodeTask> = {
  lru_cache: {
    id: 'lru_cache',
    title: 'LRU Cache',
    prompt:
      "Let's make this concrete. Implement an LRU cache with O(1) get and put — I'll be watching how you handle eviction.",
    language: 'javascript',
    kind: 'code',
    competencies: ['coding_implementation', 'technical_reasoning'],
    starterCode: `/**
 * Least-Recently-Used cache.
 * get(key)      -> value, or -1 if absent. Counts as a use.
 * put(key, val) -> insert/update. Evict the least-recently-used
 *                  entry when over capacity.
 * Target: O(1) for both.
 */
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    // your fields here
  }

  get(key) {
    // ...
  }

  put(key, value) {
    // ...
  }
}
`,
  },

  debounce: {
    id: 'debounce',
    title: 'debounce()',
    prompt:
      "Quick one to make it real: write a debounce function. Then tell me where you'd actually reach for it.",
    language: 'javascript',
    kind: 'code',
    competencies: ['coding_implementation', 'technical_reasoning'],
    starterCode: `/**
 * debounce(fn, wait)
 * Returns a function that delays invoking fn until \`wait\` ms have
 * elapsed since the last call. Later calls reset the timer.
 */
function debounce(fn, wait) {
  // ...
}
`,
  },

  fix_async_bug: {
    id: 'fix_async_bug',
    title: 'Fix the async bug',
    prompt:
      "Here's some code that's misbehaving in production — the totals come back wrong under load. Walk me through fixing it.",
    language: 'javascript',
    kind: 'debug',
    competencies: ['debugging', 'technical_reasoning'],
    starterCode: `/**
 * Sums the amounts for a list of order IDs by fetching each order.
 * BUG: under load the returned total is sometimes too low.
 * Find it and fix it.
 */
async function totalForOrders(orderIds, fetchOrder) {
  let total = 0;
  orderIds.forEach(async (id) => {
    const order = await fetchOrder(id);
    total += order.amount;
  });
  return total;
}
`,
  },

  rate_limiter: {
    id: 'rate_limiter',
    title: 'Token-bucket rate limiter',
    prompt:
      "Let's build something with a scale angle: a token-bucket rate limiter. Allow N requests per interval, refill over time.",
    language: 'javascript',
    kind: 'code',
    competencies: ['coding_implementation', 'system_design'],
    starterCode: `/**
 * Token-bucket rate limiter.
 * new RateLimiter(capacity, refillPerSec)
 * tryRemove()  -> true if a token was available (and consumed), else false.
 * Tokens refill continuously over time up to capacity.
 */
class RateLimiter {
  constructor(capacity, refillPerSec) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    // your fields here
  }

  tryRemove() {
    // ...
  }
}
`,
  },
};

const DEFAULT_TASK_ID = 'lru_cache';

/**
 * Pick a code task for the given action. Prefers a task whose competencies
 * include the action's target competency; falls back by modality kind, then
 * to the default. Deterministic.
 */
export function selectCodeTask(action: NextInterviewAction | null): CodeTask {
  if (!action) return CODE_TASKS[DEFAULT_TASK_ID];

  const wantKind: CodeTask['kind'] =
    action.modality === 'debug'
      ? 'debug'
      : action.modality === 'design'
        ? 'design'
        : 'code';

  const candidates = Object.values(CODE_TASKS).filter(
    (t) => t.kind === wantKind,
  );

  // Prefer a task that targets the same competency.
  const byCompetency = candidates.find((t) =>
    t.competencies.includes(action.competency),
  );
  if (byCompetency) return byCompetency;

  if (candidates.length) return candidates[0];
  return CODE_TASKS[DEFAULT_TASK_ID];
}

export function getCodeTask(id: string): CodeTask | null {
  return CODE_TASKS[id] ?? null;
}

/** True when this action calls for opening the workspace. */
export function isCanvasModality(
  modality: NextInterviewAction['modality'] | undefined,
): boolean {
  return modality === 'code' || modality === 'debug' || modality === 'design';
}
