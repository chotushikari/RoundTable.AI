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

export interface SessionContext {
  agentUid: string;
  state: CandidateState;
  activeRole: 'technical' | 'product' | 'manager';
  recentTranscript: string[]; // Pass the last 10 lines from the frontend
}

export async function processTranscriptTurn(
  session: SessionContext,
  speaker: 'user' | 'agent'
): Promise<{ newState: CandidateState; action: NextInterviewAction | null }> {
  // Only process deep analysis on user turns
  if (speaker === 'user') {
    return await runRealLLMAnalysis(session);
  }
  return { newState: session.state, action: null };
}

const SYSTEM_PROMPT = `
You are the Lead Assessor for RoundTable AI. Your job is to analyze the ongoing interview transcript and update the candidate's state vector based on the evidence they provide.

The current active role you are adopting is dynamically passed to you, but your scoring criteria remain universal:

Scoring Rules (Technical AI Policy):
- If the candidate provides specific, accurate technical details, increase 'technical' score.
- If the candidate discusses architecture, trade-offs, or scale, increase 'systemDesign' score.
- If the candidate describes business impact, user empathy, or metrics, increase 'product' score.
- If the candidate communicates clearly, concisely, or resolves conflict, increase 'communication' score.
- If the candidate is vague or incorrect, decrease the relevant scores slightly.

You must output a JSON object containing the delta (-0.2 to +0.2) for each category, and a short reasoning string.
The backend engine will handle the role transition logic.
`;

async function runRealLLMAnalysis(
  session: SessionContext
): Promise<{ newState: CandidateState; action: NextInterviewAction | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Orchestrator] Missing GEMINI_API_KEY');
    return { newState: session.state, action: null };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  const recentTranscript = session.recentTranscript.join('\n');
  
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
          text: `Current Active Role: ${session.activeRole}\n\nCurrent Candidate State (Scale 0.0 to 1.0):\nTechnical: ${session.state.technical.toFixed(2)}\nProduct: ${session.state.product.toFixed(2)}\nSystem Design: ${session.state.systemDesign.toFixed(2)}\nCommunication: ${session.state.communication.toFixed(2)}\nConfidence: ${session.state.confidence.toFixed(2)}\n\nRecent Transcript:\n${recentTranscript}\n\nAnalyze the candidate's latest response. Generate the state deltas.`
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
      return { newState: session.state, action: null };
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    const object = JSON.parse(resultText);

    // Apply the JSON deltas directly to the new state vector
    const newState: CandidateState = {
      technical: Math.max(0, Math.min(1.0, session.state.technical + object.deltas.technical)),
      product: Math.max(0, Math.min(1.0, session.state.product + object.deltas.product)),
      systemDesign: Math.max(0, Math.min(1.0, session.state.systemDesign + object.deltas.systemDesign)),
      communication: Math.max(0, Math.min(1.0, session.state.communication + object.deltas.communication)),
      confidence: Math.max(0, Math.min(1.0, session.state.confidence + object.deltas.confidence))
    };

    console.log(`\n[Orchestrator] Candidate State Updated for ${session.agentUid}:`, newState);
    console.log(`[Orchestrator] Reasoning:`, object.reasoning);

    let nextAction = null;
    
    // Orchestrator Transition Logic based on activeRole
    if (session.activeRole === 'technical') {
      if (newState.technical > 0.6) {
        console.log(`[Orchestrator] Technical bar met. Transitioning to Product.`);
        nextAction = { modality: 'voice', role: 'product', objective: 'Assess customer impact of the technical architecture.' } as NextInterviewAction;
      }
    } else if (session.activeRole === 'product') {
      if (newState.product > 0.6) {
        console.log(`[Orchestrator] Product bar met. Transitioning to Manager.`);
        nextAction = { modality: 'voice', role: 'manager', objective: 'Assess leadership and conflict resolution.' } as NextInterviewAction;
      }
    } else if (session.activeRole === 'manager') {
      if (newState.communication > 0.6) {
        console.log(`[Orchestrator] Manager/Communication bar met. Transitioning to Code Workspace.`);
        nextAction = { modality: 'code', role: 'technical', objective: 'Implement the cache logic discussed earlier.' } as NextInterviewAction;
      }
    }

    return { newState, action: nextAction };

  } catch (error) {
    console.error('[Orchestrator] LLM Analysis failed:', error);
    return { newState: session.state, action: null };
  }
}
