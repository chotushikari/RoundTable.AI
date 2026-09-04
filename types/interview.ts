import { z } from 'zod';

export const PANEL_ROLES = [
  'technical',
  'product',
  'hiring_manager',
  'behavioral',
  'customer',
] as const;

export const PanelRoleSchema = z.enum(PANEL_ROLES);
export type PanelRole = z.infer<typeof PanelRoleSchema>;

export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const ModalitySchema = z.enum(['voice', 'code', 'canvas', 'scenario']);
export type InterviewModality = z.infer<typeof ModalitySchema>;

export const InterviewStatusSchema = z.enum([
  'draft',
  'ready',
  'in_progress',
  'assessing',
  'completed',
  'abandoned',
  'failed',
  'needs_review',
]);
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

export const InterviewCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  roleTitle: z.string().trim().min(2).max(120),
  jdText: z.string().trim().min(40).max(30_000),
  desiredOutcomes: z.array(z.string().trim().min(2).max(240)).min(1).max(12),
  panelRoles: z
    .array(PanelRoleSchema)
    .min(2)
    .max(5)
    .default(['technical', 'product', 'hiring_manager']),
  mustAskQuestions: z
    .array(z.string().trim().min(5).max(500))
    .max(12)
    .default([]),
  mustCoverTopics: z
    .array(z.string().trim().min(2).max(240))
    .max(16)
    .default([]),
  durationMinutes: z.number().int().min(15).max(90).default(30),
  instructions: z.string().trim().max(4_000).default(''),
});
export type InterviewCreateInput = z.infer<typeof InterviewCreateSchema>;

export const RubricCompetencySchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(500),
  weight: z.number().min(0.05).max(1),
  signals: z.array(z.string().trim().min(2).max(240)).min(1).max(8),
});

export const InterviewPlanSchema = z.object({
  summary: z.string().trim().min(10).max(1_000),
  competencies: z.array(RubricCompetencySchema).min(3).max(10),
  roleObjectives: z.array(
    z.object({
      role: PanelRoleSchema,
      objectives: z.array(z.string().trim().min(2).max(240)).min(1).max(8),
    }),
  ),
  scenarios: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        title: z.string().trim().min(2).max(160),
        prompt: z.string().trim().min(10).max(1_500),
        modality: ModalitySchema,
        targetCompetencies: z.array(z.string().trim().min(1).max(80)).min(1),
      }),
    )
    .max(8),
  fallbackQuestions: z.array(z.string().trim().min(5).max(500)).min(3).max(15),
});
export type InterviewPlan = z.infer<typeof InterviewPlanSchema>;

export const EvidenceRefSchema = z.object({
  turnId: z.string().uuid().optional(),
  artifactVersionId: z.string().uuid().optional(),
  quote: z.string().trim().min(1).max(500),
}).refine((value) => value.turnId || value.artifactVersionId, {
  message: 'Evidence must reference a transcript turn or artifact version',
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const RoleFindingSchema = z.object({
  role: PanelRoleSchema,
  observations: z.array(z.string().trim().min(1).max(500)).max(6),
  strengths: z.array(z.string().trim().min(1).max(300)).max(4),
  gaps: z.array(z.string().trim().min(1).max(300)).max(4),
});

export const CompetencyEvidenceSchema = z.object({
  competencyId: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1).max(4).nullable(),
  confidence: z.number().min(0).max(1),
  quote: z.string().trim().max(500),
});

export const ContradictionSchema = z.object({
  priorTurnId: z.string().uuid().optional(),
  priorQuote: z.string().trim().max(500),
  currentQuote: z.string().trim().max(500),
  explanation: z.string().trim().min(1).max(500),
});

export const PanelTurnAnalysisSchema = z.object({
  roleFindings: z.array(RoleFindingSchema).min(2).max(5),
  competencyEvidence: z.array(CompetencyEvidenceSchema).max(10),
  vague: z.boolean(),
  vagueReason: z.string().trim().max(500).default(''),
  contradictions: z.array(ContradictionSchema).max(5),
  recommendedDifficultyDelta: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  recommendedRole: PanelRoleSchema,
  recommendedObjective: z.string().trim().min(2).max(500),
  recommendedModality: ModalitySchema,
  addressedTopics: z.array(z.string().trim().min(1).max(240)).max(10),
  toolRequest: z
    .object({
      name: z.enum([
        'get_workspace_snapshot',
        'run_code_tests',
        'inject_scenario_constraint',
      ]),
      arguments: z.record(z.string(), z.unknown()).default({}),
    })
    .nullable()
    .default(null),
});
export type PanelTurnAnalysis = z.infer<typeof PanelTurnAnalysisSchema>;

export const ControllerDecisionSchema = z.object({
  activeSpeakerRole: PanelRoleSchema,
  objective: z.string().trim().min(2).max(500),
  modality: ModalitySchema,
  difficulty: DifficultySchema,
  reasonCode: z.enum([
    'clarify_vague',
    'resolve_contradiction',
    'must_ask',
    'weak_competency',
    'cross_functional_gap',
    'workspace_follow_up',
    'resume_verification',
    'balanced_rotation',
    'wrap_up',
    'fallback',
  ]),
  remainingCoverage: z.array(z.string()),
  roleHandoff: z.boolean(),
});
export type ControllerDecision = z.infer<typeof ControllerDecisionSchema>;

export const FinalAssessmentSchema = z.object({
  overallSummary: z.string().trim().min(10).max(2_000),
  competencies: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rating: z.number().int().min(1).max(4).nullable(),
      confidence: z.number().min(0).max(1),
      summary: z.string().max(1_000),
      evidence: z.array(EvidenceRefSchema),
      gaps: z.array(z.string().max(500)),
    }),
  ),
  roleViews: z.array(
    z.object({
      role: PanelRoleSchema,
      summary: z.string().max(1_000),
      evidence: z.array(EvidenceRefSchema),
    }),
  ),
  strengths: z.array(z.string().max(500)),
  growthAreas: z.array(z.string().max(500)),
  unresolvedContradictions: z.array(z.string().max(500)),
  suggestedHumanFollowUps: z.array(z.string().max(500)),
  coverage: z.object({
    covered: z.array(z.string()),
    notObserved: z.array(z.string()),
  }),
  candidateSummary: z.object({
    strengths: z.array(z.string().max(500)),
    growthAreas: z.array(z.string().max(500)),
  }),
  humanReviewRequired: z.literal(true),
  rubricVersion: z.number().int().positive(),
  model: z.string(),
});
export type FinalAssessment = z.infer<typeof FinalAssessmentSchema>;

