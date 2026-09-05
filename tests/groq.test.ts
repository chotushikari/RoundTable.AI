import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import {
  configuredGeminiModel,
  generateGeminiJson,
  GroqApiError,
  isGroqRateLimitError,
  generateGeminiText,
} from '@/lib/gemini';

test('Groq model configuration supports a dedicated assessment model', () => {
  const previous = {
    evaluator: process.env.GROQ_EVALUATOR_MODEL,
    speaker: process.env.GROQ_SPEAKER_MODEL,
    planner: process.env.GROQ_PLANNER_MODEL,
    assessment: process.env.GROQ_ASSESSMENT_MODEL,
  };
  process.env.GROQ_EVALUATOR_MODEL = 'evaluator-model';
  process.env.GROQ_SPEAKER_MODEL = 'speaker-model';
  process.env.GROQ_PLANNER_MODEL = 'planner-model';
  process.env.GROQ_ASSESSMENT_MODEL = 'assessment-model';
  try {
    assert.equal(configuredGeminiModel('evaluator'), 'evaluator-model');
    assert.equal(configuredGeminiModel('speaker'), 'speaker-model');
    assert.equal(configuredGeminiModel('planner'), 'planner-model');
    assert.equal(configuredGeminiModel('assessment'), 'assessment-model');
  } finally {
    if (previous.evaluator === undefined) delete process.env.GROQ_EVALUATOR_MODEL;
    else process.env.GROQ_EVALUATOR_MODEL = previous.evaluator;
    if (previous.speaker === undefined) delete process.env.GROQ_SPEAKER_MODEL;
    else process.env.GROQ_SPEAKER_MODEL = previous.speaker;
    if (previous.planner === undefined) delete process.env.GROQ_PLANNER_MODEL;
    else process.env.GROQ_PLANNER_MODEL = previous.planner;
    if (previous.assessment === undefined) delete process.env.GROQ_ASSESSMENT_MODEL;
    else process.env.GROQ_ASSESSMENT_MODEL = previous.assessment;
  }
});

test('provider cooldown suppresses repeated requests across JSON and speech and expires', async (t) => {
  const savedKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'cooldown-test';
  t.after(() => { if (savedKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedKey; });
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return calls === 1
      ? new Response('rate limited', { status: 429, headers: { 'retry-after': '5' } })
      : Response.json({ choices: [{ message: { content: 'Recovered' } }] });
  });
  const args = { model: 'cooldown-model', system: 'test', prompt: 'test' };
  await assert.rejects(generateGeminiJson({ ...args, schema: z.object({ ok: z.boolean() }) }), isGroqRateLimitError);
  await assert.rejects(generateGeminiText(args), isGroqRateLimitError);
  assert.equal(calls, 1);
  now += 5_001;
  assert.equal(await generateGeminiText(args), 'Recovered');
  assert.equal(calls, 2);
});

test('oversized local input is rejected before calling Groq', async (t) => {
  const savedKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'size-budget-test';
  t.after(() => { if (savedKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedKey; });
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not reach provider'); });
  await assert.rejects(generateGeminiJson({
    model: 'budget-model', system: 'test', prompt: 'x'.repeat(10_000), schema: z.object({ ok: z.boolean() }), maxInputBytes: 6_000,
  }), (error: unknown) => error instanceof GroqApiError && error.status === 413);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('structured Groq requests cap the default completion budget', async (t) => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousFetch = globalThis.fetch;
  let body: Record<string, unknown> = {};
  process.env.GROQ_API_KEY = 'test-key';
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  });

  const result = await generateGeminiJson({
    model: 'test-model',
    system: 'Return JSON.',
    prompt: '{}',
    schema: z.object({ ok: z.boolean() }),
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(body.max_completion_tokens, 2_048);
});

test('Groq 429 responses expose retry timing without losing the fallback signal', async (t) => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GROQ_API_KEY = 'test-key';
  globalThis.fetch = (async () => new Response('{"error":{"message":"rate limited"}}', {
    status: 429,
    headers: { 'retry-after': '55' },
  })) as typeof fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  });

  await assert.rejects(
    generateGeminiJson({
      model: 'test-model',
      system: 'Return JSON.',
      prompt: '{}',
      schema: z.object({ ok: z.boolean() }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof GroqApiError);
      assert.equal(error.retryAfter, '55');
      assert.equal(isGroqRateLimitError(error), true);
      return true;
    },
  );
});
