import { NextResponse } from 'next/server';
import { requireCandidateSession } from '@/lib/api-auth';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { requireCompanyContext } from '@/lib/supabase-admin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await interviewStore.getSession(id);
    if (!session) throw new Error('Session not found');
    if (request.headers.get('authorization')) {
      const company = await requireCompanyContext(request);
      if (session.organizationId !== company.organizationId) throw new Error('Session not found');
      const base = {
        id: session.id,
        status: session.status,
        health: session.status === 'failed' ? 'error' : session.connectionHealth,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      };
      if (session.status !== 'completed') return NextResponse.json({ session: base });
      const [transcript, assessment, artifacts, toolRuns, events] = await Promise.all([
        interviewStore.listTurns(id),
        interviewStore.getAssessment(id),
        Promise.all([interviewStore.getArtifact(id, 'code'), interviewStore.getArtifact(id, 'canvas')]),
        interviewStore.listToolRuns(id),
        interviewStore.listEvents(id),
      ]);
      return NextResponse.json({ session: base, transcript, assessment, artifacts, toolRuns, events });
    }

    await requireCandidateSession(request, id);
    const assessment = await interviewStore.getAssessment(id);
    return NextResponse.json({
      session: {
        id,
        status: session.status,
        completedAt: session.completedAt,
        activeRole: session.activeRole,
        currentModality: session.currentModality,
      },
      feedback: assessment?.releasedAt ? assessment.assessment.candidateSummary : null,
      feedbackReleasedAt: assessment?.releasedAt ?? null,
      humanReviewRequired: true,
    });
  } catch (error) {
    return apiError(error, 'Failed to load interview session');
  }
}
