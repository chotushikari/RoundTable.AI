import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEvidenceAssessment } from '@/lib/assessment';
import { buildFallbackPlan } from '@/lib/interview-planner';
import type { InterviewDefinitionRecord, TurnAnalysisRecord } from '@/types/interview';

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
