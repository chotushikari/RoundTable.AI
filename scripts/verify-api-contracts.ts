import { AgoraClient, Agent } from 'agora-agents';
import { RtcTokenBuilder } from 'agora-token';
import { NextRequest } from 'next/server';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

process.env.NEXT_PUBLIC_AGORA_APP_ID = '0123456789abcdef0123456789abcdef';
process.env.NEXT_AGORA_APP_CERTIFICATE = 'fedcba9876543210fedcba9876543210';

async function verifyGenerateAgoraTokenRoute() {
  const { GET: generateAgoraToken } =
    await import('../app/api/generate-agora-token/route');
  const originalBuildTokenWithRtm = RtcTokenBuilder.buildTokenWithRtm;
  let tokenBuilderArgs: unknown[] | null = null;

  RtcTokenBuilder.buildTokenWithRtm = ((...args: unknown[]) => {
    tokenBuilderArgs = args;
    return 'mock-rtc-rtm-token';
  }) as typeof RtcTokenBuilder.buildTokenWithRtm;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/generate-agora-token?uid=4321&channel=test-channel',
    );
    const response = await generateAgoraToken(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'GET /api/generate-agora-token should return 200',
    );
    assert(
      body.token === 'mock-rtc-rtm-token',
      'GET /api/generate-agora-token should return the built token',
    );
    assert(
      body.uid === '4321',
      'GET /api/generate-agora-token should preserve the requested uid',
    );
    assert(
      body.channel === 'test-channel',
      'GET /api/generate-agora-token should preserve the requested channel',
    );

    assert(
      Array.isArray(tokenBuilderArgs),
      'GET /api/generate-agora-token should call buildTokenWithRtm',
    );
    assert(
      tokenBuilderArgs?.[2] === 'test-channel',
      'buildTokenWithRtm should use the requested channel',
    );
    assert(
      tokenBuilderArgs?.[3] === '4321',
      'buildTokenWithRtm should receive the requested uid as account string',
    );
  } finally {
    RtcTokenBuilder.buildTokenWithRtm = originalBuildTokenWithRtm;
  }
}

async function verifyGenerateAgoraTokenReplacesZeroUid() {
  const { GET: generateAgoraToken } =
    await import('../app/api/generate-agora-token/route');
  const originalBuildTokenWithRtm = RtcTokenBuilder.buildTokenWithRtm;
  let tokenBuilderArgs: unknown[] | null = null;

  RtcTokenBuilder.buildTokenWithRtm = ((...args: unknown[]) => {
    tokenBuilderArgs = args;
    return 'mock-rtc-rtm-token';
  }) as typeof RtcTokenBuilder.buildTokenWithRtm;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/generate-agora-token?uid=0&channel=test-channel',
    );
    const response = await generateAgoraToken(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'GET /api/generate-agora-token?uid=0 should return 200',
    );
    assert(
      typeof body.uid === 'string' && body.uid !== '0',
      'GET /api/generate-agora-token?uid=0 should generate an RTM-safe uid',
    );
    assert(
      Array.isArray(tokenBuilderArgs) && tokenBuilderArgs[3] === body.uid,
      'buildTokenWithRtm should mint the token for the generated uid',
    );
  } finally {
    RtcTokenBuilder.buildTokenWithRtm = originalBuildTokenWithRtm;
  }
}

async function verifyChatCompletionsMissingEnv() {
  const { createChatCompletionsHandler } =
    await import('../app/api/chat/completions/route');
  const originalApiKey = process.env.GEMINI_API_KEY;

  delete process.env.GEMINI_API_KEY;

  const handler = createChatCompletionsHandler({
    createOpenAIClient: (() => {
      throw new Error('createOpenAI should not be called when env is missing');
    }) as never,
    streamTextImpl: (() => {
      throw new Error('streamText should not be called when env is missing');
    }) as never,
  });

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/chat/completions',
      {
        body: JSON.stringify({ messages: [] }),
        method: 'POST',
      },
    );
    const response = await handler(request);
    const body = await getJson(response);

    assert(
      response.status === 500,
      'POST /api/chat/completions should reject missing LLM env',
    );
    assert(
      body.error === 'GEMINI_API_KEY must be set',
      'POST /api/chat/completions should explain missing LLM env',
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  }
}

