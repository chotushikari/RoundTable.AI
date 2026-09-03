import { NextResponse } from 'next/server';
import { processTranscriptTurn, NextInterviewAction } from '@/lib/orchestrator';
import { AgoraClient, Area } from 'agora-agents';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // This logs structured events for the Two-Speed Intelligence backend
    console.log('\n[StructuredEvent]', JSON.stringify(data, null, 2));
    
    // In Sprint 02, this is where we will route events to the Candidate State Orchestrator
    if (data.type === 'SESSION_STARTED' && data.agentUID) {
      getOrCreateSession(data.agentUID, data.channelName || 'default');
    }

    if (data.type === 'TRANSCRIPT_FINAL' && data.message) {
      const isUser = data.message.uid === '0' || data.message.uid === 0; // Depends on how toolkit remapped it. Wait, ConversationComponent normalizes it to the RTC local uid.
      // We'll just assume if it's not the agentUID, it's the user.
      // But we don't pass agentUID here easily unless we include it in the payload. Let's assume the client sends it.
      
      const agentUID = data.agentUID || 'default'; //      // If it's a final transcript, we run the Two-Speed deep path analysis
      const speaker = data.message.uid.toString() === agentUID.toString() ? 'agent' : 'user';
      
      const { newState, action } = await processTranscriptTurn({
        agentUid: agentUID,
        state: data.currentState || { technical: 0.1, product: 0.1, systemDesign: 0.1, communication: 0.1, confidence: 0.1 },
        activeRole: data.activeRole || 'technical',
        recentTranscript: data.recentTranscript || []
      }, speaker);
      
      if (action && data.restAgentId) {
        // Trigger agent update!
        await triggerAgentUpdate(agentUID, data.restAgentId, action);
      }

      return NextResponse.json({ success: true, newState, newRole: action?.role || null });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to parse event' }, { status: 400 });
  }
}

async function triggerAgentUpdate(agentUid: string, restAgentId: string, action: NextInterviewAction) {
  console.log(`[Agent Update Required] Triggering Agora REST API to update agent ${restAgentId} to role ${action.role}`);
  
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  
  if (!appId || !appCertificate || !restAgentId) {
    console.error('Missing credentials or restAgentId to trigger update');
    return;
  }

  const client = new AgoraClient({
    area: Area.US,
    appId,
    appCertificate,
  });
  
  const newPrompt = `You are now an expert ${action.role} interviewer. ${action.objective} Keep it brief and ask one question at a time. Guide the candidate naturally.`;
  
  try {
    await client.agents.update({
      agent_id: restAgentId,
      properties: {
        instructions: newPrompt,
      }
    });
    console.log('[Agent Update Success]');
  } catch (error) {
    console.error('[Agent Update Failed]', error);
  }
}
