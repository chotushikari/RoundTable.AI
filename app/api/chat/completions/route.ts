import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { randomUUID } from 'crypto';
import {
  getLatestState,
  appendEvent,
  ensureInterview,
  getLatestEventOfType,
} from '@/lib/db/repository';
import { selectNextAction } from '@/lib/interview/orchestrator';
import { buildSystemPrompt } from '@/lib/interview/prompt';
import { isCanvasModality, selectCodeTask } from '@/lib/interview/problems';
import type { InterviewEvent } from '@/lib/interview/types';

/**
 * OpenAI-compatible Chat Completions endpoint — the CONTROL PLANE (R2).
 *
 * Agora's Conversational AI Engine calls this as its "custom LLM": it sends
 * standard OpenAI chat-completion requests and expects OpenAI SSE chunks back.
 *
 * What makes this the shared brain (vs. a passthrough):
 *  1. Resolve the interview_id for this session.
 *  2. Load the shared CandidateState (belief/confidence per competency).
 *  3. The orchestrator picks ONE NextInterviewAction (which role speaks, what to probe).
 *  4. Assemble a per-turn system prompt (active persona + state + objective + guardrails)
 *     and inject it, replacing whatever static system prompt Agora sent.
 *  5. Emit NEXT_ACTION_SELECTED so every turn's reasoning is persisted + replayable.
 *  6. Stream the model's reply back in OpenAI SSE format.
 *
 * The model is Gemini, reached through its OpenAI-compatible endpoint so we can
 * use the proven @ai-sdk/openai provider (avoids the ai@6 ↔ @ai-sdk/google v4
 * spec mismatch). Set GEMINI_API_KEY; the base URL defaults to Google's
 * OpenAI-compat gateway and is overridable via GEMINI_OPENAI_BASE_URL.
 *
 * Deep analysis never blocks the voice path: action selection is deterministic
 * and cheap; state updates happen off the hot path (logger + R3/R4 workers).
 */

type ChatMessage = { role: string; content: unknown };
type ChatBody = {
  messages?: ChatMessage[];
  model?: string;
  stream?: boolean;
  interview_id?: string;
  channel?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
};

type ChatCompletionsDeps = {
  createOpenAIClient: typeof createOpenAI;
  streamTextImpl: typeof streamText;
};

const DEFAULT_GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai';
const MODEL_ID = 'gemini-2.0-flash';

/** Pull an interview_id from wherever Agora/the client stashed it. */
function resolveInterviewId(body: ChatBody, req: NextRequest): string | undefined {
  const fromBody =
    body.interview_id ||
    (body.context?.interview_id as string | undefined) ||
    (body.context?.channel as string | undefined) ||
    body.channel;
  if (fromBody) return fromBody;
  const q = req.nextUrl.searchParams.get('interview_id');
  return q ?? undefined;
}

/** Keep only user/assistant turns as conversation; system is rebuilt by us. */
function toModelMessages(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));
}

function recentTranscriptFrom(messages: ChatMessage[]): string[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map((m) => {
      const who = m.role === 'assistant' ? 'agent' : 'candidate';
      const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `[${who}] ${text}`;
    });
}

/**
 * Factory so the handler is unit-testable with injected fakes (see
 * scripts/verify-api-contracts.ts) without hitting the network or the model.
 */
export function createChatCompletionsHandler({
  createOpenAIClient,
  streamTextImpl,
}: ChatCompletionsDeps) {
  return async function POST(request: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY must be set' }, { status: 500 });
    }
    const baseURL = process.env.GEMINI_OPENAI_BASE_URL || DEFAULT_GEMINI_BASE_URL;

    let body: ChatBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const incoming = body.messages ?? [];
    const interviewId = resolveInterviewId(body, request);

    // ── Load shared brain + choose this turn's action ───────────────────────
    const state = interviewId ? await getLatestState(interviewId) : null;
    const action = selectNextAction(state);

    // If this turn opens the workspace, tell the LLM how to introduce it. Also
    // pull the candidate's latest shared code so the interviewer can react to
    // what's actually there.
    const openingCanvas = isCanvasModality(action.modality);
    const codeTask = openingCanvas
      ? (() => {
          const t = selectCodeTask(action);
          return { title: t.title, prompt: t.prompt, kind: t.kind };
        })()
      : null;

    let candidateCode: string | null = null;
    if (interviewId) {
      const lastCode = await getLatestEventOfType(interviewId, 'CODE_CHANGED');
      const c = (lastCode?.payload as { code?: string } | undefined)?.code;
      if (typeof c === 'string' && c.trim()) candidateCode = c;
    }

    const systemPrompt = buildSystemPrompt({
      state,
      action,
      recentTranscript: recentTranscriptFrom(incoming),
      canvasOpen: openingCanvas || Boolean(candidateCode),
      codeTask,
      candidateCode,
    });

    // Persist the decision (fire-and-forget; never block the voice path on it).
    if (interviewId) {
      const evt: InterviewEvent = {
        event_id: randomUUID(),
        interview_id: interviewId,
        event_type: 'NEXT_ACTION_SELECTED',
        source: 'orchestrator',
        occurred_at: new Date().toISOString(),
        state_version: state?.version,
        payload: {
          role: action.role,
          competency: action.competency,
          modality: action.modality,
          question_type: action.question_type,
          reason_code: action.reason_code,
          objective: action.objective,
        },
      };
      void (async () => {
        try {
          await ensureInterview(interviewId);
          await appendEvent(evt);
        } catch (err) {
          console.error('[control-plane] failed to persist NEXT_ACTION_SELECTED:', err);
        }
      })();
    }

    console.log(
      '[control-plane]',
      JSON.stringify({
        interview_id: interviewId ?? null,
        role: action.role,
        competency: action.competency,
        reason_code: action.reason_code,
        state_version: state?.version ?? null,
      }),
    );

    // ── Stream the model reply in OpenAI SSE format ─────────────────────────
    const gemini = createOpenAIClient({ apiKey, baseURL });

    const result = streamTextImpl({
      model: gemini(MODEL_ID),
      system: systemPrompt,
      messages: toModelMessages(incoming) as NonNullable<
        Parameters<typeof streamText>[0]['messages']
      >,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    const id = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);
    const model = body.model ?? MODEL_ID;

    const sseChunk = (delta: Record<string, unknown>, finishReason: string | null = null) =>
      encoder.encode(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta, finish_reason: finishReason }],
        })}\n\n`,
      );

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(sseChunk({ role: 'assistant', content: '' }));
          for await (const chunk of result.textStream) {
            controller.enqueue(sseChunk({ content: chunk }));
          }
          controller.enqueue(sseChunk({}, 'stop'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[control-plane] stream error:', err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  };
}

export const POST = createChatCompletionsHandler({
  createOpenAIClient: createOpenAI,
  streamTextImpl: streamText,
});
