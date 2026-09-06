import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db/supabase';
import { getLatestState, listEvents } from '@/lib/db/repository';

/**
 * GET /api/recruiter/interviews/:id
 * Full read for the Control Room: latest candidate state + the event stream,
 * plus a distilled timeline of NEXT_ACTION_SELECTED (the "why this question"
 * decisions) and transcript finals. Read-only, server-only.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: true, configured: false, interview_id: id, state: null, events: [], decisions: [], transcript: [] },
    );
  }

  const [state, events] = await Promise.all([
    getLatestState(id),
    listEvents(id),
  ]);

  // Decisions: every NEXT_ACTION_SELECTED, newest last — the spine of the timeline.
  const decisions = events
    .filter((e) => e.event_type === 'NEXT_ACTION_SELECTED')
    .map((e) => ({
      occurred_at: e.occurred_at ?? null,
      sequence: e.sequence ?? null,
      ...(e.payload as Record<string, unknown>),
    }));

  // Transcript finals in order.
  const transcript = events
    .filter((e) => e.event_type === 'TRANSCRIPT_FINAL')
    .map((e) => ({
      occurred_at: e.occurred_at ?? null,
      ...(e.payload as Record<string, unknown>),
    }));

  return NextResponse.json({
    ok: true,
    configured: true,
    interview_id: id,
    state,
    decisions,
    transcript,
    event_count: events.length,
  });
}
