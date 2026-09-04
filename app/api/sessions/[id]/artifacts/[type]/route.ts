import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCandidateSession } from '@/lib/api-auth';
import { apiError } from '@/lib/http';
import { interviewStore } from '@/lib/interview-store';

const ArtifactSchema = z.object({ expectedVersion: z.number().int().min(0), content: z.unknown() });

export async function GET(request: Request, { params }: { params: Promise<{ id: string; type: string }> }) {
  try {
    const { id, type } = await params;
    await requireCandidateSession(request, id);
    if (type !== 'code' && type !== 'canvas') throw new Error('Only code and canvas artifacts are supported');
    return NextResponse.json({ artifact: await interviewStore.getArtifact(id, type) });
  } catch (error) {
    return apiError(error, 'Failed to load workspace artifact');
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; type: string }> }) {
  try {
    const { id, type } = await params;
    await requireCandidateSession(request, id);
    if (type !== 'code' && type !== 'canvas') throw new Error('Only code and canvas artifacts are supported');
    const body = ArtifactSchema.parse(await request.json());
    const serialized = JSON.stringify(body.content);
    if (serialized.length > 100_000) throw new Error('Artifact exceeds the 100 KB limit');
    const artifact = await interviewStore.saveArtifact(id, type, body.content, body.expectedVersion);
    await interviewStore.appendEvent(id, 'workspace.checkpoint', { type, version: artifact.version, bytes: serialized.length });
    return NextResponse.json({ artifact });
  } catch (error) {
    return apiError(error, 'Failed to save workspace checkpoint');
  }
}
