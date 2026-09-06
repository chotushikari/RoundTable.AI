import { getServiceClient, isDbConfigured } from './supabase';
import {
  CandidateState,
  CandidateStateSchema,
  InterviewEvent,
  initialCandidateState,
} from '@/lib/interview/types';

/**
 * Data-access layer for the interview engine.
 * All functions degrade gracefully when the DB is not configured, so the
 * live voice path never crashes just because persistence is unavailable.
 */

// ── Events (append-only, idempotent by (interview_id, event_id)) ──
export async function appendEvent(
  event: InterviewEvent,
): Promise<{ ok: boolean; deduped?: boolean; error?: string }> {
  if (!isDbConfigured()) return { ok: false, error: 'db_not_configured' };
  const db = getServiceClient();

  const { error } = await db.from('interview_events').insert({
    interview_id: event.interview_id,
    event_id: event.event_id,
    sequence: event.sequence ?? null,
    event_type: event.event_type,
    source: event.source,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    state_version: event.state_version ?? null,
    payload: event.payload ?? {},
  });

  if (error) {
    // 23505 = unique_violation → duplicate event_id, safe to ignore (idempotent)
    if (error.code === '23505') return { ok: true, deduped: true };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listEvents(interviewId: string): Promise<InterviewEvent[]> {
  if (!isDbConfigured()) return [];
  const db = getServiceClient();
  const { data, error } = await db
    .from('interview_events')
    .select('*')
    .eq('interview_id', interviewId)
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data as unknown as InterviewEvent[];
}

/** Most recent event of a given type for an interview (newest by row id). */
export async function getLatestEventOfType(
  interviewId: string,
  eventType: string,
): Promise<InterviewEvent | null> {
  if (!isDbConfigured()) return null;
  const db = getServiceClient();
  const { data, error } = await db
    .from('interview_events')
    .select('*')
    .eq('interview_id', interviewId)
    .eq('event_type', eventType)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as InterviewEvent;
}

// ── Candidate state (versioned; latest = max version) ──
export async function getLatestState(
  interviewId: string,
): Promise<CandidateState | null> {
  if (!isDbConfigured()) return null;
  const db = getServiceClient();
  const { data, error } = await db
    .from('candidate_state')
    .select('*')
    .eq('interview_id', interviewId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const parsed = CandidateStateSchema.safeParse({
    interview_id: data.interview_id,
    version: data.version,
    phase: data.phase ?? 'warm',
    active_role: data.active_role ?? 'technical',
    competency_signals: data.competency_signals ?? {},
    challenge_vector: data.challenge_vector ?? {},
    open_gaps: data.open_gaps ?? [],
    covered_topics: data.covered_topics ?? [],
    last_action: data.last_action ?? null,
    time_budget_remaining: data.time_budget_remaining ?? null,
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Persist a NEW version of candidate state. Rows are immutable; we insert
 * version = prev + 1. Returns the written state (with its new version).
 */
export async function saveNewStateVersion(
  next: Omit<CandidateState, 'version'>,
): Promise<CandidateState | null> {
  if (!isDbConfigured()) return null;
  const db = getServiceClient();

  const latest = await getLatestState(next.interview_id);
  const version = (latest?.version ?? -1) + 1;

  const row = {
    interview_id: next.interview_id,
    version,
    phase: next.phase,
    active_role: next.active_role,
    competency_signals: next.competency_signals,
    challenge_vector: next.challenge_vector,
    open_gaps: next.open_gaps,
    covered_topics: next.covered_topics,
    last_action: next.last_action ?? null,
    time_budget_remaining: next.time_budget_remaining ?? null,
  };

  const { error } = await db.from('candidate_state').insert(row);
  if (error) {
    console.error('[repository] saveNewStateVersion failed:', error.message);
    return null;
  }
  return { ...next, version } as CandidateState;
}

/** Ensure an interview row + an initial state exist. Safe to call repeatedly. */
export async function ensureInterview(interviewId: string): Promise<void> {
  if (!isDbConfigured()) return;
  const db = getServiceClient();

  await db
    .from('interviews')
    .upsert({ id: interviewId }, { onConflict: 'id', ignoreDuplicates: true });

  const latest = await getLatestState(interviewId);
  if (!latest) {
    const init = initialCandidateState(interviewId);
    await saveNewStateVersion(init);
  }
}
