import { NextResponse } from 'next/server';
import { requireCandidateSession } from '@/lib/api-auth';
import { startInterviewAgent, stopInterviewAgent } from '@/lib/agora-server';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { createOpaqueToken, hashToken } from '@/lib/security';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let session = await requireCandidateSession(request, id);
    if (session.agoraAgentId && session.status === 'in_progress') {
      return NextResponse.json({ agentId: session.agoraAgentId, status: session.status });
    }
    if (session.status === 'starting') {
      return NextResponse.json({ agentId: null, status: 'starting' }, { status: 202 });
    }
    if (session.status !== 'ready') throw new Error('Session is not available to start');

    const llmToken = createOpaqueToken();
    session = await interviewStore.updateSession(id, {
      status: 'starting',
      llmTokenHash: hashToken(llmToken),
      stateVersion: session.stateVersion + 1,
    }, session.stateVersion);

    const version = await interviewStore.getInterviewVersion(session.interviewVersionId);
    if (!version) throw new Error('Published interview plan not found');
    const companyName = await interviewStore.getOrganizationName(session.organizationId);
    let agentId: string | null = null;
    try {
      agentId = await startInterviewAgent({
        sessionId: session.id,
        channel: session.channelName,
        rtcUid: session.rtcUid,
        llmToken,
        roleTitle: version.definition.roleTitle,
        companyName,
        panelRoles: version.definition.panelRoles,
        durationMinutes: version.definition.durationMinutes,
        demoMode: version.definition.demoMode,
      });
      const fresh = (await interviewStore.getSession(id)) ?? session;
      if (fresh.status !== 'starting') {
        await stopInterviewAgent(agentId).catch(() => {});
        throw new Error('Session changed while the agent was starting');
      }
      const updated = await interviewStore.updateSession(id, {
        agoraAgentId: agentId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        stateVersion: fresh.stateVersion + 1,
      }, fresh.stateVersion);
      await interviewStore.appendEvent(id, 'session.started', {}).catch(() => {});
      return NextResponse.json({ agentId, status: updated.status });
    } catch (error) {
      if (agentId) await stopInterviewAgent(agentId).catch(() => {});
      const fresh = await interviewStore.getSession(id);
      if (fresh?.status === 'starting') {
        await interviewStore.updateSession(id, {
          status: 'failed',
          connectionHealth: 'disconnected',
          stateVersion: fresh.stateVersion + 1,
        }, fresh.stateVersion).catch(() => {});
      }
      await interviewStore.appendEvent(id, 'session.start_failed', {
        message: error instanceof Error ? error.message : 'unknown',
      }).catch(() => {});
      throw error;
    }
  } catch (error) {
    return apiError(error, 'Failed to start interview agent');
  }
}
