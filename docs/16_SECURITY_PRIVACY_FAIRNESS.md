# 16 — SECURITY, PRIVACY & FAIRNESS

## Candidate data

Minimize collection.

Keep:
- interview configuration
- transcript
- code artifacts
- evidence
- assessment

Only as long as required.

## Secrets

Never expose:
- Agora certificates
- LLM keys
- MCP credentials
- database credentials
to the browser.

## Code execution

Candidate code must run in an isolated sandbox with:
- CPU limits
- memory limits
- execution timeout
- network restrictions
- filesystem isolation
- process limits

## MCP

Use allowlists and read-only tools in the hackathon.

## AI disclosure

The candidate must be told clearly that the interview is AI-driven before interaction begins.

## Assessment safeguards

The system should distinguish:
- insufficient evidence
from
- poor evidence.

Do not punish a candidate simply because the system did not collect enough information.

## Auditability

Persist:
- what was asked
- why it was asked
- what evidence was collected
- what score changed
- which transcript/tool/code reference supports it

## Human decision

Position final hiring decisions as human-reviewed.