async function verifyChatCompletionsInvalidJson() {
  const { createChatCompletionsHandler } =
    await import('../app/api/chat/completions/route');
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';

  const handler = createChatCompletionsHandler({
    createOpenAIClient: (() => {
      throw new Error('createOpenAI should not be called for invalid JSON');
    }) as never,
    streamTextImpl: (() => {
      throw new Error('streamText should not be called for invalid JSON');
    }) as never,
  });

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/chat/completions',
      {
        body: '{not json',
        method: 'POST',
      },
    );
    const response = await handler(request);
    const body = await getJson(response);

    assert(
      response.status === 400,
      'POST /api/chat/completions should reject invalid JSON',
    );
    assert(
      body.error === 'Invalid JSON body',
      'POST /api/chat/completions should explain invalid JSON',
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  }
}

async function verifyChatCompletionsSseDone() {
  const { createChatCompletionsHandler } =
    await import('../app/api/chat/completions/route');
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';

  let capturedBaseUrl: string | undefined;
  let capturedModelId: string | undefined;
  let capturedMessages: unknown;
  let capturedSystem: unknown;

  const handler = createChatCompletionsHandler({
    createOpenAIClient: ((options: { baseURL?: string }) => {
      capturedBaseUrl = options.baseURL;
      return (modelId: string) => {
        capturedModelId = modelId;
        return { modelId };
      };
    }) as never,
    streamTextImpl: ((options: { messages?: unknown; system?: unknown }) => {
      capturedMessages = options.messages;
      capturedSystem = options.system;
      return {
        textStream: (async function* () {
          yield 'hello';
          yield ' world';
        })(),
      };
    }) as never,
  });

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/chat/completions',
      {
        body: JSON.stringify({
          model: 'caller-model-ignored-for-routing',
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        method: 'POST',
      },
    );
    const response = await handler(request);
    const text = await response.text();

    assert(
      response.status === 200,
      'POST /api/chat/completions should return 200 for a valid request',
    );
    assert(
      response.headers.get('content-type') === 'text/event-stream',
      'POST /api/chat/completions should return SSE content type',
    );
    assert(
      capturedBaseUrl === 'https://generativelanguage.googleapis.com/v1beta/openai',
      'POST /api/chat/completions should target the Gemini OpenAI-compat base URL',
    );
    assert(
      capturedModelId === 'gemini-2.0-flash',
      'POST /api/chat/completions should route to the pinned Gemini model',
    );
    assert(
      JSON.stringify(capturedMessages) ===
        JSON.stringify([{ role: 'user', content: 'Hi' }]),
      'POST /api/chat/completions should pass request messages to streamText',
    );
    assert(
      typeof capturedSystem === 'string' && (capturedSystem as string).length > 0,
      'POST /api/chat/completions should inject a control-plane system prompt',
    );
    assert(
      text.includes('data: [DONE]'),
      'POST /api/chat/completions should terminate with [DONE]',
    );
    assert(
      text.includes('"content":"hello"') && text.includes('"content":" world"'),
      'POST /api/chat/completions should stream text chunks as OpenAI-compatible deltas',
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  }
}

async function verifyInviteAgentValidation() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const request = new NextRequest('http://localhost:3000/api/invite-agent', {
    body: JSON.stringify({ channel_name: 'missing-requester' }),
    method: 'POST',
  });
  const response = await inviteAgent(request);
  const body = await getJson(response);

  assert(
    response.status === 400,
    'POST /api/invite-agent should reject missing fields',
  );
  assert(
    body.error === 'channel_name and requester_id are required',
    'POST /api/invite-agent should explain validation failure',
  );
}

