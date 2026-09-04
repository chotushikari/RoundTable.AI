import { randomInt } from 'crypto';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import {
  AgoraClient,
  Agent,
  Area,
  CustomLLM,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
} from 'agora-agents';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

const TOKEN_TTL_SECONDS = 3_600;

function requireAgoraEnv(name: 'NEXT_PUBLIC_AGORA_APP_ID' | 'NEXT_AGORA_APP_CERTIFICATE'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createAgoraChannel(sessionId: string): string {
  return `roundtable-${sessionId.replaceAll('-', '').slice(0, 20)}`;
}

export function createAgoraRtcUid(): string {
  return String(randomInt(1_000, 2_000_000_000));
}

export function createAgoraToken(channel: string, uid: string): { token: string; expiresAt: string } {
  const appId = requireAgoraEnv('NEXT_PUBLIC_AGORA_APP_ID');
  const certificate = requireAgoraEnv('NEXT_AGORA_APP_CERTIFICATE');
  const expires = Math.floor(Date.now() / 1_000) + TOKEN_TTL_SECONDS;
  return {
    token: RtcTokenBuilder.buildTokenWithRtm(
      appId,
      certificate,
      channel,
      uid,
      RtcRole.PUBLISHER,
      expires,
      expires,
    ),
    expiresAt: new Date(expires * 1_000).toISOString(),
  };
}

function baseUrl(): string {
  const url = process.env.APP_BASE_URL ?? process.env.VERCEL_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') throw new Error('APP_BASE_URL is required');
    return 'http://localhost:3000';
  }
  return url.startsWith('http') ? url.replace(/\/$/, '') : `https://${url.replace(/\/$/, '')}`;
}

export async function startInterviewAgent({
  sessionId,
  channel,
  rtcUid,
  llmToken,
}: {
  sessionId: string;
  channel: string;
  rtcUid: string;
  llmToken: string;
}): Promise<string> {
  const client = new AgoraClient({
    area: Area.AP,
    appId: requireAgoraEnv('NEXT_PUBLIC_AGORA_APP_ID'),
    appCertificate: requireAgoraEnv('NEXT_AGORA_APP_CERTIFICATE'),
  });
  const greeting = `Hello. This is RoundTable, an AI interview panel. I will ask adaptive questions and a human will review the transcript and evidence before making any decision. This interview is retained for 30 days. Let's begin: please briefly introduce yourself and the experience most relevant to this role.`;
  const instructions = `You are the voice executor for RoundTable's AI interview panel. The application-controlled custom LLM selects exactly one panel role and one question per turn. Speak its text faithfully and concisely. Never claim to be human. Never make a hire or reject decision. Allow the candidate to interrupt naturally.`;

  const agent = new Agent({
    client,
    instructions,
    greeting,
    failureMessage: 'I had trouble evaluating that answer. Could you give one concrete example with your own action and result?',
    maxHistory: 50,
    turnDetection: {
      config: {
        speech_threshold: 0.5,
        start_of_speech: {
          mode: 'vad',
          vad_config: { interrupt_duration_ms: 160, prefix_padding_ms: 300 },
        },
        end_of_speech: {
          mode: 'vad',
          vad_config: { silence_duration_ms: 480 },
        },
      },
    },
    advancedFeatures: { enable_rtm: true, enable_tools: true },
    parameters: {
      audio_scenario: 'chorus',
      data_channel: 'rtm',
      enable_error_message: true,
      enable_metrics: true,
    },
  })
    .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
    .withLlm(new CustomLLM({
      apiKey: llmToken,
      url: `${baseUrl()}/api/ai/chat/completions`,
      model: 'roundtable-controller',
      systemMessages: [{ role: 'system', content: instructions }],
    }))
    .withTts(new MiniMaxTTS({
      model: 'speech_2_6_turbo',
      voiceId: 'English_captivating_female1',
    }));

  const session = agent.createSession({
    channel,
    agentUid: String(DEFAULT_AGENT_UID),
    remoteUids: [rtcUid],
    idleTimeout: 30,
    expiresIn: ExpiresIn.hours(1),
    debug: false,
  });
  const agentId = await session.start();
  console.info('[agora] interview agent started', { sessionId, agentId });
  return agentId;
}

export async function stopInterviewAgent(agentId: string): Promise<void> {
  const client = new AgoraClient({
    area: Area.AP,
    appId: requireAgoraEnv('NEXT_PUBLIC_AGORA_APP_ID'),
    appCertificate: requireAgoraEnv('NEXT_AGORA_APP_CERTIFICATE'),
  });
  try {
    await client.stopAgent(agentId);
  } catch (error) {
    const item = error as { statusCode?: number; body?: { detail?: string } };
    const detail = item.body?.detail?.toLocaleLowerCase() ?? '';
    if (item.statusCode === 404 || detail.includes('already in the process of shutting down')) return;
    throw error;
  }
}
