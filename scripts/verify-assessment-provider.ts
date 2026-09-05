// Optional live smoke check: consumes one small Groq request using synthetic
// evidence only. Prints no credentials or real candidate data.
import { loadEnvConfig } from '@next/env';
import { buildEvidenceAssessment, generateFinalAssessment } from '../lib/assessment';
import { buildFallbackPlan } from '../lib/interview-planner';
import { InterviewCreateSchema } from '../types/interview';
import type { InterviewDefinitionRecord, TranscriptTurnRecord } from '../types/interview';

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is required for the optional live check');
  const interview: InterviewDefinitionRecord = {
    ...InterviewCreateSchema.parse({ title: 'Synthetic smoke check', roleTitle: 'Engineer',
      jdText: 'Build reliable services with automated regression tests and explain the implementation to teammates.',
      desiredOutcomes: ['Reliable services'],
    }),
    id: crypto.randomUUID(), organizationId: crypto.randomUUID(), status: 'ready', plan: null,
    planVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const plan = buildFallbackPlan(interview);
  const turn: TranscriptTurnRecord = {
    id: crypto.randomUUID(), sessionId: crypto.randomUUID(), sequence: 1, speaker: 'candidate',
    speakerRole: null, text: 'I added a cache invalidation regression test after fixing a stale response.',
    status: 'final', dedupeKey: 'synthetic', createdAt: new Date().toISOString(),
  };
  const fallback = buildEvidenceAssessment({ plan, planVersion: 1, roles: interview.panelRoles, turns: [turn], analyses: [] });
  fallback.competencies[0].evidence = [{ turnId: turn.id, quote: turn.text }];
  fallback.competencies[0].rating = 3;
  const result = await generateFinalAssessment(fallback, [turn]);
  if (result.model === fallback.model) throw new Error('Live provider did not produce an assessment narrative; fallback remains available');
  if (result.competencies[0].summary === fallback.competencies[0].summary) throw new Error('Live provider narrative did not pass evidence validation');
  console.log('Live compact assessment accepted and evidence validation passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Live assessment check failed');
  process.exitCode = 1;
});
