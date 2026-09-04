import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { hashToken } from '@/lib/security';
import { requireCompanyContext } from '@/lib/supabase-admin';
import { requireCandidateSession } from '@/lib/api-auth';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invitation = await interviewStore.getInvitationByTokenHash(hashToken(token));
    if (!invitation || invitation.revokedAt) throw new Error('Invitation not found or revoked');
    if (Date.parse(invitation.expiresAt) <= Date.now()) throw new Error('Invitation has expired');
    const version = await interviewStore.getInterviewVersion(invitation.interviewVersionId);
    if (!version) throw new Error('Interview version not found');
    let existingSession: { id: string; status: string } | null = null;
    if (invitation.claimedAt) {
      const claimedSession = await interviewStore.getSessionByInvitation(invitation.id);
      const authenticated = await requireCandidateSession(request).catch(() => null);
      if (claimedSession && authenticated?.id === claimedSession.id) {
        existingSession = { id: claimedSession.id, status: claimedSession.status };
      }
    }
    return NextResponse.json({
      roleTitle: version.definition.roleTitle,
      durationMinutes: version.definition.durationMinutes,
      panelRoles: version.definition.panelRoles,
      expiresAt: invitation.expiresAt,
      alreadyUsed: Boolean(invitation.claimedAt),
      existingSession,
      disclosure: {
        aiPanel: true,
        retentionDays: 30,
        humanReviewRequired: true,
        rawMediaRecorded: false,
      },
    });
  } catch (error) {
    return apiError(error, 'Failed to load invitation');
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const company = await requireCompanyContext(request);
    const { token: invitationId } = await params;
    const invitation = await interviewStore.revokeInvitation(invitationId, company.organizationId);
    return NextResponse.json({ invitation: { ...invitation, tokenHash: undefined } });
  } catch (error) {
    return apiError(error, 'Failed to revoke invitation');
  }
}
