# 12 — MCP TOOLING

## Principle

MCP is a way to make interview scenarios grounded in real work.

Do not add many connectors for the sake of a logo wall.

## First-choice use case

One read-only tool integration that creates a compelling interview scenario.

Recommended:
1. GitHub for engineering interview context
2. PostHog for product/analytics context
3. Linear for prioritization/project context

## Example

Candidate is asked to reason about a production issue.

GitHub/analytics MCP provides:
- issue
- recent change
- relevant file/PR
- observed metric

The interviewer uses this information to create the next question.

## Cross-panel example

Technical:
“Review this change.”

Candidate identifies caching concern.

State:
technical evidence strong
customer impact unresolved

Product:
“Latency improved, but the checkout conversion metric fell. What would you investigate?”

## Safety

For hackathon:
- read-only tools
- mock data where possible
- explicit tool allowlist
- no production writes
- no payments
- no destructive repository operations
- no unrestricted shell/tool execution

## Agora MCP references

Official Agora conversational AI MCP/RPG recipe:
https://github.com/AgoraIO-Conversational-AI/recipe-agent-rpg

The recipe demonstrates Agora cloud calling a public MCP endpoint and passing tool results back into the conversational agent.

Official community example:
https://github.com/AgoraIO-Community/convo-ai-custom-llm-express-mcp

## MCP abstraction

Implement a small tool interface:
- `list_context`
- `get_issue`
- `get_pr`
- `get_metric`
- `get_file`

Keep vendor adapters behind interfaces.

## Do not couple the interview engine to GitHub

The orchestrator asks for evidence/context. A connector supplies it.

This makes the architecture extensible.
