import { z } from 'zod';

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
};

function extractText(payload: GeminiResponse): string {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  );
}

export function configuredGeminiModel(
  purpose: 'evaluator' | 'speaker' | 'planner' | 'assessment',
): string {
  if (purpose === 'evaluator') {
    return process.env.GEMINI_EVALUATOR_MODEL ?? 'gemini-3.5-flash-lite';
  }
  return process.env.GEMINI_SPEAKER_MODEL ?? 'gemini-3.7-flash';
}

export async function generateGeminiJson<T>({
  model,
  system,
  prompt,
  schema,
  signal,
}: {
  model: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(schema),
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1_000);
    throw new Error(`Gemini ${model} returned ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = extractText(payload);
  if (!text) throw new Error(`Gemini ${model} returned no text`);
  return schema.parse(JSON.parse(text));
}

export async function generateGeminiText({
  model,
  system,
  prompt,
  signal,
}: {
  model: string;
  system: string;
  prompt: string;
  signal?: AbortSignal;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.45, maxOutputTokens: 180 },
      }),
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1_000);
    throw new Error(`Gemini ${model} returned ${response.status}: ${detail}`);
  }
  const text = extractText((await response.json()) as GeminiResponse);
  if (!text) throw new Error(`Gemini ${model} returned no text`);
  return text;
}
