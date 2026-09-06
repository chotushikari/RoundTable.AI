import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEvidenceAssessment, generateFinalAssessment } from '@/lib/assessment';
import { ASSESSMENT_PROMPT_BYTES, applyAssessmentNarratives, buildAssessmentPacket } from '@/lib/assessment-prompt';
import { buildFallbackPlan } from '@/lib/interview-planner';
import type { ArtifactVersionRecord, InterviewDefinitionRecord, PanelRole, TranscriptTurnRecord, TurnAnalysisRecord } from '@/types/interview';

const interview: InterviewDefinitionRecord = {
  id: crypto.randomUUID(), organizationId: crypto.randomUUID(), title: 'Test', roleTitle: 'Engineer',
  jdText: 'A sufficiently long job description that asks an engineer to build reliable services for customers.',
  desiredOutcomes: ['delivery'], panelRoles: ['technical', 'product'], mustAskQuestions: [], mustCoverTopics: [], durationMinutes: 30, instructions: '',
  status: 'ready', plan: null, planVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};
const plan = buildFallbackPlan(interview);

test('assessment claims retain valid transcript references and require human review', () => {
  const turnId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const analysis: TurnAnalysisRecord = {
    id: crypto.randomUUID(), sessionId, turnId,
    analysis: {
      roleFindings: [
        { role: 'technical', observations: ['detail'], strengths: ['correct'], gaps: [] },
        { role: 'product', observations: [], strengths: [], gaps: ['impact'] },
      ],
      competencyEvidence: [{ competencyId: 'technical_execution', rating: 4, confidence: 0.9, quote: 'implemented a cache' }],
      vague: false, vagueReason: '', contradictions: [], recommendedDifficultyDelta: 1,
      recommendedRole: 'product', recommendedObjective: 'customer impact', recommendedModality: 'voice', addressedTopics: [], toolRequest: null,
    },
    decision: { activeSpeakerRole: 'product', objective: 'customer impact', modality: 'voice', difficulty: 3, reasonCode: 'cross_functional_gap', remainingCoverage: [], roleHandoff: true },
    responseText: 'What was the customer impact?', model: 'test', createdAt: new Date().toISOString(),
  };
  const assessment = buildEvidenceAssessment({
    plan, planVersion: 1, roles: ['technical', 'product'], analyses: [analysis],
    turns: [{ id: turnId, sessionId, sequence: 1, speaker: 'candidate', speakerRole: null, text: 'I implemented a cache and reduced latency.', status: 'final', dedupeKey: 'x', createdAt: new Date().toISOString() }],
  });
  assert.equal(assessment.humanReviewRequired, true);
  assert.equal(assessment.competencies.find((item) => item.id === 'technical_execution')?.evidence[0].turnId, turnId);
  assert.equal(assessment.competencies.find((item) => item.id === 'customer_impact')?.rating, null);
});

test('completed code and canvas versions become conservative artifact-grounded competency evidence', () => {
  const sessionId = crypto.randomUUID();
  const technicalPrompt: TranscriptTurnRecord = {
    id: crypto.randomUUID(), sessionId, sequence: 1, speaker: 'interviewer', speakerRole: 'technical',
    text: 'Implement a function named sumEvenNumbers that returns the sum of even numbers.', status: 'final',
    dedupeKey: 'technical-prompt', createdAt: new Date().toISOString(),
  };
  const artifact = (type: 'code' | 'canvas', content: unknown): ArtifactVersionRecord => ({
    id: crypto.randomUUID(), artifactId: crypto.randomUUID(), sessionId, type, version: 3, content, createdAt: new Date().toISOString(),
  });
  const result = buildEvidenceAssessment({
    plan,
    planVersion: 1,
    roles: ['technical', 'product'],
    turns: [technicalPrompt],
    analyses: [],
    artifacts: {
      code: artifact('code', { language: 'python', source: 'def sumEvenNumbers(values):\n    return sum(value for value in values if value % 2 == 0)' }),
      canvas: artifact('canvas', { freehand: { elements: [
        { type: 'text', text: 'Client' }, { type: 'text', text: 'API Server' }, { type: 'text', text: 'Database' },
        { type: 'arrow' }, { type: 'arrow' },
      ] } }),
    },
  });
  const technical = result.competencies.find((item) => item.id === 'technical_execution')!;
  const design = result.competencies.find((item) => item.id === 'system_design')!;
  assert.equal(technical.rating, 3);
  assert.ok(technical.evidence[0].artifactVersionId);
  assert.equal(technical.evidence[0].turnId, undefined);
  assert.equal(design.rating, 3);
  assert.ok(design.evidence[0].artifactVersionId);
  assert.ok(result.roleViews.find((item) => item.role === 'technical')?.evidence.some((item) => item.artifactVersionId));
  assert.ok(result.roleViews.find((item) => item.role === 'product')?.evidence.some((item) => item.artifactVersionId));
});

