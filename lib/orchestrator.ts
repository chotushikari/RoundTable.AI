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
    return await runRealLLMAnalysis(session);
  }
  return null;
}

const SYSTEM_PROMPT = `
You are the Lead Technical Assessor for RoundTable AI. Your job is to analyze the ongoing interview transcript and update the candidate's state vector based on the evidence they provide.

Scoring Rules (Technical AI Policy):
- If the candidate provides specific, accurate technical details, increase 'technical' score.
- If the candidate describes business impact or user empathy, increase 'product' score.
- If the candidate discusses architecture, trade-offs, or scale, increase 'systemDesign' score.
- If the candidate communicates clearly and concisely, increase 'communication' score.
- If the candidate is vague or incorrect, decrease the relevant scores slightly.

You must output a JSON object containing the delta (-0.2 to +0.2) for each category, a short reasoning string, and optionally a nextAction if a role switch is recommended (e.g., if a category score crosses 0.7, you might recommend switching to another role to test a different skill).
`;

async function runRealLLMAnalysis(session: Session): Promise<NextInterviewAction | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Orchestrator] Missing GEMINI_API_KEY');
    return null;
  }

  // Use the last 10 turns to give the LLM context of the recent conversation
  const recentTranscript = session.transcript.slice(-10).join('\n');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  
  const schema = {
    type: "OBJECT",
    properties: {
      deltas: {
        type: "OBJECT",
        properties: {
          technical: { type: "NUMBER" },
          product: { type: "NUMBER" },
          systemDesign: { type: "NUMBER" },
          communication: { type: "NUMBER" },
          confidence: { type: "NUMBER" }
        },
        required: ["technical", "product", "systemDesign", "communication", "confidence"]
      },
      reasoning: { type: "STRING" },
      nextAction: {
        type: "OBJECT",
        nullable: true,
        properties: {
          modality: { type: "STRING", enum: ["voice", "code", "scenario"] },
          role: { type: "STRING", enum: ["technical", "product", "manager"] },
          objective: { type: "STRING" }
        },
        required: ["modality", "role", "objective"]
      }
    },
    required: ["deltas", "reasoning"]
  };

  const payload = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        parts: [{
          text: `Current Candidate State (Scale 0.0 to 1.0):\nTechnical: ${session.state.technical.toFixed(2)}\nProduct: ${session.state.product.toFixed(2)}\nSystem Design: ${session.state.systemDesign.toFixed(2)}\nCommunication: ${session.state.communication.toFixed(2)}\nConfidence: ${session.state.confidence.toFixed(2)}\n\nRecent Transcript:\n${recentTranscript}\n\nAnalyze the candidate's latest response. Generate the state deltas and determine if a role switch is needed.`
        }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[Orchestrator] Gemini API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    const object = JSON.parse(resultText);

    // Apply the JSON deltas directly to the in-memory state vector
    session.state.technical = Math.max(0, Math.min(1.0, session.state.technical + object.deltas.technical));
    session.state.product = Math.max(0, Math.min(1.0, session.state.product + object.deltas.product));
    session.state.systemDesign = Math.max(0, Math.min(1.0, session.state.systemDesign + object.deltas.systemDesign));
    session.state.communication = Math.max(0, Math.min(1.0, session.state.communication + object.deltas.communication));
    session.state.confidence = Math.max(0, Math.min(1.0, session.state.confidence + object.deltas.confidence));

    console.log(`\n[Orchestrator] Candidate State Updated for ${session.agentUid}:`, session.state);
    console.log(`[Orchestrator] Reasoning:`, object.reasoning);

    if (object.nextAction && object.nextAction.role) {
      console.log(`[Orchestrator] Recommending role switch to ${object.nextAction.role}.`);
      return object.nextAction as NextInterviewAction;
    }

    return null;

  } catch (error) {
    console.error('[Orchestrator] LLM Analysis failed:', error);
    return null;
  }
}
