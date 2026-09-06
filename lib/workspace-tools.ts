import { randomUUID } from 'crypto';
import ts from 'typescript';
import { Sandbox } from 'e2b';
import { interviewStore } from '@/lib/interview-store';
import type { ToolRunRecord } from '@/types/interview';

export type WorkspaceToolName = 'get_workspace_snapshot' | 'run_code_tests' | 'inject_scenario_constraint';

const MAX_TOOL_RUNS = 5;
const MAX_OUTPUT_CHARS = 8_000;

function capped(value: string): string {
  return value.length <= MAX_OUTPUT_CHARS ? value : `${value.slice(0, MAX_OUTPUT_CHARS)}\n[output truncated]`;
}

async function recordRun(
  sessionId: string,
  name: WorkspaceToolName,
  input: Record<string, unknown>,
  operation: () => Promise<unknown>,
): Promise<ToolRunRecord> {
  const session = await interviewStore.getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.toolRunCount >= MAX_TOOL_RUNS) throw new Error('Maximum of five tool runs reached for this session');

  let output: unknown;
  let status: ToolRunRecord['status'] = 'completed';
  try {
    output = await operation();
  } catch (error) {
    status = 'failed';
    output = { error: error instanceof Error ? error.message : 'Tool execution failed' };
  }

  await interviewStore.updateSession(session.id, {
    toolRunCount: session.toolRunCount + 1,
    stateVersion: session.stateVersion + 1,
  }, session.stateVersion);
  const record: ToolRunRecord = {
    id: randomUUID(),
    sessionId,
    name,
    input,
    output,
    status,
    createdAt: new Date().toISOString(),
  };
  await interviewStore.createToolRun(record);
  return record;
}

async function workspaceSnapshot(sessionId: string) {
  const [code, canvas] = await Promise.all([
    interviewStore.getArtifact(sessionId, 'code'),
    interviewStore.getArtifact(sessionId, 'canvas'),
  ]);
  return {
    code: code ? { version: code.version, checkpoint: (code.content as Record<string, unknown>)?.checkpoint ?? null, updatedAt: code.updatedAt } : null,
    canvas: canvas ? { version: canvas.version, checkpoint: (canvas.content as Record<string, unknown>)?.checkpoint ?? null, constraints: (canvas.content as Record<string, unknown>)?.constraints ?? [], updatedAt: canvas.updatedAt } : null,
  };
}

type CodeLanguage = 'python' | 'javascript' | 'typescript';

type TestPlan = { id: string; summary: string; javascript: string; python: string };

function testPlan(question: string): TestPlan {
  const normalized = question.toLowerCase();
  if (/reverse\s*string|reverses? a string|reversestring/.test(normalized)) {
    return {
      id: 'reverse-string-v1',
      summary: 'reverseString handles a normal string and an empty string',
      javascript: "assert.equal(reverseString('hello'), 'olleh');\nassert.equal(reverseString(''), '');",
      python: "assert reverseString('hello') == 'olleh'\nassert reverseString('') == ''",
    };
  }
  if (/count\s*vowels|countvowels|number of vowels/.test(normalized)) {
    return {
      id: 'count-vowels-v1',
      summary: 'countVowels handles regular text, an empty string, and non-alphabetic characters',
      javascript: "assert.equal(countVowels('RoundTable'), 4);\nassert.equal(countVowels(''), 0);\nassert.equal(countVowels('a1!E'), 2);",
      python: "assert countVowels('RoundTable') == 4\nassert countVowels('') == 0\nassert countVowels('a1!E') == 2",
    };
  }
  if (/even numbers|count.*even/.test(normalized)) {
    return {
      id: 'count-even-v1',
      summary: 'solution counts even numbers and handles an empty list',
      javascript: 'assert.equal(solution([1, 2, 3, 4]), 2);\nassert.equal(solution([]), 0);',
      python: 'assert solution([1, 2, 3, 4]) == 2\nassert solution([]) == 0',
    };
  }
  return {
    id: 'syntax-runtime-v1',
    summary: 'code parses and runs; this question has no server-selected functional cases yet',
    javascript: '',
    python: '',
  };
}

