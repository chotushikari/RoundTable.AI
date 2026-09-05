import { NextResponse } from 'next/server';
import { requireCandidateSession } from '@/lib/api-auth';
import { createAgoraToken } from '@/lib/agora-server';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireCandidateSession(request, id);
    if (!['ready', 'starting', 'in_progress'].includes(session.status)) throw new Error('Session is not available to resume');
    const version = await interviewStore.getInterviewVersion(session.interviewVersionId);
    if (!version) throw new Error('Published interview plan not found');
    const generated = createAgoraToken(session.channelName, session.rtcUid);
    return NextResponse.json({
      sessionId: session.id,
      channel: session.channelName,
      rtcToken: generated.token,
      rtmToken: generated.token,
      token: generated.token,
      rtcUid: session.rtcUid,
      uid: session.rtcUid,
      agentUid: session.agentUid,
      agentId: session.agoraAgentId,
      expiresAt: generated.expiresAt,
      interviewEndsAt: new Date(
        Date.parse(session.startedAt) + version.definition.durationMinutes * 60_000,
      ).toISOString(),
    });
  } catch (error) {
    return apiError(error, 'Failed to resume interview session');
  }
}
