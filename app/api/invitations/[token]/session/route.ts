import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAgoraChannel, createAgoraRtcUid, createAgoraToken } from '@/lib/agora-server';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { candidateCookieName, createCandidateGrant, createOpaqueToken, hashToken } from '@/lib/security';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { CompetencyState, InterviewSessionRecord } from '@/types/interview';
import { DEFAULT_CHALLENGE_VECTOR } from '@/types/interview';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { DEMO_OPENING_QUESTION, demoRoles } from '@/lib/interview-demo';

const StartSchema = z.object({
  consent: z.literal(true),
  candidateName: z.string().trim().min(1).max(160).optional(),
  resumeText: z.string().max(30_000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const body = StartSchema.parse(await request.json());
    const { token } = await params;
    let invitation = await interviewStore.getInvitationByTokenHash(hashToken(token));
    if (!invitation || invitation.revokedAt) throw new Error('Invitation not found or revoked');
    if (Date.parse(invitation.expiresAt) <= Date.now()) throw new Error('Invitation has expired');
    if (invitation.claimedAt) throw new Error('Invitation has already been used');
    const version = await interviewStore.getInterviewVersion(invitation.interviewVersionId);
    if (!version) throw new Error('Interview version not found');

    if (body.resumeText?.trim()) {
      const admin = getSupabaseAdmin();
      if (admin) {
        const path = `${invitation.organizationId}/${invitation.id}/resume.txt`;
        const { error } = await admin.storage.from('candidate-resumes').upload(
          path,
          new Blob([body.resumeText], { type: 'text/plain;charset=utf-8' }),
          { upsert: false },
        );
        if (error) throw new Error(`Resume upload failed: ${error.message}`);
        invitation = await interviewStore.setInvitationResumePath(invitation.id, path);
      }
    }

    const id = randomUUID();
    const rtcUid = createAgoraRtcUid();
    const channelName = createAgoraChannel(id);
    const llmToken = createOpaqueToken();
    const startedAt = new Date().toISOString();
    const expiresAt = new Date(
      Math.min(Date.parse(invitation.expiresAt), Date.now() + (version.definition.durationMinutes + 60) * 60_000),
    ).toISOString();
    const competencyState: CompetencyState = Object.fromEntries(
      version.plan.competencies.map((competency) => [competency.id, {
        rating: null,
        confidence: 0,
        evidenceCount: 0,
        highConfidenceStreak: 0,
        lowConfidenceStreak: 0,
        difficulty: 3,
      }]),
    );
    const sessionInput: InterviewSessionRecord = {
      id,
      invitationId: invitation.id,
      interviewId: invitation.interviewId,
      interviewVersionId: invitation.interviewVersionId,
      organizationId: invitation.organizationId,
      status: 'ready',
      connectionHealth: 'unknown',
      channelName,
      rtcUid,
      agentUid: String(DEFAULT_AGENT_UID),
      agoraAgentId: null,
      llmTokenHash: hashToken(llmToken),
      activeRole: version.definition.demoMode ? demoRoles(version.definition.panelRoles)[0] : version.definition.panelRoles[0],
      previousRole: null,
      consecutiveRoleTurns: 0,
      currentModality: 'voice',
      phase: version.definition.demoMode ? 'background' : 'introduction',
      competencyState,
      askedMustAsk: [],
      coveredTopics: [],
      pendingQuestion: version.definition.demoMode ? DEMO_OPENING_QUESTION : null,
      stateVersion: 0,
      toolRunCount: 0,
      accumulatedContradictions: [],
      challengeVector: DEFAULT_CHALLENGE_VECTOR,
      startedAt,
      completedAt: null,
      expiresAt,
    };

    const tokenData = createAgoraToken(channelName, rtcUid);
    await interviewStore.createSession(invitation, sessionInput);
    await interviewStore.appendEvent(id, 'session.created', {
      consent: true,
      resumeProvided: Boolean(body.resumeText),
      candidateNameProvided: Boolean(body.candidateName),
    }).catch((eventError) => console.error('[session] failed to append creation event', eventError));
    const interviewEndsAt = new Date(Date.parse(startedAt) + version.definition.durationMinutes * 60_000).toISOString();
    const response = NextResponse.json({
      sessionId: id,
      channel: channelName,
      rtcToken: tokenData.token,
      rtmToken: tokenData.token,
      token: tokenData.token,
      rtcUid,
      uid: rtcUid,
      agentUid: String(DEFAULT_AGENT_UID),
      agentId: null,
      expiresAt: tokenData.expiresAt,
      interviewEndsAt,
    }, { status: 201 });
    const feedbackAccessExpiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
    response.cookies.set(candidateCookieName(), createCandidateGrant(id, feedbackAccessExpiresAt), {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(feedbackAccessExpiresAt),
      path: '/',
    });
    return response;
  } catch (error) {
    return apiError(error, 'Failed to start interview session');
  }
}
