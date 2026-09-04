import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCandidateSession } from '@/lib/api-auth';
import { apiError } from '@/lib/http';
import { executeWorkspaceTool } from '@/lib/workspace-tools';

const ToolSchema = z.object({
  name: z.literal('run_code_tests'),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireCandidateSession(request, id);
    const body = ToolSchema.parse(await request.json());
    const run = await executeWorkspaceTool(id, body.name, body.arguments);
    return NextResponse.json({ status: run.status, output: run.output });
  } catch (error) {
    return apiError(error, 'Failed to run workspace tests');
  }
}
