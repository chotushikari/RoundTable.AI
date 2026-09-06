import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chooseNextDecision,
  classifyCandidateConversationControl,
  demoQuestionForRole,
  updateCompetencyState,
  validateEvidence,
} from '@/lib/interview-controller';
import { buildFallbackPlan } from '@/lib/interview-planner';
import type { InterviewDefinitionRecord, InterviewSessionRecord, PanelRole, PanelTurnAnalysis, TurnAnalysisRecord } from '@/types/interview';
import { DEFAULT_CHALLENGE_VECTOR } from '@/types/interview';

const interview: InterviewDefinitionRecord = {
  id: '00000000-0000-4000-8000-000000000010',
  organizationId: '00000000-0000-4000-8000-000000000011',
  title: 'Backend interview',
  roleTitle: 'Backend Engineer',
  jdText: 'Design and deliver reliable TypeScript services while collaborating with product partners and measuring customer outcomes.',
  desiredOutcomes: ['technical depth'],
  panelRoles: ['technical', 'product', 'hiring_manager'],
  mustAskQuestions: [],
  mustCoverTopics: [],
  durationMinutes: 30,
  instructions: '',
  status: 'ready',
  plan: null,
  planVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const plan = buildFallbackPlan(interview);
interview.plan = plan;

function session(overrides: Partial<InterviewSessionRecord> = {}): InterviewSessionRecord {
  return {
    id: '00000000-0000-4000-8000-000000000020',
    invitationId: '00000000-0000-4000-8000-000000000021',
    interviewId: interview.id,
    interviewVersionId: '00000000-0000-4000-8000-000000000022',
    organizationId: interview.organizationId,
    status: 'in_progress',
    connectionHealth: 'connected',
    channelName: 'channel',
    rtcUid: '1234',
    agentUid: '123456',
    agoraAgentId: 'agent',
    llmTokenHash: 'a'.repeat(64),
    activeRole: 'technical',
    previousRole: null,
    consecutiveRoleTurns: 1,
    currentModality: 'voice',
    phase: 'panel',
    competencyState: {},
    askedMustAsk: [],
    coveredTopics: [],
    pendingQuestion: null,
    stateVersion: 0,
    toolRunCount: 0,
    accumulatedContradictions: [],
    challengeVector: DEFAULT_CHALLENGE_VECTOR,
    startedAt: new Date().toISOString(),
    completedAt: null,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

function analysis(overrides: Partial<PanelTurnAnalysis> = {}): PanelTurnAnalysis {
  return {
    roleFindings: [
      { role: 'technical', observations: [], strengths: [], gaps: [] },
      { role: 'product', observations: [], strengths: [], gaps: [] },
      { role: 'hiring_manager', observations: [], strengths: [], gaps: [] },
    ],
    competencyEvidence: [],
    vague: false,
    vagueReason: '',
    contradictions: [],
    recommendedDifficultyDelta: 0,
    recommendedRole: 'technical',
    recommendedObjective: 'Probe the implementation',
    recommendedModality: 'voice',
    addressedTopics: [],
    toolRequest: null,
    ...overrides,
  };
}

function priorRole(role: PanelRole): TurnAnalysisRecord {
  return {
    id: crypto.randomUUID(),
    sessionId: session().id,
    turnId: crypto.randomUUID(),
    analysis: analysis(),
    decision: {
      activeSpeakerRole: role,
      objective: 'Prior question',
      modality: 'voice',
      difficulty: 3,
      reasonCode: 'panel_coverage',
      remainingCoverage: [],
      roleHandoff: true,
    },
    responseText: 'Prior question',
    model: 'test',
    createdAt: new Date().toISOString(),
  };
}

test('technical evidence with a product gap hands the next turn to Product', () => {
  const result = chooseNextDecision({
    session: session(), interview, plan, priorAnalyses: [],
    analysis: analysis({ roleFindings: [
      { role: 'technical', observations: [], strengths: ['Correct implementation'], gaps: [] },
      { role: 'product', observations: [], strengths: [], gaps: ['No customer impact'] },
      { role: 'hiring_manager', observations: [], strengths: [], gaps: [] },
    ] }),
  });
  assert.equal(result.activeSpeakerRole, 'product');
  assert.equal(result.reasonCode, 'cross_functional_gap');
});

test('vague answers receive clarification priority', () => {
  const result = chooseNextDecision({ session: session(), interview, plan, priorAnalyses: [], analysis: analysis({ vague: true, vagueReason: 'No example' }) });
  assert.equal(result.reasonCode, 'clarify_vague');
  assert.equal(result.activeSpeakerRole, 'technical');
});

test('two consistent high-confidence signals raise difficulty by only one', () => {
  const first = updateCompetencyState({}, plan, analysis({ competencyEvidence: [{ competencyId: 'technical_execution', rating: 4, confidence: 0.9, quote: 'implemented' }] }));
  const second = updateCompetencyState(first, plan, analysis({ competencyEvidence: [{ competencyId: 'technical_execution', rating: 4, confidence: 0.9, quote: 'tested' }] }));
  assert.equal(first.technical_execution.difficulty, 3);
  assert.equal(second.technical_execution.difficulty, 4);
});

test('unsupported model quotes and contradictions are discarded', () => {
  const current = 'I implemented the cache and measured latency.';
  const result = validateEvidence(analysis({
    competencyEvidence: [{ competencyId: 'technical_execution', rating: 4, confidence: 0.9, quote: 'invented quote' }],
    contradictions: [{ priorQuote: 'never shipped', currentQuote: 'invented quote', explanation: 'conflict' }],
  }), current, [], interview.panelRoles);
  assert.equal(result.competencyEvidence[0].rating, null);
  assert.equal(result.contradictions.length, 0);
});

test('a role rotates after two consecutive non-clarification questions', () => {
  const result = chooseNextDecision({ session: session({ consecutiveRoleTurns: 2 }), interview, plan, priorAnalyses: [], analysis: analysis() });
  assert.notEqual(result.activeSpeakerRole, 'technical');
});

test('mandatory questions are selected once before ordinary rotation', () => {
  const withRequired = { ...interview, mustAskQuestions: ['Explain how you diagnose a production incident.'] };
  const result = chooseNextDecision({ session: session(), interview: withRequired, plan, priorAnalyses: [], analysis: analysis() });
  assert.equal(result.reasonCode, 'must_ask');
  assert.equal(result.objective, withRequired.mustAskQuestions[0]);
});

test('brief pause and repeat requests are handled as conversation controls', () => {
  assert.equal(classifyCandidateConversationControl('Wait, let me think.'), 'pause');
  assert.equal(classifyCandidateConversationControl('Could you repeat the question?'), 'repeat');
  assert.equal(classifyCandidateConversationControl("I'm ready"), 'repeat');
  assert.equal(classifyCandidateConversationControl('I waited for the cache and then measured latency because the database was slow.'), null);
});

test('the interview starts with background before role-specific panel questions', () => {
  const result = chooseNextDecision({
    session: session({ phase: 'introduction', consecutiveRoleTurns: 0 }),
    interview,
    plan,
    priorAnalyses: [],
    analysis: analysis({ vague: true }),
  });
  assert.equal(result.reasonCode, 'background');
  assert.equal(result.activeSpeakerRole, 'hiring_manager');
});

test('two-minute demo rotates through every configured panel role', () => {
  const demoInterview = {
    ...interview,
    durationMinutes: 2,
    panelRoles: ['hiring_manager', 'technical', 'product', 'customer', 'behavioral'] as PanelRole[],
  };
  const afterBackground = chooseNextDecision({
    session: session({ phase: 'background', activeRole: 'hiring_manager' }),
    interview: demoInterview,
    plan,
    priorAnalyses: [priorRole('hiring_manager')],
    analysis: analysis({ vague: true }),
  });
  assert.equal(afterBackground.activeSpeakerRole, 'technical');
  assert.equal(afterBackground.reasonCode, 'panel_coverage');

  const afterTechnical = chooseNextDecision({
    session: session({ phase: 'panel', activeRole: 'technical' }),
    interview: demoInterview,
    plan,
    priorAnalyses: [priorRole('hiring_manager'), priorRole('technical')],
    analysis: analysis({ vague: true }),
  });
  assert.equal(afterTechnical.activeSpeakerRole, 'product');
  assert.equal(afterTechnical.reasonCode, 'panel_coverage');

  const afterProduct = chooseNextDecision({
    session: session({ phase: 'panel', activeRole: 'product' }),
    interview: demoInterview,
    plan,
    priorAnalyses: [priorRole('hiring_manager'), priorRole('technical'), priorRole('product')],
    analysis: analysis({ vague: true }),
  });
  assert.equal(afterProduct.activeSpeakerRole, 'customer');
  assert.equal(afterProduct.reasonCode, 'panel_coverage');

  const afterCustomer = chooseNextDecision({
    session: session({ phase: 'panel', activeRole: 'customer' }),
    interview: demoInterview,
    plan,
    priorAnalyses: [priorRole('hiring_manager'), priorRole('technical'), priorRole('product'), priorRole('customer')],
    analysis: analysis({
      vague: true,
      contradictions: [{
        priorTurnId: crypto.randomUUID(),
        priorQuote: 'I owned the service.',
        currentQuote: 'I did not own the service.',
        explanation: 'Ownership changed.',
      }],
    }),
  });
  assert.equal(afterCustomer.activeSpeakerRole, 'behavioral');
  assert.equal(afterCustomer.reasonCode, 'panel_coverage');
});

test('two-minute role prompts are short and include product impact and customer role-play', () => {
  const roles: PanelRole[] = ['hiring_manager', 'technical', 'product', 'customer', 'behavioral'];
  for (const role of roles) {
    assert.ok(demoQuestionForRole(role).split(/\s+/).length <= 15, `${role} prompt is too long`);
  }
  assert.match(demoQuestionForRole('product'), /customer|business/i);
  assert.match(demoQuestionForRole('customer'), /as the customer/i);
});

test('showcase Product prompt adapts to missing versus supplied customer impact', () => {
  const missing = demoQuestionForRole('product', analysis({ roleFindings: [
    { role: 'technical', observations: [], strengths: ['Implementation explained'], gaps: [] },
    { role: 'product', observations: [], strengths: [], gaps: ['No customer outcome'] },
  ] }));
  const supplied = demoQuestionForRole('product', analysis());
  assert.match(missing, /Which customer outcome/);
  assert.match(supplied, /verify.*caused/);
  assert.notEqual(missing, supplied);
});

test('two consistent low-confidence performance signals lower difficulty by only one', () => {
  const evidence = { competencyId: 'technical_execution', rating: 1 as const, confidence: 0.85, quote: 'I was unsure' };
  const first = updateCompetencyState({}, plan, analysis({ competencyEvidence: [evidence] }));
  const second = updateCompetencyState(first, plan, analysis({ competencyEvidence: [evidence] }));
  assert.equal(first.technical_execution.difficulty, 3);
  assert.equal(second.technical_execution.difficulty, 2);
});
