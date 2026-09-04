import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { requireCompanyContext } from '@/lib/supabase-admin';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const company = await requireCompanyContext(request);
    const session = await interviewStore.getSession(id);
    if (!session || session.organizationId !== company.organizationId) throw new Error('Session not found');
    if (session.status !== 'completed') throw new Error('Assessment can be released only after completion');
    const assessment = await interviewStore.releaseAssessment(id);
    return NextResponse.json({ releasedAt: assessment.releasedAt });
  } catch (error) {
    return apiError(error, 'Failed to release candidate feedback');
  }
}
