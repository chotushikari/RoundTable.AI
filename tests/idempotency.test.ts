import assert from 'node:assert/strict';
import test from 'node:test';
import { processCandidateTurn } from '@/lib/interview-controller';
import { buildFallbackPlan } from '@/lib/interview-planner';
import { interviewStore, resetMemoryStoreForTests } from '@/lib/interview-store';
import type { InterviewSessionRecord } from '@/types/interview';

test('duplicate Agora LLM requests reuse one reserved turn and cached response', async () => {
  resetMemoryStoreForTests();
  delete process.env.GEMINI_API_KEY;
  const organizationId = crypto.randomUUID();
  const interview = await interviewStore.createInterview(organizationId, {
    title: 'Idempotency interview',
    roleTitle: 'Backend Engineer',
    jdText: 'Build reliable TypeScript APIs, reason about system constraints, and connect engineering work to measurable customer outcomes.',
    desiredOutcomes: ['Reliable delivery'],
    panelRoles: ['technical', 'product'],
    mustAskQuestions: [],
    mustCoverTopics: [],
    durationMinutes: 30,
    instructions: '',
  });
  const planned = await interviewStore.setInterviewPlan(interview.id, organizationId, buildFallbackPlan(interview));
  const version = await interviewStore.createInterviewVersion(planned);
  const invitation = await interviewStore.createInvitation({
    id: crypto.randomUUID(),
    interviewId: interview.id,
    interviewVersionId: version.id,
    organizationId,
    tokenHash: 'b'.repeat(64),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    revokedAt: null,
    claimedAt: null,
    candidateName: null,
    candidateEmail: null,
    resumePath: null,
    createdAt: new Date().toISOString(),
  });
  const session: InterviewSessionRecord = {
    id: crypto.randomUUID(),
    invitationId: invitation.id,
    interviewId: interview.id,
    interviewVersionId: version.id,
    organizationId,
    status: 'in_progress',
    connectionHealth: 'connected',
    channelName: 'idempotency-channel',
    rtcUid: '2001',
    agentUid: '123456',
    agoraAgentId: 'agent',
    llmTokenHash: 'c'.repeat(64),
    activeRole: 'technical',
    previousRole: null,
    consecutiveRoleTurns: 0,
    currentModality: 'voice',
    competencyState: {},
    askedMustAsk: [],
    coveredTopics: [],
    pendingQuestion: null,
    stateVersion: 0,
    toolRunCount: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  await interviewStore.createSession(invitation, session);
  const args = {
    session,
    answer: 'I implemented a typed cache API because latency was high, added tests, and reduced p95 latency by 35 percent.',
    upstreamTurnId: 'same-agora-request',
  };
  const first = await processCandidateTurn(args);
  const second = await processCandidateTurn(args);
  assert.equal(second.id, first.id);
  assert.equal((await interviewStore.listAnalyses(session.id)).length, 1);
  assert.equal((await interviewStore.listTurns(session.id)).length, 2);
  assert.equal((await interviewStore.getSession(session.id))?.stateVersion, 1);
});
