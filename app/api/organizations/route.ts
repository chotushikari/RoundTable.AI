import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/http';
import { requireSupabaseUser } from '@/lib/supabase-admin';

const OrganizationSchema = z.object({ name: z.string().trim().min(2).max(160) });

export async function POST(request: Request) {
  try {
    const body = OrganizationSchema.parse(await request.json());
    const { userId, admin } = await requireSupabaseUser(request);
    const id = request.headers.get('x-demo-organization-id') ?? randomUUID();
    if (admin) {
      const { error: orgError } = await admin.from('organizations').insert({ id, name: body.name });
      if (orgError) throw new Error(`Organization creation failed: ${orgError.message}`);
      const { error: memberError } = await admin.from('memberships').insert({ organization_id: id, user_id: userId, role: 'owner' });
      if (memberError) throw new Error(`Membership creation failed: ${memberError.message}`);
    }
    return NextResponse.json({ organization: { id, name: body.name } }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Failed to create organization');
  }
}
