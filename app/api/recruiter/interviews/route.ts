import { NextResponse } from 'next/server';
import { getServiceClient, isDbConfigured } from '@/lib/db/supabase';

/**
 * GET /api/recruiter/interviews
 * Lists interviews with a lightweight summary for the recruiter dashboard.
 * Read-only; uses the service client (server-only). Degrades to an empty list
 * when the DB isn't configured so the UI can still render its empty state.
 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, configured: false, interviews: [] });
  }

  const db = getServiceClient();

  // Pull recent interviews. The candidate_state latest version gives us phase +
  // active role without replaying events.
  const { data: interviews, error } = await db
    .from('interviews')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !interviews) {
    return NextResponse.json(
      { ok: false, configured: true, error: error?.message ?? 'query_failed', interviews: [] },
      { status: 500 },
    );
  }

  // For each interview, fetch its latest state (max version) in parallel.
  const summaries = await Promise.all(
    interviews.map(async (row) => {
      const { data: state } = await db
        .from('candidate_state')
        .select('version, phase, active_role, competency_signals, updated_at, created_at')
        .eq('interview_id', row.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await db
        .from('interview_events')
        .select('*', { count: 'exact', head: true })
        .eq('interview_id', row.id);

      // Overall belief = mean belief across competencies (rough headline number).
      let avgBelief: number | null = null;
      let avgConfidence: number | null = null;
      const signals = (state?.competency_signals ?? {}) as Record<
        string,
        { belief?: number; confidence?: number }
      >;
      const vals = Object.values(signals);
      if (vals.length) {
        avgBelief =
          vals.reduce((s, v) => s + (v.belief ?? 0), 0) / vals.length;
        avgConfidence =
          vals.reduce((s, v) => s + (v.confidence ?? 0), 0) / vals.length;
      }

      return {
        id: row.id,
        created_at: row.created_at,
        phase: state?.phase ?? 'warm',
        active_role: state?.active_role ?? 'technical',
        version: state?.version ?? 0,
        event_count: count ?? 0,
        avg_belief: avgBelief,
        avg_confidence: avgConfidence,
      };
    }),
  );

  return NextResponse.json({ ok: true, configured: true, interviews: summaries });
}