test('five-role demo report links spoken answers and completed workspaces to the correct panel views', () => {
  const sessionId = crypto.randomUUID();
  const roles: PanelRole[] = ['hiring_manager', 'technical', 'product', 'customer', 'behavioral'];
  const candidate = (sequence: number, text: string): TranscriptTurnRecord => ({
    id: crypto.randomUUID(), sessionId, sequence, speaker: 'candidate', speakerRole: null,
    text, status: 'final', dedupeKey: `candidate-${sequence}`, createdAt: new Date().toISOString(),
  });
  const interviewer = (sequence: number, role: PanelRole, text: string): TranscriptTurnRecord => ({
    id: crypto.randomUUID(), sessionId, sequence, speaker: 'interviewer', speakerRole: role,
    text, status: 'final', dedupeKey: `${role}-${sequence}`, createdAt: new Date().toISOString(),
  });
  const introduction = candidate(1, 'Hi, I am Ashish and I built several full stack projects.');
  const technicalQuestion = interviewer(2, 'technical', 'Implement a function named reverseString that returns the reverse of a string.');
  const productQuestion = interviewer(3, 'product', 'Draw Client, API Server, and Database with directed data flow.');
  const customerQuestion = interviewer(4, 'customer', 'Explain the benefit to a customer without technical jargon.');
  const customerAnswer = candidate(5, 'The application reduces latency and improves the user workflow.');
  const behavioralQuestion = interviewer(6, 'behavioral', 'What setback did you face, and what did you learn?');
  const behavioralAnswer = candidate(7, 'I did not give up when the project became difficult.');
  const turns = [introduction, technicalQuestion, productQuestion, customerQuestion, customerAnswer, behavioralQuestion, behavioralAnswer];
  const analysisFor = (turn: TranscriptTurnRecord): TurnAnalysisRecord => ({
    id: crypto.randomUUID(), sessionId, turnId: turn.id,
    analysis: {
      roleFindings: roles.map((role) => ({ role, observations: ['Answer reviewed'], strengths: [], gaps: [] })),
      competencyEvidence: [], vague: false, vagueReason: '', contradictions: [], recommendedDifficultyDelta: 0,
      recommendedRole: 'technical', recommendedObjective: 'Continue the panel', recommendedModality: 'voice',
      addressedTopics: [], toolRequest: null,
    },
    decision: {
      activeSpeakerRole: 'technical', objective: 'Continue the panel', modality: 'voice', difficulty: 3,
      reasonCode: 'panel_coverage', remainingCoverage: [], roleHandoff: true,
    },
    responseText: 'Continue', model: 'test', createdAt: turn.createdAt,
  });
  const artifact = (type: 'code' | 'canvas', content: unknown): ArtifactVersionRecord => ({
    id: crypto.randomUUID(), artifactId: crypto.randomUUID(), sessionId, type, version: 1, content, createdAt: new Date().toISOString(),
  });
  const assessment = buildEvidenceAssessment({
    plan,
    planVersion: 1,
    roles,
    turns,
    analyses: [analysisFor(introduction), analysisFor(customerAnswer), analysisFor(behavioralAnswer)],
    artifacts: {
      code: artifact('code', { language: 'typescript', source: 'function reverseString(value: string) {\n  return value.split(\'\').reverse().join(\'\');\n}' }),
      canvas: artifact('canvas', { freehand: { elements: [
        { type: 'text', text: 'Client' }, { type: 'text', text: 'API Server' }, { type: 'text', text: 'Database' },
        { type: 'arrow' }, { type: 'arrow' },
      ] } }),
    },
  });

  for (const role of roles) {
    assert.ok(assessment.roleViews.find((item) => item.role === role)?.evidence.length, `${role} should have evidence`);
  }
  assert.equal(assessment.roleViews.find((item) => item.role === 'hiring_manager')?.evidence[0].turnId, introduction.id);
  assert.equal(assessment.roleViews.find((item) => item.role === 'customer')?.evidence[0].turnId, customerAnswer.id);
  assert.equal(assessment.roleViews.find((item) => item.role === 'behavioral')?.evidence[0].turnId, behavioralAnswer.id);
  assert.match(assessment.overallSummary, /3 substantive spoken answers and 2 completed workspace tasks/);
  assert.ok(assessment.strengths.every((item) => !item.includes('supported positive evidence was observed')));
});

