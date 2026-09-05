import { createHash } from 'crypto';
import { interviewStore } from '@/lib/interview-store';
import { processCandidateTurn, turnDedupeKey } from '@/lib/interview-controller';
import { DEMO_OPENING_QUESTION, normalizeSpokenText } from '@/lib/interview-demo';
import type { InterviewSessionRecord } from '@/types/interview';

// A question is an epoch, not an ASR segment. Transport receipts never supply
// role, score or coverage; those remain derived from server-owned questions.
export function demoQuestion(session: InterviewSessionRecord) {
  const text = session.pendingQuestion ?? DEMO_OPENING_QUESTION;
  return { id: createHash('sha256').update(`${session.id}:${text}`).digest('hex'), text };
}

export function mergeAnswerFragments(fragments: string[]): string {
  return fragments.reduce((combined, fragment) => {
    if (!combined) return fragment.trim();
    if (normalizeSpokenText(fragment).startsWith(normalizeSpokenText(combined))) return fragment.trim();
    if (normalizeSpokenText(combined).endsWith(normalizeSpokenText(fragment))) return combined;
    return `${combined} ${fragment.trim()}`;
  }, '');
}

export function isIncompleteDemoAnswer(answer: string, role: string): boolean {
  if (/^(?:please )?(?:skip(?: this(?: question)?)?|pass|i (?:don't|do not) know)[.! ]*$/i.test(answer)
    || /\b(that['’]s (?:all|my answer)|i['’]m done)\W*$/i.test(answer)) return false;
  const words = answer.trim().split(/\s+/);
  if (words.length < 8 || /\b(that|was|is|the|a|an|to|and|but|because|with|my|took|were)\W*$/i.test(answer)) return true;
  // An introduction alone is not the requested project example.
  return role === 'hiring_manager'
    && !/\b(project|built|implemented|developed|owned|led|created|delivered|worked on|checkout|service|system|application|platform)\b/i.test(answer);
}

export async function processDemoAnswer(input: {
  session: InterviewSessionRecord; answer: string; upstreamTurnId: string;
}): Promise<string> {
  // Retry lookup precedes refreshing the question epoch: a retried response must
  // not become an answer to the next panel member.
  const events = await interviewStore.listEvents(input.session.id);
  const cached = events.find((event) => event.type === 'demo.response'
    && event.payload.requestId === input.upstreamTurnId);
  if (cached) return String(cached.payload.text ?? '');
  const reservedRequest = events.find((event) => event.type === 'answer.fragment'
    && event.payload.requestId === input.upstreamTurnId);
  if (reservedRequest) {
    const turn = await interviewStore.findTurnByDedupeKey(input.session.id,
      turnDedupeKey(input.session.id, String(reservedRequest.payload.questionId), 'demo-answer'));
    const analysis = turn ? await interviewStore.getAnalysisByTurn(turn.id) : null;
    if (analysis) return analysis.responseText;
  }
  const session = await interviewStore.getSession(input.session.id);
  if (!session || !['ready', 'in_progress'].includes(session.status)) throw new Error('Session is not active');
  const question = demoQuestion(session);
  const delivered = events.some((event) => event.type === 'question.delivered'
    && event.payload.questionId === question.id);
  const saveResponse = async (text: string) => {
    await interviewStore.appendEvent(session.id, 'demo.response', {
      requestId: input.upstreamTurnId, questionId: question.id, text,
    });
    return text;
  };
  if (!delivered) {
    // Speech that interrupts an unheard question cannot complete that role.
    // Rephrase/resume that question instead of silently skipping it.
    return saveResponse(`Let me repeat the question. ${question.text}`);
  }

  const prior = events.filter((event) => event.type === 'answer.fragment'
    && event.payload.questionId === question.id);
  if (!prior.some((event) => event.payload.requestId === input.upstreamTurnId)) {
    await interviewStore.appendEvent(session.id, 'answer.fragment', {
      questionId: question.id, requestId: input.upstreamTurnId, text: input.answer.slice(0, 12_000),
    });
  }
  const answer = mergeAnswerFragments([
    ...prior.map((event) => String(event.payload.text ?? '')),
    input.answer,
  ]).slice(0, 24_000);
  if (isIncompleteDemoAnswer(answer, session.activeRole)) {
    // Silence lets a candidate finish a broken sentence without another voice
    // competing with them. An introduction gets a focused project reminder.
    return saveResponse(session.activeRole === 'hiring_manager' && answer.split(/\s+/).length >= 8
      ? 'Thank you. Tell me about one project you personally worked on.' : '');
  }
  // One accepted answer per question, even if two ASR requests race. The store's
  // compare-and-swap is the cross-process arbiter; the stable reservation key
  // ensures both calls converge on the same answer and cached response.
  const result = await processCandidateTurn({
    session, answer, upstreamTurnId: question.id,
    reservationKey: turnDedupeKey(session.id, question.id, 'demo-answer'),
  });
  return saveResponse(result.responseText);
}
