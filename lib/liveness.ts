import { randomUUID } from 'crypto';

export type LivenessStatus = 'completed' | 'inconclusive' | 'unavailable';

export type LivenessChallenge = {
  id: string;
  phrase: string;
  instruction: string;
  expiresAt: string;
};

const PHRASES = [
  'blue river lantern',
  'orange paper comet',
  'silver cloud meadow',
  'quiet green bridge',
  'bright maple window',
] as const;

export function createLivenessChallenge(): LivenessChallenge {
  const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
  return {
    id: randomUUID(),
    phrase,
    instruction: `Please look to your left, then say: “${phrase}.”`,
    expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
  };
}

export function parseLivenessResult(text: string): { status: LivenessStatus; reason: string } {
  const normalized = text.trim();
  const firstLine = normalized.split(/\r?\n/, 1)[0]?.trim().toUpperCase();
  const status: LivenessStatus = firstLine === 'COMPLETED'
    ? 'completed'
    : firstLine === 'UNAVAILABLE'
      ? 'unavailable'
      : 'inconclusive';
  const reason = normalized.split(/\r?\n/).slice(1).join(' ').replace(/\s+/g, ' ').trim().slice(0, 240);
  return { status, reason: reason || (status === 'completed' ? 'The requested action and phrase were observed.' : 'The clip did not provide a clear result.') };
}

export async function analyzeLivenessClip({
  videoBase64,
  mimeType,
  challenge,
}: {
  videoBase64: string;
  mimeType: 'video/webm' | 'video/mp4';
  challenge: LivenessChallenge;
}): Promise<{ status: LivenessStatus; reason: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY is required for the optional liveness check');
  const model = process.env.GEMINI_VIDEO_MODEL || 'gemini-3.7-flash';
  const prompt = [
    'You are reviewing a voluntary, privacy-preserving liveness interaction for human review only.',
    `Requested action: ${challenge.instruction}`,
    'Return exactly one status on the first line: COMPLETED, INCONCLUSIVE, or UNAVAILABLE.',
    'On the second line, give one short, neutral reason.',
    'COMPLETED only when the clip clearly shows a visible person attempting both the requested head movement and phrase.',
    'Never determine identity, compare this person to anyone, infer personal traits, judge the authenticity of their voice, accuse deception, or make an employment recommendation.',
    'If the video, audio, face, action, or phrase is unclear, return INCONCLUSIVE.',
  ].join('\n');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [
        { inline_data: { mime_type: mimeType, data: videoBase64 } },
        { text: prompt },
      ] }],
      generationConfig: { temperature: 0, maxOutputTokens: 100 },
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Gemini liveness analysis failed (${response.status}): ${detail}`);
  }
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n').trim();
  if (!text) return { status: 'inconclusive', reason: 'The analysis service returned no usable result.' };
  return parseLivenessResult(text);
}
