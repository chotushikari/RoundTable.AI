import { NextResponse } from 'next/server';
import { interviewStore } from '@/lib/interview-store';
import { requireCompanyContext } from '@/lib/supabase-admin';
import { apiError } from '@/lib/http';
import { InterviewCreateSchema } from '@/types/interview';

export async function GET(request: Request) {
  try {
    const company = await requireCompanyContext(request);
    return NextResponse.json({ organizationId: company.organizationId, interviews: await interviewStore.listInterviews(company.organizationId) });
  } catch (error) {
    return apiError(error, 'Failed to list interviews');
  }
}

export async function POST(request: Request) {
  try {
    const company = await requireCompanyContext(request);
    const raw = (await request.json()) as Record<string, unknown>;
    const input = InterviewCreateSchema.parse({
      ...raw,
      title: raw.title ?? (typeof raw.roleTitle === 'string' ? `${raw.roleTitle} Interview` : undefined),
    });
    const interview = await interviewStore.createInterview(company.organizationId, input);
    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Failed to create interview');
  }
}
