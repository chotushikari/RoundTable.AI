import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  appendEvent,
  ensureInterview,
  getLatestEventOfType,
} from '@/lib/db/repository';
import { isCanvasModality, selectCodeTask } from '@/lib/interview/problems';
import type {
  InterviewEvent,
  NextInterviewAction,
} from '@/lib/interview/types';

/**
 * Event sink for the interview. The client posts structured events; we persist
 * them durably (append-only, idempotent) as the backbone of the two-speed
 * intelligence pipeline.
 *
 * NOTE (R1): this route now ONLY captures + persists events. The role-switching
 * "levels" logic that used to live here has been removed — the custom-LLM proxy
 * (R2) becomes the control plane, and the evidence-gap orchestrator (R4) will
 * decide next actions from persisted state. This keeps the live voice path fast
 * and free of synchronous deep analysis.
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Structured console trace (kept for local debugging / two-speed visibility)
    console.log('\n[StructuredEvent]', JSON.stringify({ type: data.type }, null, 2));

    // interview_id: prefer explicit; fall back to Agora channel as a stable key.
    const interviewId: string | undefined =
      data.interview_id || data.interviewId || data.channel || data.agentUID;

    // Persist only when we have a usable interview key AND it's a UUID-shaped id.
    // (During R1 the client may still send the legacy agentUID; we accept a
    //  provided interview_id and otherwise skip persistence gracefully.)
    if (data.interview_id) {
      await ensureInterview(data.interview_id);

      const event: InterviewEvent = {
        event_id: data.event_id || randomUUID(),
        interview_id: data.interview_id,
        event_type: data.type || 'ERROR',
        source: inferSource(data.type),
        occurred_at: data.timestamp
          ? new Date(data.timestamp).toISOString()
          : new Date().toISOString(),
        state_version: data.state_version,
        payload: extractPayload(data),
      };

      const result = await appendEvent(event);

      // ── Multimodal routing (Sprint 06) ──────────────────────────────────
      // The control plane records its chosen action as NEXT_ACTION_SELECTED.
      // When that action is a canvas modality (code/debug/design), tell the
      // frontend to open the workspace and which stub to load. We only fire
      // this ONCE per decision by comparing against the last CODE_TASK_OPENED.
      const ui = await resolveWorkspaceCommand(data.interview_id);

      return NextResponse.json({
        success: true,
        persisted: result.ok,
        deduped: result.deduped,
        ...ui,
      });
    }

    // No interview_id yet (legacy path) — accept the event but don't persist.
    return NextResponse.json({ success: true, persisted: false, reason: 'no_interview_id' });
  } catch (err) {
    console.error('[logger] failed:', err);
    return NextResponse.json({ error: 'Failed to parse event' }, { status: 400 });
  }
}

type WorkspaceCommand = {
  newModality?: 'voice' | 'code';
  codeTask?: {
    id: string;
    title: string;
    language: string;
    starterCode: string;
    kind: string;
  };
};

/**
 * Decide whether the frontend should open (or close) the code workspace, based
 * on the control plane's most recent decision. Idempotent per decision: we
 * append a CODE_TASK_OPENED event keyed by the decision's row so a repeated
 * poll doesn't re-open the same task. Returns {} when nothing should change,
 * so the voice path is unaffected.
 */
async function resolveWorkspaceCommand(
  interviewId: string,
): Promise<WorkspaceCommand> {
  try {
    const decisionEvt = await getLatestEventOfType(
      interviewId,
      'NEXT_ACTION_SELECTED',
    );
    if (!decisionEvt) return {};

    const payload = (decisionEvt.payload ?? {}) as Partial<NextInterviewAction>;
    const modality = payload.modality;

    // Not a canvas turn → make sure we're in voice.
    if (!isCanvasModality(modality)) {
      return { newModality: 'voice' };
    }

    // Canvas turn: has the workspace already been opened for THIS decision?
    const lastOpened = await getLatestEventOfType(interviewId, 'CODE_TASK_OPENED');
    const decisionKey = String(decisionEvt.sequence ?? decisionEvt.event_id);
    const openedKey =
      (lastOpened?.payload as { decision_key?: string } | undefined)
        ?.decision_key ?? null;

    const task = selectCodeTask({
      ...(payload as NextInterviewAction),
      modality: modality!,
    });

    // Emit CODE_TASK_OPENED once per decision (fire-and-forget).
    if (openedKey !== decisionKey) {
      const evt: InterviewEvent = {
        event_id: randomUUID(),
        interview_id: interviewId,
        event_type: 'CODE_TASK_OPENED',
        source: 'code',
        occurred_at: new Date().toISOString(),
        payload: {
          decision_key: decisionKey,
          task_id: task.id,
          title: task.title,
          competency: payload.competency ?? null,
        },
      };
      void appendEvent(evt).catch(() => {});
    }

    return {
      newModality: 'code',
      codeTask: {
        id: task.id,
        title: task.title,
        language: task.language,
        starterCode: task.starterCode,
        kind: task.kind,
      },
    };
  } catch (err) {
    console.error('[logger] resolveWorkspaceCommand failed:', err);
    return {};
  }
}

function inferSource(type?: string): InterviewEvent['source'] {
  if (!type) return 'orchestrator';
  if (type.startsWith('AGORA') || type === 'METRICS' || type === 'AGENT_STATE_CHANGED')
    return 'agora';
  if (type.startsWith('TRANSCRIPT') || type === 'INTERRUPTED') return 'candidate';
  if (type.startsWith('CODE') || type === 'TEST_RESULT') return 'code';
  if (type.startsWith('MCP')) return 'mcp';
  if (type.startsWith('ASSESSMENT')) return 'assessment';
  return 'orchestrator';
}

function extractPayload(data: Record<string, unknown>): Record<string, unknown> {
  // Strip envelope/control fields; keep the event-specific body.
  const {
    type: _t,
    timestamp: _ts,
    interview_id: _iid,
    interviewId: _iid2,
    event_id: _eid,
    state_version: _sv,
    currentState: _cs,
    activeRole: _ar,
    recentTranscript: _rt,
    restAgentId: _rid,
    agentUID: _auid,
    ...rest
  } = data;
  return rest;
}
