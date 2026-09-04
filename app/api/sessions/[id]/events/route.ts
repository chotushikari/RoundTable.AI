import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCandidateSession } from '@/lib/api-auth';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';

const EventSchema = z.object({
  type: z.enum(['AGENT_STATE_CHANGED', 'METRICS', 'ERROR', 'CONNECTION_STATE', 'INTERRUPTED']),
  payload: z.record(z.string(), z.unknown()).default({}),
});

function sanitize(type: string, payload: Record<string, unknown>): Record<string, unknown> {
  if (type === 'METRICS') return { metrics: payload.metrics };
  if (type === 'ERROR') return { source: payload.source, code: payload.code, message: String(payload.message ?? '').slice(0, 500) };
  if (type === 'CONNECTION_STATE') return { state: payload.state, timestamp: payload.timestamp };
  if (type === 'AGENT_STATE_CHANGED') return { state: payload.state };
  return { turnId: payload.turnId };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireCandidateSession(request, id);
    const event = EventSchema.parse(await request.json());
    if (event.type === 'INTERRUPTED') {
      await interviewStore.markLatestInterviewerTurnInterrupted(id);
      const analyses = await interviewStore.listAnalyses(id);
      const latest = analyses.at(-1);
      await interviewStore.updateSession(id, {
        askedMustAsk: latest?.decision.reasonCode === 'must_ask'
          ? session.askedMustAsk.filter((question) => question !== latest.decision.objective)
          : session.askedMustAsk,
        pendingQuestion: session.pendingQuestion?.startsWith('[interrupted] ')
          ? session.pendingQuestion
          : `[interrupted] ${session.pendingQuestion ?? 'Please restate the last question.'}`,
        stateVersion: session.stateVersion + 1,
      }, session.stateVersion);
    }
    if (event.type === 'CONNECTION_STATE') {
      const state = String(event.payload.state ?? '').toUpperCase();
      const connectionHealth = state === 'CONNECTED'
        ? 'connected'
        : state === 'RECONNECTING' || state === 'CONNECTING'
          ? 'degraded'
          : 'disconnected';
      const fresh = await interviewStore.getSession(id);
      if (fresh) await interviewStore.updateSession(id, {
        connectionHealth,
        stateVersion: fresh.stateVersion + 1,
      }, fresh.stateVersion);
    }
    await interviewStore.appendEvent(id, event.type.toLocaleLowerCase(), sanitize(event.type, event.payload));
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return apiError(error, 'Failed to record session event');
  }
}
