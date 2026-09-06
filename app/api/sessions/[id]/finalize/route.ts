import { NextResponse } from 'next/server';
import { requireCandidateSession } from '@/lib/api-auth';
import { stopInterviewAgent } from '@/lib/agora-server';
import { finalizeSessionAssessment } from '@/lib/assessment';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireCandidateSession(request, id);
    if (session.agoraAgentId && !['completed', 'assessing'].includes(session.status)) {
      await stopInterviewAgent(session.agoraAgentId);
      const fresh = (await interviewStore.getSession(id)) ?? session;
      await interviewStore.updateSession(id, {
        status: 'assessing',
        stateVersion: fresh.stateVersion + 1,
      }, fresh.stateVersion);
    }
    await finalizeSessionAssessment(id);
    return NextResponse.json({ success: true, status: 'completed', humanReviewRequired: true });
  } catch (error) {
    return apiError(error, 'Failed to finalize interview');
  }
}
