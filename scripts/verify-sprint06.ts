/**
 * Sprint 06 verification — the LLM→UI code-workspace routing.
 * Pure unit checks (no network/DB): orchestrator modality selection, problem
 * selection, and prompt assembly. Run: node --import tsx scripts/verify-sprint06.ts
 */
import assert from 'node:assert';
import { selectNextAction } from '../lib/interview/orchestrator';
import { selectCodeTask, isCanvasModality, CODE_TASKS } from '../lib/interview/problems';
import { buildSystemPrompt } from '../lib/interview/prompt';
import { initialCandidateState, type CandidateState } from '../lib/interview/types';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// Build a state past warm-up (version >= 2) with a specific competency as the
// least-certain one (lowest confidence).
function stateWithWeakest(competency: string, lastModality?: string): CandidateState {
  const s = initialCandidateState('11111111-1111-1111-1111-111111111111');
  s.version = 5;
  // Give everything decent confidence, then drop the target to the floor.
  for (const k of Object.keys(s.competency_signals)) {
    s.competency_signals[k] = { belief: 0.6, confidence: 0.7 };
  }
  s.competency_signals[competency] = { belief: 0.3, confidence: 0.01 };
  if (lastModality) s.last_action = { modality: lastModality };
  return s;
}

console.log('Sprint 06 — orchestrator modality routing');

check('coding_implementation gap opens the code workspace', () => {
  const action = selectNextAction(stateWithWeakest('coding_implementation'));
  assert.equal(action.modality, 'code', `expected code, got ${action.modality}`);
  assert.equal(action.role, 'technical');
  assert.equal(action.reason_code, 'gap:coding_implementation:needs_code');
});

check('debugging gap opens a debug task', () => {
  const action = selectNextAction(stateWithWeakest('debugging'));
  assert.equal(action.modality, 'debug', `expected debug, got ${action.modality}`);
  assert.equal(action.reason_code, 'gap:debugging:needs_code');
});

check('does NOT re-open code right after a code turn', () => {
  const action = selectNextAction(stateWithWeakest('coding_implementation', 'code'));
  assert.notEqual(action.modality, 'code', 'should avoid back-to-back code turns');
});

check('a non-code gap stays voice', () => {
  const action = selectNextAction(stateWithWeakest('product_thinking'));
  assert.ok(!isCanvasModality(action.modality), `expected voice-ish, got ${action.modality}`);
});

check('cold open (version < 2) never opens code', () => {
  const action = selectNextAction(initialCandidateState('x'));
  assert.equal(action.modality, 'voice');
});

console.log('\nSprint 06 — problem selection');

check('code modality picks a build task', () => {
  const action = selectNextAction(stateWithWeakest('coding_implementation'));
  const task = selectCodeTask(action);
  assert.equal(task.kind, 'code');
  assert.ok(task.starterCode.length > 0);
});

check('debug modality picks a debug task', () => {
  const action = selectNextAction(stateWithWeakest('debugging'));
  const task = selectCodeTask(action);
  assert.equal(task.kind, 'debug', `expected a debug task, got ${task.kind}`);
});

check('selectCodeTask is deterministic', () => {
  const action = selectNextAction(stateWithWeakest('coding_implementation'));
  assert.equal(selectCodeTask(action).id, selectCodeTask(action).id);
});

check('all tasks have required fields', () => {
  for (const t of Object.values(CODE_TASKS)) {
    assert.ok(t.id && t.title && t.prompt && t.starterCode && t.language, `bad task ${t.id}`);
  }
});

console.log('\nSprint 06 — prompt assembly');

check('opening a code task injects the spoken framing, not the code', () => {
  const action = selectNextAction(stateWithWeakest('coding_implementation'));
  const task = selectCodeTask(action);
  const prompt = buildSystemPrompt({
    state: stateWithWeakest('coding_implementation'),
    action,
    codeTask: { title: task.title, prompt: task.prompt, kind: task.kind },
  });
  assert.ok(prompt.includes('opening a workspace'), 'missing workspace directive');
  assert.ok(prompt.includes(task.title), 'missing task title');
  assert.ok(prompt.includes('Do not read the code aloud'), 'missing anti-dictation guard');
});

check('shared candidate code is embedded for the interviewer to read', () => {
  const prompt = buildSystemPrompt({
    state: stateWithWeakest('coding_implementation'),
    action: selectNextAction(stateWithWeakest('coding_implementation')),
    candidateCode: 'class LRUCache { get(k){ return this.m.get(k) } }',
  });
  assert.ok(prompt.includes('current code'), 'missing code section');
  assert.ok(prompt.includes('LRUCache'), 'candidate code not embedded');
});

console.log(`\n${passed} checks passed.`);
