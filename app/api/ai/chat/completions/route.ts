import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireLlmSession } from '@/lib/api-auth';
import { apiError } from '@/lib/http';
import { processCandidateTurn } from '@/lib/interview-controller';
import { interviewStore } from '@/lib/interview-store';

type ChatMessage = { role?: string; content?: unknown };
type ChatBody = { messages?: ChatMessage[]; stream?: boolean; model?: string; [key: string]: unknown };

function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'text' in item) return String((item as { text?: unknown }).text ?? '');
      return '';
    }).join(' ');
  }
  return '';
}

function sseResponse(text: string): NextResponse {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1_000);
  const chunks = text.match(/\S+\s*/g) ?? [text];
  const stream = new ReadableStream({
    start(controller) {
      const emit = (delta: Record<string, unknown>, finishReason: string | null = null) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: 'roundtable-controller', choices: [{ index: 0, delta, finish_reason: finishReason }] })}\n\n`));
      emit({ role: 'assistant', content: '' });
      for (const chunk of chunks) emit({ content: chunk });
      emit({}, 'stop');
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}

export async function POST(request: Request) {
  const receivedAt = Date.now();
  try {
    const session = await requireLlmSession(request);
    if (!['ready', 'in_progress'].includes(session.status)) throw new Error('Session is not active');
    let body: ChatBody;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latestUser = [...messages].reverse().find((message) => message.role === 'user');
    const answer = messageText(latestUser?.content).trim();
    if (!answer) throw new Error('A candidate answer is required');
    // Caller-provided system messages and model names are intentionally ignored.
    const contextId = createHash('sha256').update(JSON.stringify(messages.slice(-6))).digest('hex');
    const result = await processCandidateTurn({ session, answer, upstreamTurnId: contextId });
    await interviewStore.appendEvent(session.id, 'llm.response_ready', {
      durationMs: Date.now() - receivedAt,
      role: result.decision.activeSpeakerRole,
      reasonCode: result.decision.reasonCode,
      modality: result.decision.modality,
      difficulty: result.decision.difficulty,
    }).catch(() => {});
    return sseResponse(result.responseText);
  } catch (error) {
    return apiError(error, 'Adaptive interview response failed');
  }
}
