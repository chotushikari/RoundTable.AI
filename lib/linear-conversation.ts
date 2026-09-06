import { randomUUID } from 'crypto';
import { createLinearComment, getLinearIssue } from '@/lib/linear-mcp';
import { interviewStore } from '@/lib/interview-store';
import type { InterviewSessionRecord, ToolRunRecord } from '@/types/interview';

export type LinearVoiceCommand = 'load_issue' | 'prepare_comment' | 'confirm_post' | 'cancel_post';

const posting = new Map<string, Promise<string>>();

export function linearVoiceCommand(answer: string): LinearVoiceCommand | null {
  const text = answer.trim().toLowerCase().replace(/[.!?]+$/g, '');
  if (text.split(/\s+/).length > 24) return null;
  if (/\b(?:cancel|don't|do not|never mind)\b.{0,20}\b(?:post|comment|linear)\b/.test(text)) return 'cancel_post';
  if (/\b(?:confirm|yes|okay|ok)\b.{0,16}\b(?:post|publish|send)(?: it)?\b|^(?:post|publish|send) it$/.test(text)) return 'confirm_post';
  if (/\b(?:add|draft|prepare|post|publish|send)\b.{0,40}\b(?:explanation|approach|summary|comment|update)\b.{0,30}\blinear\b|\blinear\b.{0,30}\b(?:comment|update)\b/.test(text)) return 'prepare_comment';
  if (/\b(?:load|open|show|read|check)\b.{0,24}\blinear\b.{0,16}\b(?:issue|ticket|task)?\b|\blinear (?:issue|ticket|task)\b/.test(text)) return 'load_issue';
  return null;
}

async function saveResponse(sessionId: string, requestId: string, command: LinearVoiceCommand, text: string) {
  await interviewStore.appendEvent(sessionId, 'linear.voice_response', { requestId, command, text });
  return text;
}

async function recordTool(sessionId: string, name: ToolRunRecord['name'], input: Record<string, unknown>, output: unknown, status: ToolRunRecord['status']) {
  return interviewStore.createToolRun({ id: randomUUID(), sessionId, name, input, output, status, createdAt: new Date().toISOString() });
}

async function configuredIssue(session: InterviewSessionRecord): Promise<string | null> {
  const version = await interviewStore.getInterviewVersion(session.interviewVersionId);
  return version?.definition.linearIssueIdentifier ?? null;
}

function isControlText(text: string) {
  return /^(?:continue|next|check now|review|yes|no|okay|ok|confirm post|post it)[.! ]*$/i.test(text.trim());
}

async function buildCommentDraft(session: InterviewSessionRecord, recentExplanation?: string) {
  const [turns, code] = await Promise.all([
    interviewStore.listTurns(session.id),
    interviewStore.getArtifact(session.id, 'code'),
  ]);
  const explanation = recentExplanation?.trim()
    || [...turns].reverse().find((turn) => turn.speaker === 'candidate' && !isControlText(turn.text))?.text;
  const content = code?.content && typeof code.content === 'object' ? code.content as Record<string, unknown> : null;
  const source = typeof content?.source === 'string' ? content.source : '';
  const language = typeof content?.language === 'string' ? content.language : 'unspecified language';
  const functions = [...source.matchAll(/(?:^|\n)\s*(?:async\s+)?(?:function\s+|def\s+|const\s+)([A-Za-z_$][\w$]*)/g)].map((match) => match[1]).slice(0, 6);
  const workspace = source.trim()
    ? `${language}; ${source.split('\n').filter((line) => line.trim()).length} non-empty lines${functions.length ? `; functions: ${functions.join(', ')}` : ''}`
    : 'no saved code was available';
  return [
    'RoundTable interview update (candidate-confirmed)',
    '',
    `Candidate explanation: ${explanation ? `“${explanation.slice(0, 1_500)}”` : 'No substantive spoken explanation was captured.'}`,
    `Saved workspace: ${workspace}.`,
    '',
    'This note was prepared during an AI-assisted interview and explicitly confirmed by the candidate before posting.',
  ].join('\n');
}

export async function respondToLinearVoiceCommand(session: InterviewSessionRecord, command: LinearVoiceCommand, requestId: string, recentExplanation?: string): Promise<string> {
  const events = await interviewStore.listEvents(session.id);
  const cached = events.find((event) => event.type === 'linear.voice_response' && event.payload.requestId === requestId);
  if (cached) return String(cached.payload.text ?? '');
  const issueIdentifier = await configuredIssue(session);
  if (!issueIdentifier) return saveResponse(session.id, requestId, command, 'This interview does not have a Linear issue attached, so I cannot perform that action. We can continue with the interview.');

  if (command === 'load_issue') {
    try {
      const issue = await getLinearIssue(issueIdentifier);
      await recordTool(session.id, 'linear_get_issue', { issueIdentifier }, issue, 'completed');
      const detail = issue.description ? ` ${issue.description.slice(0, 420)}` : '';
      return saveResponse(session.id, requestId, command, `I loaded ${issue.identifier}: ${issue.title}.${detail}`);
    } catch (error) {
      console.warn('[linear] issue load failed', { sessionId: session.id, issueIdentifier, error: error instanceof Error ? error.message : 'unknown error' });
      await recordTool(session.id, 'linear_get_issue', { issueIdentifier }, { error: error instanceof Error ? error.message : 'Linear request failed' }, 'failed');
      return saveResponse(session.id, requestId, command, 'I could not reach Linear right now. Your interview can continue, and this tool failure will not affect your assessment.');
    }
  }

  if (command === 'prepare_comment') {
    const body = await buildCommentDraft(session, recentExplanation);
    const draftId = randomUUID();
    await interviewStore.appendEvent(session.id, 'linear.comment_draft', { draftId, issueIdentifier, body, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
    await recordTool(session.id, 'linear_prepare_comment', { issueIdentifier, draftId }, { body }, 'completed');
    return saveResponse(session.id, requestId, command, `I prepared this Linear comment: ${body} Say “confirm post” to publish it, or “cancel post” to discard it.`);
  }

  const drafts = events.filter((event) => event.type === 'linear.comment_draft' && event.payload.issueIdentifier === issueIdentifier);
  const draft = drafts.at(-1);
  if (!draft) return saveResponse(session.id, requestId, command, 'There is no pending Linear comment. First say “add my explanation to Linear” and I will prepare a preview.');
  const draftId = String(draft.payload.draftId ?? '');
  if (command === 'cancel_post') {
    await interviewStore.appendEvent(session.id, 'linear.comment_cancelled', { draftId, issueIdentifier });
    return saveResponse(session.id, requestId, command, 'Cancelled. Nothing was posted to Linear.');
  }
  const alreadyPosted = events.find((event) => event.type === 'linear.comment_posted' && event.payload.draftId === draftId);
  if (alreadyPosted) return saveResponse(session.id, requestId, command, `That confirmed comment is already posted${alreadyPosted.payload.url ? `: ${alreadyPosted.payload.url}` : ' to Linear'}.`);
  const cancelled = events.some((event) => event.type === 'linear.comment_cancelled' && event.payload.draftId === draftId);
  if (cancelled) return saveResponse(session.id, requestId, command, 'That draft was cancelled. Ask me to prepare a new Linear comment if you want to continue.');
  if (Date.parse(String(draft.payload.expiresAt ?? '')) <= Date.now()) return saveResponse(session.id, requestId, command, 'That comment preview expired. Ask me to prepare it again before posting.');

  const lockKey = `${session.id}:${draftId}`;
  const active = posting.get(lockKey);
  if (active) return active;
  const action = (async () => {
    try {
      const result = await createLinearComment(issueIdentifier, String(draft.payload.body ?? ''));
      await recordTool(session.id, 'linear_post_comment', { issueIdentifier, draftId, explicitlyConfirmed: true }, result, 'completed');
      await interviewStore.appendEvent(session.id, 'linear.comment_posted', { draftId, issueIdentifier, commentId: result.id, url: result.url });
      return saveResponse(session.id, requestId, command, `Confirmed and posted to ${issueIdentifier}. The company report now contains the action result${result.url ? ' and comment link' : ''}.`);
    } catch (error) {
      console.warn('[linear] confirmed comment post failed', { sessionId: session.id, issueIdentifier, error: error instanceof Error ? error.message : 'unknown error' });
      await recordTool(session.id, 'linear_post_comment', { issueIdentifier, draftId, explicitlyConfirmed: true }, { error: error instanceof Error ? error.message : 'Linear request failed' }, 'failed');
      return saveResponse(session.id, requestId, command, 'I could not post the confirmed comment to Linear. Nothing in your assessment changes because an external tool failed.');
    } finally {
      posting.delete(lockKey);
    }
  })();
  posting.set(lockKey, action);
  return action;
}
