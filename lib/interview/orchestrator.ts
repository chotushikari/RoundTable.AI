import type { CandidateState, NextInterviewAction, RoleKind } from './types';
import { COMPETENCIES } from './types';
import { getPersona } from './personas';

/**
 * Control-plane action selector (R2 baseline).
 *
 * This is the SEAM where the full evidence-gap orchestrator (R4) will plug in.
 * For R2 we ship a deterministic, explainable baseline so the proxy can emit a
 * real NEXT_ACTION_SELECTED every turn and the same agent can legitimately
 * shift persona between turns — without yet depending on evidence extraction.
 *
 * Heuristic (transparent on purpose):
 *  - Warm up on Technical for the first couple of turns.
 *  - Otherwise pick the competency we are least sure about (lowest confidence,
 *    tie-broken by lowest belief) and route to the role that owns it.
 *  - Rotate away from the role we just used so the panel feels alive and the
 *    signature "Technical accepts → Product challenges" hand-off can happen.
 */

// Which role is primarily responsible for each competency.
const COMPETENCY_OWNER: Record<string, RoleKind> = {
  technical_reasoning: 'technical',
  system_design: 'technical',
  coding_implementation: 'technical',
  debugging: 'technical',
  product_thinking: 'product',
  customer_orientation: 'customer',
  communication: 'manager',
  ownership: 'manager',
  behavioral: 'behavioral',
};

const QUESTION_TYPE_BY_ROLE: Record<RoleKind, NextInterviewAction['question_type']> = {
  technical: 'probe',
  product: 'challenge',
  customer: 'scenario',
  manager: 'probe',
  behavioral: 'evidence',
};

const MODALITY_BY_ROLE: Record<RoleKind, NextInterviewAction['modality']> = {
  technical: 'voice',
  product: 'challenge',
  customer: 'roleplay',
  manager: 'voice',
  behavioral: 'evidence_probe',
};

function leastCertainCompetency(state: CandidateState): string {
  let best = COMPETENCIES[0] as string;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of COMPETENCIES) {
    const sig = state.competency_signals[c] ?? { belief: 0.3, confidence: 0.05 };
    // Prioritize low confidence first, then low belief as tie-breaker.
    const score = sig.confidence * 100 + sig.belief;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * Choose the next interview action from current shared state.
 * Pure and deterministic — safe for decision replay and unit tests.
 */
export function selectNextAction(state: CandidateState | null): NextInterviewAction {
  // Cold open → Technical warm-up.
  if (!state || state.version < 2) {
    return {
      role: 'technical',
      modality: 'voice',
      objective:
        'Open warmly and get the candidate talking about something concrete they have recently built or shipped.',
      competency: 'technical_reasoning',
      question_type: 'probe',
      reason_code: 'warmup_technical',
      evidence_refs: [],
    };
  }

  const targetCompetency = leastCertainCompetency(state) as NextInterviewAction['competency'];
  const owner = COMPETENCY_OWNER[targetCompetency] ?? 'technical';

  // ── Multimodal trigger (Sprint 06) ──────────────────────────────────────
  // When the least-evidenced gap is hands-on (implementation or debugging),
  // words won't close it — the candidate needs to BUILD. Route to the code
  // workspace instead of another voice probe. This stays on the Technical
  // lens (Maya) and is fully explainable via reason_code.
  //
  // This MUST run before the technical→product hand-off below: both hands-on
  // gaps are owned by Technical, so the hand-off would otherwise flip the role
  // to Product and suppress the code turn entirely. We gate on the competency's
  // natural OWNER (not the post-handoff `role`) for exactly this reason.
  //
  // Guarded so we don't yank someone into code the moment the interview opens:
  // only once we're past warm-up (version ≥ 2, already ensured above) AND we
  // haven't just done a code turn.
  const lastActionModality =
    (state.last_action as { modality?: string } | null)?.modality;
  const justCoded = lastActionModality === 'code' || lastActionModality === 'debug';
  const techPersona = getPersona('technical');

  if (!justCoded && owner === 'technical' && targetCompetency === 'coding_implementation') {
    return {
      role: 'technical',
      modality: 'code',
      objective:
        `As ${techPersona.name}, move from talk to proof: open the workspace and have the candidate ` +
        `implement a small, concrete problem. Watch what they actually write, then react to it.`,
      competency: 'coding_implementation',
      question_type: 'verification',
      reason_code: 'gap:coding_implementation:needs_code',
      evidence_refs: [],
    };
  }

  if (!justCoded && owner === 'technical' && targetCompetency === 'debugging') {
    return {
      role: 'technical',
      modality: 'debug',
      objective:
        `As ${techPersona.name}, hand the candidate a piece of broken code in the workspace and have ` +
        `them find and fix the defect while narrating their reasoning.`,
      competency: 'debugging',
      question_type: 'verification',
      reason_code: 'gap:debugging:needs_code',
      evidence_refs: [],
    };
  }

  // Keep the panel dynamic: avoid using the exact same role two turns running,
  // unless the gap is squarely owned by that role.
  let role = owner;
  const prevRole = state.active_role;
  if (role === prevRole && role === 'technical') {
    role = 'product'; // the signature technical→product hand-off
  }

  const persona = getPersona(role);
  const sig = state.competency_signals[targetCompetency];
  const confBand = sig && sig.confidence >= 0.6 ? 'well-evidenced' : 'thin';

  return {
    role,
    modality: MODALITY_BY_ROLE[role],
    objective:
      `As ${persona.name}, close the gap on "${targetCompetency}" — current evidence is ${confBand}. ` +
      `Ask one focused, concrete follow-up through your lens.`,
    competency: targetCompetency,
    question_type: QUESTION_TYPE_BY_ROLE[role],
    reason_code: `gap:${targetCompetency}:${role}`,
    evidence_refs: [],
  };
}
