import { z } from 'zod';
import type { EvidenceRef, FinalAssessment, TranscriptTurnRecord } from '@/types/interview';

export const ASSESSMENT_PROMPT_BYTES = 4_000;
export const AssessmentNarrativeSchema = z.object({
  notes: z.array(z.object({
    key: z.string().max(8),
    summary: z.string().min(10).max(240),
    evidence: z.array(z.string().max(8)).min(1).max(2),
  })).max(15),
});

// The model adds short narratives to already validated evidence. It does not
// need the full transcript, plan, analyses and fallback report repeated together.
export function buildAssessmentPacket(fallback: FinalAssessment, turns: TranscriptTurnRecord[]) {
  const candidates = new Map(turns.filter((turn) => turn.speaker === 'candidate').map((turn) => [turn.id, turn.text]));
  const entries = [
    ...fallback.competencies.map((item, index) => ({ key: `c${index}`, name: item.name.slice(0, 32), evidence: item.evidence })),
    ...fallback.roleViews.map((item, index) => ({ key: `r${index}`, name: item.role, evidence: item.evidence })),
  ];
  const packet = {
    entries: entries.map(({ key, name }) => ({ key, name, evidence: [] as string[] })),
    evidence: {} as Record<string, string>,
  };
  const refs = new Map<string, EvidenceRef>();
  const byQuote = new Map<string, string>();
  // Round-robin selection gives every perspective a chance before a second quote.
  for (let round = 0; round < 2; round++) {
    for (let index = 0; index < entries.length; index++) {
      const ref = entries[index].evidence[round];
      if (!ref?.turnId || !ref.quote || !candidates.get(ref.turnId)?.includes(ref.quote)) continue;
      const quote = ref.quote.slice(0, 180);
      const identity = `${ref.turnId}:${quote}`;
      const existing = byQuote.get(identity);
      const id = existing ?? `e${refs.size}`;
      packet.evidence[id] = quote;
      packet.entries[index].evidence.push(id);
      if (Buffer.byteLength(JSON.stringify(packet), 'utf8') > ASSESSMENT_PROMPT_BYTES) {
        packet.entries[index].evidence.pop();
        if (!existing) delete packet.evidence[id];
        continue;
      }
      refs.set(id, { turnId: ref.turnId, quote });
      byQuote.set(identity, id);
    }
  }
  return { prompt: JSON.stringify(packet), entries: packet.entries, refs };
}

export function applyAssessmentNarratives(
  fallback: FinalAssessment,
  generated: z.infer<typeof AssessmentNarrativeSchema>,
  packet: ReturnType<typeof buildAssessmentPacket>,
  model: string,
): FinalAssessment {
  const summaryFor = (key: string, original: string) => {
    const note = generated.notes.find((item) => item.key === key);
    const allowed = packet.entries.find((item) => item.key === key)?.evidence ?? [];
    if (!note?.evidence.length || !note.evidence.every((id) => allowed.includes(id) && packet.refs.has(id))) return original;
    return note.summary;
  };
  return {
    ...fallback,
    competencies: fallback.competencies.map((item, index) => ({ ...item, summary: summaryFor(`c${index}`, item.summary) })),
    roleViews: fallback.roleViews.map((item, index) => ({ ...item, summary: summaryFor(`r${index}`, item.summary) })),
    model,
    humanReviewRequired: true,
  };
}
