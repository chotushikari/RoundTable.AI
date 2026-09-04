import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { verifyMcpGrant } from '@/lib/security';
import { executeWorkspaceTool, workspaceToolDefinitions, type WorkspaceToolName } from '@/lib/workspace-tools';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
};

export async function POST(request: Request, { params }: { params: Promise<{ grant: string }> }) {
  try {
    const { grant } = await params;
    const sessionId = verifyMcpGrant(decodeURIComponent(grant));
    if (!sessionId) throw new Error('Invalid or expired MCP grant');
    const message = (await request.json()) as JsonRpcRequest;
    const id = message.id ?? null;
    if (message.method === 'notifications/initialized') return new NextResponse(null, { status: 202 });
    if (message.method === 'initialize') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'roundtable-workspace', version: '1.0.0' } } });
    }
    if (message.method === 'tools/list') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: { tools: workspaceToolDefinitions } });
    }
    if (message.method === 'tools/call') {
      const allowed = workspaceToolDefinitions.map((tool) => tool.name);
      if (!message.params?.name || !allowed.includes(message.params.name as WorkspaceToolName)) {
        return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Tool is not allowed' } });
      }
      const run = await executeWorkspaceTool(sessionId, message.params.name as WorkspaceToolName, message.params.arguments ?? {});
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(run.output) }],
          isError: run.status === 'failed',
        },
      });
    }
    return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  } catch (error) {
    return apiError(error, 'MCP request failed');
  }
}
