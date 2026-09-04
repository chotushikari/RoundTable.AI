import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { constantTimeTextEqual } from '@/lib/security';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new Error('CRON_SECRET is required');
    const authorization = request.headers.get('authorization') ?? '';
    if (!constantTimeTextEqual(authorization, `Bearer ${secret}`)) throw new Error('Invalid cron authentication');
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error('Supabase is required for retention cleanup');
    const { data, error } = await admin.rpc('purge_expired_interview_data');
    if (error) throw new Error(`Retention cleanup failed: ${error.message}`);
    return NextResponse.json({ deletedSessions: data, completedAt: new Date().toISOString() });
  } catch (error) {
    return apiError(error, 'Retention cleanup failed');
  }
}
