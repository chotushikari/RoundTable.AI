import { z } from 'zod';

/**
 * Core domain types for the interview engine.
 * These are the SHARED BRAIN types — one CandidateState per interview,
 * read/written through the DB, injected into every agent turn by the proxy.
 */

// ── Competencies ──────────────────────────────────────────────
export const COMPETENCIES = [
  'technical_reasoning',
  'system_design',
  'coding_implementation',
  'debugging',
  'product_thinking',
  'customer_orientation',
  'communication',
  'ownership',
  'behavioral',
] as const;
export type Competency = (typeof COMPETENCIES)[number];

export const ROLES = [
  'technical',
  'product',
  'customer',
  'manager',
  'behavioral',
] as const;
export type RoleKind = (typeof ROLES)[number];

// ── belief + confidence pair (the whole product) ──────────────
export const CompetencySignalSchema = z.object({
  belief: z.number().min(0).max(1), // how strong we think they are
  confidence: z.number().min(0).max(1), // how much evidence justifies that belief
});
export type CompetencySignal = z.infer<typeof CompetencySignalSchema>;

export const ChallengeVectorSchema = z.object({
  technical_depth: z.number().min(0).max(1),
  ambiguity: z.number().min(0).max(1),
  scale: z.number().min(0).max(1),
  edge_case_complexity: z.number().min(0).max(1),
  business_complexity: z.number().min(0).max(1),
  time_pressure: z.number().min(0).max(1),
  cross_functional: z.number().min(0).max(1),
});
export type ChallengeVector = z.infer<typeof ChallengeVectorSchema>;

// ── Candidate State ───────────────────────────────────────────
export const CandidateStateSchema = z.object({
  interview_id: z.string(),
  version: z.number().int(),
  phase: z
    .enum(['warm', 'discovery', 'deepening', 'cross_functional', 'verification', 'closing'])
    .default('warm'),
  active_role: z.enum(ROLES).default('technical'),
  competency_signals: z.record(z.string(), CompetencySignalSchema),
  challenge_vector: ChallengeVectorSchema,
  open_gaps: z.array(z.string()).default([]),
  covered_topics: z.array(z.string()).default([]),
  last_action: z.unknown().nullable().default(null),
  time_budget_remaining: z.number().int().nullable().default(null),
});
export type CandidateState = z.infer<typeof CandidateStateSchema>;

// ── NextInterviewAction ───────────────────────────────────────
export const NextInterviewActionSchema = z.object({
  role: z.enum(ROLES),
  modality: z.enum([
    'voice',
    'clarify',
    'challenge',
    'scenario',
    'roleplay',
    'code',
    'debug',
    'design',
    'evidence_probe',
    'closing',
  ]),
  objective: z.string(),
  competency: z.enum(COMPETENCIES),
  question_type: z.enum(['probe', 'challenge', 'evidence', 'scenario', 'verification']),
  challenge_vector: ChallengeVectorSchema.partial().optional(),
  reason_code: z.string(),
  evidence_refs: z.array(z.string()).default([]),
});
export type NextInterviewAction = z.infer<typeof NextInterviewActionSchema>;

// ── Event envelope (docs/14) ──────────────────────────────────
export const EVENT_TYPES = [
  'INTERVIEW_CREATED',
  'AI_DISCLOSURE_SHOWN',
  'AGORA_SESSION_STARTED',
  'AGORA_STATE_CHANGED',
  'AGORA_METRICS',
  'TRANSCRIPT_PARTIAL',
  'TRANSCRIPT_FINAL',
  'CANDIDATE_STATE_UPDATED',
  'EVIDENCE_EXTRACTED',
  'GAP_DETECTED',
  'VAGUENESS_DETECTED',
  'CONTRADICTION_DETECTED',
  'NEXT_ACTION_SELECTED',
  'ROLE_CHANGED',
  'CODE_TASK_OPENED',
  'CODE_CHANGED',
  'TEST_RESULT',
  'MCP_TOOL_STARTED',
  'MCP_TOOL_COMPLETED',
  'AGENT_INTERRUPTED',
  'ASSESSMENT_STARTED',
  'ASSESSMENT_COMPLETED',
  'INTERVIEW_COMPLETED',
  'ERROR',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const InterviewEventSchema = z.object({
  event_id: z.string().uuid(),
  interview_id: z.string().uuid(),
  event_type: z.string(),
  source: z.enum(['candidate', 'agora', 'orchestrator', 'code', 'mcp', 'assessment']),
  occurred_at: z.string().optional(),
  sequence: z.number().int().optional(),
  state_version: z.number().int().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type InterviewEvent = z.infer<typeof InterviewEventSchema>;

// ── Helpers ───────────────────────────────────────────────────
export function initialCandidateState(interviewId: string): CandidateState {
  const neutral: CompetencySignal = { belief: 0.3, confidence: 0.05 };
  const signals: Record<string, CompetencySignal> = {};
  for (const c of COMPETENCIES) signals[c] = { ...neutral };
  return {
    interview_id: interviewId,
    version: 0,
    phase: 'warm',
    active_role: 'technical',
    competency_signals: signals,
    challenge_vector: {
      technical_depth: 0.4,
      ambiguity: 0.3,
      scale: 0.3,
      edge_case_complexity: 0.3,
      business_complexity: 0.3,
      time_pressure: 0.2,
      cross_functional: 0.3,
    },
    open_gaps: [],
    covered_topics: [],
    last_action: null,
    time_budget_remaining: null,
  };
}