async function runTests(sessionId: string) {
  if (!process.env.E2B_API_KEY) throw new Error('E2B_API_KEY is not configured');
  const [session, codeArtifact] = await Promise.all([
    interviewStore.getSession(sessionId),
    interviewStore.getArtifact(sessionId, 'code'),
  ]);
  const content = codeArtifact?.content as { source?: unknown; language?: unknown; checkpoint?: { source?: unknown; language?: unknown } } | undefined;
  const candidate = typeof content?.source === 'string' ? content : content?.checkpoint;
  if (typeof candidate?.source !== 'string') throw new Error('No autosaved code is available yet');
  if (!['python', 'javascript', 'typescript'].includes(String(candidate.language ?? 'typescript'))) {
    throw new Error('Only Python, JavaScript and TypeScript checkpoints can be tested');
  }
  if (candidate.source.length > 50_000) throw new Error('Code exceeds the 50 KB limit');

  const language = candidate.language as CodeLanguage;
  const python = language === 'python';
  const plan = testPlan(session?.pendingQuestion ?? '');
  const javascript = python ? '' : language === 'javascript'
    ? candidate.source
    : ts.transpileModule(candidate.source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
  const harness = `'use strict';\nconst assert = require('node:assert/strict');\n${javascript}\n${plan.javascript}\nconsole.log('PASS: ${plan.id}');`;
  const sandbox = await Sandbox.create({ timeoutMs: 20_000 });
  try {
    const path = python ? '/tmp/roundtable-test.py' : '/tmp/roundtable-test.cjs';
    const pythonHarness = `${candidate.source}\n\n${plan.python}\nprint('PASS: ${plan.id}')\n`;
    await sandbox.files.write(path, python ? pythonHarness : harness);
    const result = await sandbox.commands.run(python ? 'python3 /tmp/roundtable-test.py' : 'node /tmp/roundtable-test.cjs', { timeoutMs: 15_000 });
    return {
      passed: result.exitCode === 0,
      testId: plan.id,
      summary: plan.summary,
      exitCode: result.exitCode,
      stdout: capped(result.stdout),
      stderr: capped(result.stderr),
      harness: python ? 'roundtable-python-v2' : 'roundtable-javascript-v2',
    };
  } finally {
    await sandbox.kill();
  }
}

export async function executeWorkspaceTool(
  sessionId: string,
  name: WorkspaceToolName,
  input: Record<string, unknown>,
): Promise<ToolRunRecord> {
  if (name === 'get_workspace_snapshot') {
    return recordRun(sessionId, name, input, () => workspaceSnapshot(sessionId));
  }
  if (name === 'run_code_tests') {
    return recordRun(sessionId, name, input, () => runTests(sessionId));
  }
  if (name === 'inject_scenario_constraint') {
    return recordRun(sessionId, name, input, async () => {
      const constraint = typeof input.constraint === 'string' ? input.constraint.trim() : '';
      if (!constraint || constraint.length > 500) throw new Error('A constraint of at most 500 characters is required');
      const existing = await interviewStore.getArtifact(sessionId, 'canvas');
      const prior = (existing?.content ?? {}) as Record<string, unknown>;
      const constraints = Array.isArray(prior.constraints) ? prior.constraints.filter((item): item is string => typeof item === 'string') : [];
      const artifact = await interviewStore.saveArtifact(sessionId, 'canvas', {
        ...prior,
        constraints: [...constraints, constraint],
      }, existing?.version ?? 0);
      return { constraint, canvasVersion: artifact.version };
    });
  }
  throw new Error('Tool is not allowed');
}

export const workspaceToolDefinitions = [
  {
    name: 'get_workspace_snapshot',
    description: 'Read the candidate\'s latest deliberate code and system-design canvas checkpoints.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'run_code_tests',
    description: 'Run server-selected functional tests for the current coding question against the latest autosaved Python, JavaScript, or TypeScript code. Unknown tasks receive a syntax/runtime check.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'inject_scenario_constraint',
    description: 'Add an interviewer-authored constraint, such as 10x traffic, to the system-design canvas.',
    inputSchema: {
      type: 'object',
      properties: { constraint: { type: 'string', maxLength: 500 } },
      required: ['constraint'],
      additionalProperties: false,
    },
  },
] as const;
