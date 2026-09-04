import { NextResponse } from 'next/server';
import { requireCandidateSession } from '@/lib/api-auth';
import { createAgoraToken } from '@/lib/agora-server';
import { apiError } from '@/lib/http';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireCandidateSession(request, id);
    if (!['ready', 'in_progress'].includes(session.status)) throw new Error('Session is not active');
    const generated = createAgoraToken(session.channelName, session.rtcUid);
    return NextResponse.json({ rtcToken: generated.token, rtmToken: generated.token, expiresAt: generated.expiresAt });
  } catch (error) {
    return apiError(error, 'Failed to renew session tokens');
  }
}
