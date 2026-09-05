import { NextResponse } from 'next/server';
import { getServiceClient, isDbConfigured } from '@/lib/db/supabase';

/**
 * DB health check. GET /api/health/db
 * Confirms the schema is reachable with the service role key.
 * Returns 200 only when all core tables respond.
 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: 'Supabase env not set' },
      { status: 503 },
    );
  }

  const db = getServiceClient();
  const tables = [
    'interviews',
    'interview_events',
    'candidate_state',
    'evidence',
    'contradictions',
    'assessments',
  ];

  const results: Record<string, boolean> = {};
  for (const t of tables) {
    const { error } = await db.from(t).select('*', { count: 'exact', head: true });
    results[t] = !error;
  }

  const ok = Object.values(results).every(Boolean);
  return NextResponse.json({ ok, configured: true, tables: results }, {
    status: ok ? 200 : 500,
  });
}
