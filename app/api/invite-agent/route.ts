import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

/**
 * Fallback/base instructions given to Agora at session start.
 *
 * IMPORTANT (R2): the REAL per-turn behavior — active interviewer persona,
 * shared candidate state, objective, and guardrails — is injected by our
 * custom-LLM proxy (`/api/chat/completions`) on every turn. Agora is pointed at
 * that proxy via BYOK below, so this string is only a safety-net identity in
 * case a turn reaches the model without proxy augmentation. Keep it minimal and
 * consistent with the proxy's rules.
 */
const BASE_INSTRUCTIONS = `You are the interviewer for RoundTable, a live voice interview. Speak naturally and concisely (1–3 sentences), ask at most one question per turn, and base every follow-up on what the candidate actually said. You are one interviewer whose perspective may shift between turns; never mention roles, scores, or that you are an AI panel.`;

// First thing the agent says when a user joins the channel.
const GREETING = `Hi, welcome. Thanks for making the time today. To get us started, tell me a bit about something you've built recently that you're proud of.`;

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, interview_id } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    // The custom-LLM proxy (control plane) that drives shared-brain personas.
    // Agora calls this per turn; we thread interview_id so the proxy can load
    // the right CandidateState. PUBLIC_APP_URL must be the deployment's base URL
    // (e.g. https://roundtable-ai-git-piyush-you.vercel.app) so Agora's servers
    // can reach it — localhost will NOT work from Agora's cloud.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    const proxyUrl = appUrl
      ? `${appUrl}/api/chat/completions${interview_id ? `?interview_id=${encodeURIComponent(interview_id)}` : ''}`
      : undefined;

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline: Deepgram (reseller) STT → OpenAI (reseller) LLM → MiniMax (reseller) TTS.
    // Omit vendor API keys for supported models — AgentKit infers reseller presets on start (see Agora Console / billing).
    const agent = new Agent({
      client,
      instructions: BASE_INSTRUCTIONS,
      greeting: GREETING,
      failureMessage: 'Please wait a moment.',
      maxHistory: 50,
      // VAD controls how the agent detects the start and end of a user's turn.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // ms of speech before interruption triggers
              prefix_padding_ms: 300, // audio captured before speech is detected
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480, // ms of silence before turn ends
            },
          },
        },
      },
      // RTM is required for transcript events in the browser client.
      // enable_tools is required for MCP tool invocation.
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      // Required for browser RTM events:
      // - data_channel: 'rtm' enables RTM delivery path for state/metrics/errors
      // - enable_error_message emits AGENT_ERROR payloads
      // - enable_metrics emits AGENT_METRICS latency payloads
      parameters: {
        // web client → ultra-low-latency chorus profile
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'en',
        }),
        // BYOK: uncomment the following block and set NEXT_DEEPGRAM_API_KEY
        // new DeepgramSTT({
        //   apiKey: requireEnv('NEXT_DEEPGRAM_API_KEY'),
        //   model: 'nova-3',
        //   language: 'en',
        // }),
      )
      .withLlm(
        proxyUrl
          ? // CONTROL PLANE: route every turn through our custom-LLM proxy.
            // The proxy is OpenAI-compatible and injects persona + shared state
            // per turn. apiKey is a shared secret Agora presents to the proxy;
            // the proxy itself holds the real Gemini key server-side.
            new OpenAI({
              apiKey: process.env.NEXT_LLM_PROXY_KEY ?? 'roundtable-proxy',
              url: proxyUrl,
              model: 'roundtable-control-plane',
              greetingMessage: GREETING,
              failureMessage: 'Please wait a moment.',
              maxHistory: 15,
              maxTokens: 1024,
              temperature: 0.7,
              topP: 0.95,
            })
          : // Fallback: Agora-managed model (used only if NEXT_PUBLIC_APP_URL is unset,
            // e.g. very first local smoke test before deploy).
            new OpenAI({
              model: 'gpt-4o-mini',
              greetingMessage: GREETING,
              failureMessage: 'Please wait a moment.',
              maxHistory: 15,
              params: {
                max_tokens: 1024,
                temperature: 0.7,
                top_p: 0.95,
              },
            }),
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1',
        }),
        // BYOK — ElevenLabs (set NEXT_ELEVENLABS_API_KEY; optional NEXT_ELEVENLABS_VOICE_ID)
        // new (await import('agora-agents')).ElevenLabsTTS({
        //   key: requireEnv('NEXT_ELEVENLABS_API_KEY'),
        //   modelId: 'eleven_flash_v2_5',
        //   voiceId: process.env.NEXT_ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB',
        //   sampleRate: 24000,
        // }),
      );

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false, // enable debug to show restful API calls in the console
    });

    const agentId = await session.start();

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