function largeAssessmentFixture() {
  const turns: TranscriptTurnRecord[] = Array.from({ length: 80 }, (_, index) => ({
    id: crypto.randomUUID(), sessionId: crypto.randomUUID(), sequence: index + 1,
    speaker: 'candidate', speakerRole: null, text: `Example ${index}: ` + '工程设计'.repeat(200),
    status: 'final', dedupeKey: String(index), createdAt: new Date().toISOString(),
  }));
  const fallback = buildEvidenceAssessment({ plan, planVersion: 1, roles: ['technical', 'product', 'customer', 'hiring_manager', 'behavioral'], turns, analyses: [] });
  fallback.competencies = Array.from({ length: 10 }, (_, index) => ({
    ...fallback.competencies[0], id: `competency-${index}`, name: '工程设计'.repeat(30), rating: 3,
    evidence: turns.slice(index * 6, index * 6 + 6).map((turn) => ({ turnId: turn.id, quote: turn.text.slice(0, 500) })),
  }));
  fallback.roleViews = fallback.roleViews.map((role, index) => ({ ...role, evidence: fallback.competencies[index].evidence }));
  return { turns, fallback };
}

test('large multilingual assessment inputs remain bounded without removing stored evidence', () => {
  const { fallback, turns } = largeAssessmentFixture();
  const before = structuredClone(fallback);
  const packet = buildAssessmentPacket(fallback, turns);
  assert.ok(Buffer.byteLength(packet.prompt, 'utf8') <= ASSESSMENT_PROMPT_BYTES);
  assert.equal(packet.entries.length, 15);
  assert.ok(packet.refs.size > 0);
  for (const ref of packet.refs.values()) assert.ok(turns.find((turn) => turn.id === ref.turnId)?.text.includes(ref.quote));
  assert.deepEqual(fallback, before);
  const result = applyAssessmentNarratives(fallback, { notes: [
    { key: 'c0', summary: 'Invented claim with an invalid reference.', evidence: ['invented'] },
  ] }, packet, 'test');
  assert.deepEqual(result.competencies, fallback.competencies);
  assert.deepEqual(result.roleViews, fallback.roleViews);
  assert.equal(result.humanReviewRequired, true);
});

test('assessor sends only the compact packet and preserves validated ratings', async (t) => {
  const { fallback, turns } = largeAssessmentFixture();
  const savedKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'assessment-packet-test';
  t.after(() => { if (savedKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedKey; });
  let inputBytes = 0;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    inputBytes = Buffer.byteLength(body.messages.map((message: { content: string }) => message.content).join(''), 'utf8');
    assert.ok(inputBytes <= 6_000);
    assert.equal(body.max_completion_tokens, 1_500);
    const prompt = JSON.parse(body.messages[1].content);
    assert.equal(prompt.validatedTurnAnalyses, undefined);
    assert.equal(prompt.safeFallback, undefined);
    const first = prompt.entries.find((entry: { evidence: string[] }) => entry.evidence.length);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ notes: [{
      key: first.key, summary: 'The cited example describes engineering design.', evidence: [first.evidence[0]],
    }] }) } }] });
  });
  const result = await generateFinalAssessment(fallback, turns);
  assert.ok(inputBytes > 0);
  assert.equal(result.competencies[0].summary, 'The cited example describes engineering design.');
  assert.deepEqual(result.competencies.map((item) => item.evidence), fallback.competencies.map((item) => item.evidence));
  assert.deepEqual(result.competencies.map((item) => item.rating), fallback.competencies.map((item) => item.rating));
});
