import { NextResponse } from 'next/server';
import { requireCandidateSession } from '@/lib/api-auth';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { createLivenessChallenge } from '@/lib/liveness';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireCandidateSession(request, id);
    if (!['ready', 'in_progress'].includes(session.status)) throw new Error('Liveness check is only available during an active interview');
    const challenge = createLivenessChallenge();
    await interviewStore.appendEvent(id, 'liveness.challenge', challenge);
    return NextResponse.json({ challenge });
  } catch (error) {
    return apiError(error, 'Could not create liveness challenge');
  }
}
