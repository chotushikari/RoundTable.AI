import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCandidateSession } from '@/lib/api-auth';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { analyzeLivenessClip, type LivenessChallenge } from '@/lib/liveness';

export const maxDuration = 60;

const BodySchema = z.object({
  challengeId: z.string().uuid(),
  mimeType: z.enum(['video/webm', 'video/mp4']),
  videoBase64: z.string().min(1).max(3_500_000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireCandidateSession(request, id);
    if (!['ready', 'in_progress'].includes(session.status)) throw new Error('Liveness check is only available during an active interview');
    const body = BodySchema.parse(await request.json());
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body.videoBase64)) throw new Error('Invalid liveness video data');
    const events = await interviewStore.listEvents(id);
    if (events.filter((event) => event.type === 'liveness.review').length >= 2) throw new Error('Maximum liveness attempts reached');
    const challengeEvent = [...events].reverse().find((event) => event.type === 'liveness.challenge' && event.payload.id === body.challengeId);
    if (!challengeEvent) throw new Error('Invalid liveness challenge');
    const challenge = challengeEvent.payload as unknown as LivenessChallenge;
    if (Date.parse(challenge.expiresAt) <= Date.now()) throw new Error('Liveness challenge expired');
    const result = await analyzeLivenessClip({ videoBase64: body.videoBase64, mimeType: body.mimeType, challenge });
    await interviewStore.appendEvent(id, 'liveness.review', {
      challengeId: challenge.id,
      status: result.status,
      reason: result.reason,
      reviewedAt: new Date().toISOString(),
      humanReviewOnly: true,
      rawVideoStored: false,
    });
    return NextResponse.json({ ...result, humanReviewOnly: true, rawVideoStored: false });
  } catch (error) {
    return apiError(error, 'Could not review liveness clip');
  }
}
