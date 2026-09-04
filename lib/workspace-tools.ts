import { randomUUID } from 'crypto';
import ts from 'typescript';
import { Sandbox } from 'e2b';
import { interviewStore } from '@/lib/interview-store';
import type { ToolRunRecord } from '@/types/interview';

export type WorkspaceToolName = ToolRunRecord['name'];

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

async function runTests(sessionId: string) {
  if (!process.env.E2B_API_KEY) throw new Error('E2B_API_KEY is not configured');
  const codeArtifact = await interviewStore.getArtifact(sessionId, 'code');
  const content = codeArtifact?.content as { checkpoint?: { source?: unknown; language?: unknown } } | undefined;
  const checkpoint = content?.checkpoint;
  if (typeof checkpoint?.source !== 'string') throw new Error('No deliberate code checkpoint is available');
  if (!['javascript', 'typescript'].includes(String(checkpoint.language ?? 'typescript'))) {
    throw new Error('Only JavaScript and TypeScript checkpoints can be tested');
  }
  if (checkpoint.source.length > 50_000) throw new Error('Code checkpoint exceeds the 50 KB limit');

  const javascript = checkpoint.language === 'javascript'
    ? checkpoint.source
    : ts.transpileModule(checkpoint.source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
  const harness = `'use strict';\nconst assert = require('node:assert/strict');\n${javascript}\nif (typeof solution !== 'function') throw new Error('Define a function named solution');\nassert.equal(typeof solution, 'function');\nconsole.log('Harness loaded solution successfully');`;
  const sandbox = await Sandbox.create({ timeoutMs: 20_000 });
  try {
    await sandbox.files.write('/tmp/roundtable-test.cjs', harness);
    const result = await sandbox.commands.run('node /tmp/roundtable-test.cjs', { timeoutMs: 15_000 });
    return {
      exitCode: result.exitCode,
      stdout: capped(result.stdout),
      stderr: capped(result.stderr),
      harness: 'roundtable-js-function-v1',
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
    description: 'Run the server-selected JavaScript/TypeScript harness against the latest code checkpoint.',
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
