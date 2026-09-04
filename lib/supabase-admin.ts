import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null | undefined;

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in production',
      );
    }
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export async function requireCompanyContext(request: Request): Promise<{
  userId: string;
  organizationId: string;
}> {
  const { userId, admin } = await requireSupabaseUser(request);

  if (!admin) {
    return {
      userId,
      organizationId:
        request.headers.get('x-demo-organization-id') ??
        '00000000-0000-4000-8000-000000000002',
    };
  }

  const { data: membership, error: membershipError } = await admin
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  if (membershipError || !membership) {
    throw new Error('Company membership is required');
  }

  return {
    userId,
    organizationId: String(membership.organization_id),
  };
}

export async function requireSupabaseUser(request: Request): Promise<{
  userId: string;
  admin: SupabaseClient | null;
}> {
  const admin = getSupabaseAdmin();
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null;

  if (!admin) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase is not configured');
    }
    return { userId: '00000000-0000-4000-8000-000000000001', admin: null };
  }

  if (!token) throw new Error('Company authentication is required');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid company session');

  return { userId: data.user.id, admin };
}
