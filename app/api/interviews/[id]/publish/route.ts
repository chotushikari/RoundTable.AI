import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';
import { createOpaqueToken, hashToken } from '@/lib/security';
import { requireCompanyContext } from '@/lib/supabase-admin';

const PublishSchema = z.object({
  candidateName: z.string().trim().min(1).max(160).nullable().optional(),
  candidateEmail: z.string().trim().email().max(320).nullable().optional(),
  expiresInDays: z.number().int().min(1).max(7).default(7),
});

function applicationBaseUrl(request: Request): string {
  return (process.env.APP_BASE_URL ?? new URL(request.url).origin).replace(/\/$/, '');
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const company = await requireCompanyContext(request);
    const { id } = await params;
    const body = PublishSchema.parse(await request.json().catch(() => ({})));
    const interview = await interviewStore.getInterview(id, company.organizationId);
    if (!interview) throw new Error('Interview not found');
    if (!interview.plan) throw new Error('Generate and review an interview plan before publishing');
    const version = await interviewStore.createInterviewVersion(interview);
    const rawToken = createOpaqueToken();
    const createdAt = new Date().toISOString();
    const invitation = await interviewStore.createInvitation({
      id: randomUUID(),
      interviewId: interview.id,
      interviewVersionId: version.id,
      organizationId: company.organizationId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + body.expiresInDays * 86_400_000).toISOString(),
      revokedAt: null,
      claimedAt: null,
      candidateName: body.candidateName ?? null,
      candidateEmail: body.candidateEmail ?? null,
      resumePath: null,
      createdAt,
    });
    return NextResponse.json({
      invitation: { ...invitation, tokenHash: undefined },
      invitationUrl: `${applicationBaseUrl(request)}/interview/${rawToken}`,
    }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Failed to publish interview');
  }
}
