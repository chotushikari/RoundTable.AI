import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { appendEvent, ensureInterview } from '@/lib/db/repository';
import type { InterviewEvent } from '@/lib/interview/types';

/**
 * Event sink for the interview. The client posts structured events; we persist
 * them durably (append-only, idempotent) as the backbone of the two-speed
 * intelligence pipeline.
 *
 * NOTE (R1): this route now ONLY captures + persists events. The role-switching
 * "levels" logic that used to live here has been removed — the custom-LLM proxy
 * (R2) becomes the control plane, and the evidence-gap orchestrator (R4) will
 * decide next actions from persisted state. This keeps the live voice path fast
 * and free of synchronous deep analysis.
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Structured console trace (kept for local debugging / two-speed visibility)
    console.log('\n[StructuredEvent]', JSON.stringify({ type: data.type }, null, 2));

    // interview_id: prefer explicit; fall back to Agora channel as a stable key.
    const interviewId: string | undefined =
      data.interview_id || data.interviewId || data.channel || data.agentUID;

    // Persist only when we have a usable interview key AND it's a UUID-shaped id.
    // (During R1 the client may still send the legacy agentUID; we accept a
    //  provided interview_id and otherwise skip persistence gracefully.)
    if (data.interview_id) {
      await ensureInterview(data.interview_id);

      const event: InterviewEvent = {
        event_id: data.event_id || randomUUID(),
        interview_id: data.interview_id,
        event_type: data.type || 'ERROR',
        source: inferSource(data.type),
        occurred_at: data.timestamp
          ? new Date(data.timestamp).toISOString()
          : new Date().toISOString(),
        state_version: data.state_version,
        payload: extractPayload(data),
      };

      const result = await appendEvent(event);
      return NextResponse.json({ success: true, persisted: result.ok, deduped: result.deduped });
    }

    // No interview_id yet (legacy path) — accept the event but don't persist.
    return NextResponse.json({ success: true, persisted: false, reason: 'no_interview_id' });
  } catch (err) {
    console.error('[logger] failed:', err);
    return NextResponse.json({ error: 'Failed to parse event' }, { status: 400 });
  }
}

function inferSource(type?: string): InterviewEvent['source'] {
  if (!type) return 'orchestrator';
  if (type.startsWith('AGORA') || type === 'METRICS' || type === 'AGENT_STATE_CHANGED')
    return 'agora';
  if (type.startsWith('TRANSCRIPT') || type === 'INTERRUPTED') return 'candidate';
  if (type.startsWith('CODE') || type === 'TEST_RESULT') return 'code';
  if (type.startsWith('MCP')) return 'mcp';
  if (type.startsWith('ASSESSMENT')) return 'assessment';
  return 'orchestrator';
}

function extractPayload(data: Record<string, unknown>): Record<string, unknown> {
  // Strip envelope/control fields; keep the event-specific body.
  const {
    type: _t,
    timestamp: _ts,
    interview_id: _iid,
    interviewId: _iid2,
    event_id: _eid,
    state_version: _sv,
    currentState: _cs,
    activeRole: _ar,
    recentTranscript: _rt,
    restAgentId: _rid,
    agentUID: _auid,
    ...rest
  } = data;
  return rest;
}
