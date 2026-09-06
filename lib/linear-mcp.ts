import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

type McpTool = {
  name: string;
  inputSchema?: { properties?: Record<string, unknown>; required?: string[] };
};

export type LinearIssue = {
  id: string | null;
  identifier: string;
  title: string;
  description: string;
  url: string | null;
  status: string | null;
};

export type LinearCommentResult = {
  id: string | null;
  url: string | null;
};

function requireLinearKey(): string {
  const value = process.env.LINEAR_API_KEY?.trim();
  if (!value) throw new Error('Linear is not configured. Add LINEAR_API_KEY on the server.');
  return value;
}

function mcpUrl(): URL {
  return new URL(process.env.LINEAR_MCP_URL?.trim() || 'https://mcp.linear.app/mcp');
}

function findTool(tools: McpTool[], candidates: string[]): McpTool {
  const normalized = candidates.map((name) => name.toLowerCase());
  const tool = tools.find((item) => normalized.includes(item.name.toLowerCase()))
    ?? tools.find((item) => normalized.some((name) => item.name.toLowerCase().endsWith(name)));
  if (!tool) throw new Error(`The connected Linear MCP server does not expose ${candidates[0]}.`);
  return tool;
}

function argumentName(tool: McpTool, candidates: string[], fallback: string): string {
  const names = Object.keys(tool.inputSchema?.properties ?? {});
  return names.find((name) => candidates.some((candidate) => name.toLowerCase() === candidate.toLowerCase())) ?? fallback;
}

function records(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 5 || value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item) => records(item, depth + 1));
  const current = value as Record<string, unknown>;
  return [current, ...Object.values(current).flatMap((item) => records(item, depth + 1))];
}

function resultValue(result: Record<string, unknown>): unknown {
  if (result.structuredContent) return result.structuredContent;
  const text = Array.isArray(result.content)
    ? result.content.find((item) => item && typeof item === 'object' && (item as { type?: unknown }).type === 'text') as { text?: unknown } | undefined
    : undefined;
  if (typeof text?.text !== 'string') return result;
  try { return JSON.parse(text.text); } catch { return { text: text.text }; }
}

function firstString(items: Record<string, unknown>[], keys: string[]): string | null {
  for (const item of items) {
    for (const key of keys) {
      if (typeof item[key] === 'string' && String(item[key]).trim()) return String(item[key]).trim();
    }
  }
  return null;
}

function parseIssue(value: unknown, identifier: string): LinearIssue {
  const items = records(value);
  return {
    id: firstString(items, ['id']),
    identifier: firstString(items, ['identifier']) ?? identifier,
    title: (firstString(items, ['title', 'name']) ?? 'Untitled issue').slice(0, 240),
    description: (firstString(items, ['description', 'body', 'text']) ?? '').slice(0, 2_000),
    url: firstString(items, ['url']),
    status: firstString(items, ['status', 'state', 'statusName']),
  };
}

async function withLinearClient<T>(operation: (client: Client, tools: McpTool[]) => Promise<T>): Promise<T> {
  const client = new Client({ name: 'roundtable-ai', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(mcpUrl(), {
    requestInit: { headers: { Authorization: `Bearer ${requireLinearKey()}` } },
  });
  try {
    // Linear can take longer than a normal voice turn to establish a remote
    // MCP session. These requests happen only after an explicit candidate
    // command, not during ordinary interview evaluation.
    await client.connect(transport, { timeout: 20_000 });
    const listed = await client.listTools(undefined, { timeout: 20_000 });
    return await operation(client, listed.tools as McpTool[]);
  } finally {
    await transport.close().catch(() => {});
  }
}

export async function getLinearIssue(identifier: string): Promise<LinearIssue> {
  return withLinearClient(async (client, tools) => {
    const tool = findTool(tools, ['get_issue', 'getIssue']);
    const issueKey = argumentName(tool, ['id', 'issueId', 'issue_id', 'identifier'], 'id');
    const result = await client.callTool({ name: tool.name, arguments: { [issueKey]: identifier } }, undefined, { timeout: 20_000 });
    if (result.isError) throw new Error('Linear could not load the configured issue.');
    return parseIssue(resultValue(result as Record<string, unknown>), identifier);
  });
}

export async function createLinearComment(issueIdentifier: string, body: string): Promise<LinearCommentResult> {
  return withLinearClient(async (client, tools) => {
    const getTool = findTool(tools, ['get_issue', 'getIssue']);
    const getIssueKey = argumentName(getTool, ['id', 'issueId', 'issue_id', 'identifier'], 'id');
    const issueResult = await client.callTool({ name: getTool.name, arguments: { [getIssueKey]: issueIdentifier } }, undefined, { timeout: 20_000 });
    if (issueResult.isError) throw new Error('Linear could not resolve the configured issue before posting.');
    const issue = parseIssue(resultValue(issueResult as Record<string, unknown>), issueIdentifier);
    // Linear's current remote MCP uses `save_comment` for both create and
    // update. Retain the older aliases so the adapter remains compatible with
    // a namespaced or older server response.
    const tool = findTool(tools, ['save_comment', 'create_comment', 'createComment']);
    const issueKey = argumentName(tool, ['issueId', 'issue_id', 'id', 'identifier'], 'issueId');
    const bodyKey = argumentName(tool, ['body', 'comment', 'content', 'text'], 'body');
    const issueValue = issueKey.toLowerCase() === 'identifier' ? issue.identifier : issue.id ?? issue.identifier;
    const result = await client.callTool({
      name: tool.name,
      arguments: { [issueKey]: issueValue, [bodyKey]: body.slice(0, 6_000) },
    }, undefined, { timeout: 20_000 });
    if (result.isError) throw new Error('Linear did not accept the comment.');
    const items = records(resultValue(result as Record<string, unknown>));
    return { id: firstString(items, ['id', 'commentId']), url: firstString(items, ['url']) };
  });
}

export const linearMcpInternals = { findTool, argumentName, resultValue, parseIssue };