async function verifyInviteAgentSuccess() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const originalCreateSession = Agent.prototype.createSession;
  let capturedSessionConfig: {
    channel?: string;
    agentUid?: string;
    remoteUids?: string[];
  } | null = null;

  Agent.prototype.createSession = ((sessionConfig: unknown) => {
    capturedSessionConfig = sessionConfig as {
      channel?: string;
      agentUid?: string;
      remoteUids?: string[];
    };
    return {
      start: async () => 'mock-agent-id',
    };
  }) as unknown as typeof Agent.prototype.createSession;

  try {
    const request = new NextRequest('http://localhost:3000/api/invite-agent', {
      body: JSON.stringify({
        requester_id: 'user-4321',
        channel_name: 'test-channel',
      }),
      method: 'POST',
    });
    const response = await inviteAgent(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'POST /api/invite-agent should return 200 on success',
    );
    assert(
      body.agent_id === 'mock-agent-id',
      'POST /api/invite-agent should return the started agent id',
    );
    assert(
      body.state === 'RUNNING',
      'POST /api/invite-agent should return RUNNING state',
    );
    assert(
      capturedSessionConfig !== null,
      'POST /api/invite-agent should call createSession',
    );
    const sessionConfig = capturedSessionConfig as {
      channel?: string;
      agentUid?: string;
      remoteUids?: string[];
    };

    assert(
      sessionConfig.channel === 'test-channel',
      'POST /api/invite-agent should pass the requested channel to createSession',
    );
    assert(
      sessionConfig.agentUid === '123456',
      'POST /api/invite-agent should use the shared default agent UID',
    );
    assert(
      JSON.stringify(sessionConfig.remoteUids) ===
        JSON.stringify(['user-4321']),
      'POST /api/invite-agent should scope the session to the requesting user',
    );
  } finally {
    Agent.prototype.createSession = originalCreateSession;
  }
}

async function verifyStopConversationValidation() {
  const { POST: stopConversation } =
    await import('../app/api/stop-conversation/route');
  const request = new NextRequest(
    'http://localhost:3000/api/stop-conversation',
    {
      body: JSON.stringify({}),
      method: 'POST',
    },
  );
  const response = await stopConversation(request);
  const body = await getJson(response);

  assert(
    response.status === 400,
    'POST /api/stop-conversation should reject missing agent_id',
  );
  assert(
    body.error === 'agent_id is required',
    'POST /api/stop-conversation should explain validation failure',
  );
}

async function verifyStopConversationSuccess() {
  const { POST: stopConversation } =
    await import('../app/api/stop-conversation/route');
  const originalStopAgent = AgoraClient.prototype.stopAgent;
  let stoppedAgentId: string | null = null;

  AgoraClient.prototype.stopAgent = async function (
    this: AgoraClient,
    agentId: string,
  ) {
    stoppedAgentId = agentId;
  } as typeof AgoraClient.prototype.stopAgent;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/stop-conversation',
      {
        body: JSON.stringify({ agent_id: 'mock-agent-id' }),
        method: 'POST',
      },
    );
    const response = await stopConversation(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'POST /api/stop-conversation should return 200 on success',
    );
    assert(
      body.success === true,
      'POST /api/stop-conversation should return success',
    );
    assert(
      stoppedAgentId === 'mock-agent-id',
      'POST /api/stop-conversation should call stopAgent with the requested agent id',
    );
  } finally {
    AgoraClient.prototype.stopAgent = originalStopAgent;
  }
}

async function main() {
  await verifyGenerateAgoraTokenRoute();
  await verifyGenerateAgoraTokenReplacesZeroUid();
  await verifyChatCompletionsMissingEnv();
  await verifyChatCompletionsInvalidJson();
  await verifyChatCompletionsSseDone();
  await verifyInviteAgentValidation();
  await verifyInviteAgentSuccess();
  await verifyStopConversationValidation();
  await verifyStopConversationSuccess();

  console.log('API contract checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