export type CompetencyState = Record<
  string,
  {
    rating: number | null;
    confidence: number;
    evidenceCount: number;
    highConfidenceStreak: number;
    lowConfidenceStreak: number;
    difficulty: Difficulty;
  }
>;

export interface InterviewDefinitionRecord extends InterviewCreateInput {
  id: string;
  organizationId: string;
  status: 'draft' | 'ready';
  plan: InterviewPlan | null;
  planVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewVersionRecord {
  id: string;
  interviewId: string;
  organizationId: string;
  version: number;
  definition: InterviewCreateInput;
  plan: InterviewPlan;
  promptVersion: string;
  createdAt: string;
}

export interface InvitationRecord {
  id: string;
  interviewId: string;
  interviewVersionId: string;
  organizationId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  claimedAt: string | null;
  candidateName: string | null;
  candidateEmail: string | null;
  resumePath: string | null;
  createdAt: string;
}

export interface InterviewSessionRecord {
  id: string;
  invitationId: string;
  interviewId: string;
  interviewVersionId: string;
  organizationId: string;
  status: InterviewStatus;
  connectionHealth: 'unknown' | 'connected' | 'degraded' | 'disconnected';
  channelName: string;
  rtcUid: string;
  agentUid: string;
  agoraAgentId: string | null;
  llmTokenHash: string;
  activeRole: PanelRole;
  previousRole: PanelRole | null;
  consecutiveRoleTurns: number;
  currentModality: InterviewModality;
  competencyState: CompetencyState;
  askedMustAsk: string[];
  coveredTopics: string[];
  pendingQuestion: string | null;
  stateVersion: number;
  toolRunCount: number;
  startedAt: string;
  completedAt: string | null;
  expiresAt: string;
}

export interface TranscriptTurnRecord {
  id: string;
  sessionId: string;
  sequence: number;
  speaker: 'candidate' | 'interviewer';
  speakerRole: PanelRole | null;
  text: string;
  status: 'final' | 'interrupted';
  dedupeKey: string;
  createdAt: string;
}

export interface TurnAnalysisRecord {
  id: string;
  sessionId: string;
  turnId: string;
  analysis: PanelTurnAnalysis;
  decision: ControllerDecision;
  responseText: string;
  model: string;
  createdAt: string;
}

export interface WorkspaceArtifactRecord {
  id: string;
  sessionId: string;
  type: 'code' | 'canvas';
  version: number;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ToolRunRecord {
  id: string;
  sessionId: string;
  name: 'get_workspace_snapshot' | 'run_code_tests' | 'inject_scenario_constraint';
  input: Record<string, unknown>;
  output: unknown;
  status: 'completed' | 'failed';
  createdAt: string;
}

export interface SessionEventRecord {
  id: string;
  sessionId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AssessmentRecord {
  id: string;
  sessionId: string;
  assessment: FinalAssessment;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
