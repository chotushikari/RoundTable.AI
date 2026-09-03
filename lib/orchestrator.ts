export interface CandidateState {
  technical: number;
  product: number;
  systemDesign: number;
  communication: number;
  confidence: number;
}

export interface NextInterviewAction {
  modality: 'voice' | 'code' | 'scenario';
  role: 'technical' | 'product' | 'manager';
  objective: string;
}

interface Session {
  agentUid: string;
  channelName: string;
  state: CandidateState;
  transcript: string[];
}

// In-memory store for Hackathon
const sessions: Record<string, Session> = {};

export function getOrCreateSession(agentUid: string, channelName: string): Session {
  if (!sessions[agentUid]) {
    sessions[agentUid] = {
      agentUid,
      channelName,
      state: {
        technical: 0.1,
        product: 0.1,
        systemDesign: 0.1,
        communication: 0.1,
        confidence: 0.1,
      },
      transcript: [],
    };
  }
  return sessions[agentUid];
}

export async function processTranscriptTurn(agentUid: string, text: string, speaker: 'user' | 'agent') {
  const session = sessions[agentUid];
  if (!session) return null;

  session.transcript.push(`[${speaker}] ${text}`);

  // Only process deep analysis on user turns
  if (speaker === 'user') {
    return await runMockLLMAnalysis(session);
  }
  return null;
}

async function runMockLLMAnalysis(session: Session): Promise<NextInterviewAction | null> {
  // Simulate network latency for LLM processing
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock intelligence: Increase technical confidence by 0.2 per turn
  session.state.technical = Math.min(1.0, session.state.technical + 0.2);
  session.state.confidence = Math.min(1.0, session.state.confidence + 0.1);

  console.log(`[Orchestrator] Candidate State Updated for ${session.agentUid}:`, session.state);

  // If technical confidence > 0.6, switch to product role
  if (session.state.technical > 0.6 && session.state.product < 0.5) {
    console.log(`[Orchestrator] Technical confidence high. Recommending role switch to Product.`);
    return {
      modality: 'voice',
      role: 'product',
      objective: 'Assess customer impact of the technical architecture.',
    };
  }

  return null;
}
