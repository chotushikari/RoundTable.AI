import assert from 'node:assert/strict';
import test from 'node:test';
import { Sandbox } from 'e2b';
import { interviewStore } from '@/lib/interview-store';
import { executeWorkspaceTool } from '@/lib/workspace-tools';

test('sandbox selects fixed language commands, caps output and always cleans up', async (t) => {
  const previousKey = process.env.E2B_API_KEY;
  process.env.E2B_API_KEY = 'offline-test-key';
  t.after(() => { if (previousKey === undefined) delete process.env.E2B_API_KEY; else process.env.E2B_API_KEY = previousKey; });
  let language = 'python';
  let source = 'def solution(values):\n    return len(values)';
  let pendingQuestion = 'Write any small helper function.';
  let writtenPath = '';
  let writtenSource = '';
  let command = '';
  let timeout = 0;
  let killed = 0;
  let created = 0;
  let fail = false;
  t.mock.method(interviewStore, 'getSession', async () => ({ id: 'session', toolRunCount: 0, stateVersion: 0, pendingQuestion }));
  t.mock.method(interviewStore, 'getArtifact', async () => ({ content: { source, language } }));
  t.mock.method(interviewStore, 'updateSession', async () => ({}));
  t.mock.method(interviewStore, 'createToolRun', async () => ({}));
  t.mock.method(Sandbox, 'create', async () => {
    created++;
    return {
      files: { write: async (path: string, content: string) => { writtenPath = path; writtenSource = content; } },
      commands: { run: async (value: string, options: { timeoutMs: number }) => {
        command = value; timeout = options.timeoutMs;
        if (fail) throw new Error('Sandbox timeout');
        return { exitCode: 0, stdout: 'x'.repeat(10_000), stderr: '' };
      } },
      kill: async () => { killed++; },
    };
  });
  for (const selected of ['python', 'javascript', 'typescript']) {
    language = selected;
    source = selected === 'python' ? 'def solution(values):\n    return len(values)'
      : selected === 'typescript' ? 'function solution(values: number[]) { return values.length; }'
      : 'function solution(values) { return values.length; }';
    const run = await executeWorkspaceTool('session', 'run_code_tests', {});
    assert.equal(run.status, 'completed');
    assert.equal(command, selected === 'python' ? 'python3 /tmp/roundtable-test.py' : 'node /tmp/roundtable-test.cjs');
    assert.equal(writtenPath, selected === 'python' ? '/tmp/roundtable-test.py' : '/tmp/roundtable-test.cjs');
    assert.equal(timeout, 15_000);
    assert.match(writtenSource, /solution/);
    assert.doesNotMatch(writtenSource, /offline-test-key|values: number\[\]/);
    assert.ok(JSON.stringify(run.output).length < 9_000);
  }
  assert.equal(killed, 3);
  pendingQuestion = 'Implement a function named reverseString that returns a reversed string.';
  language = 'javascript';
  source = 'function reverseString(value) { return value.split(\'\').reverse().join(\'\'); }';
  await executeWorkspaceTool('session', 'run_code_tests', {});
  assert.match(writtenSource, /reverseString\('hello'\)/);
  assert.match(writtenSource, /reverseString\(''\)/);
  assert.equal(killed, 4);
  pendingQuestion = 'Implement a function named countVowels that counts vowels in a string.';
  source = "function countVowels(value) { return [...value].filter((letter) => 'aeiouAEIOU'.includes(letter)).length; }";
  await executeWorkspaceTool('session', 'run_code_tests', {});
  assert.match(writtenSource, /countVowels\('RoundTable'\)/);
  assert.match(writtenSource, /countVowels\('a1!E'\)/);
  assert.equal(killed, 5);
  language = 'python; printenv';
  assert.equal((await executeWorkspaceTool('session', 'run_code_tests', {})).status, 'failed');
  assert.equal(created, 5, 'Unsupported language must not create a sandbox');
  language = 'python'; fail = true;
  assert.equal((await executeWorkspaceTool('session', 'run_code_tests', {})).status, 'failed');
  assert.equal(killed, 6, 'Timed-out execution must kill its sandbox');
});
