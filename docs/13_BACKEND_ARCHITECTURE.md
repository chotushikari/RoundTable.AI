# 13 — BACKEND ARCHITECTURE

## Recommended logical components

### API/session gateway
- auth
- interview creation
- Agora token/session lifecycle
- candidate configuration

### Interview service
- interview lifecycle
- phase
- budgets
- orchestration

### State service
- Candidate State versions
- evidence
- claims
- contradictions

### Voice adapter
- Agora session integration
- transcript/events
- runtime control

### Intelligence service
- answer analysis
- gap detection
- vagueness
- contradictions
- evidence extraction

### Task service
- code tasks
- test execution
- scenarios
- MCP tools

### Assessment service
- deep post-interview evaluation
- scoring
- recommendations

## Deployment philosophy

For the hackathon:
- one frontend deployment
- one API/agent backend
- one database
- optional MCP endpoint
- external execution sandbox

Do not split every component into its own deployable service.

## Recommended technologies

Frontend:
- Next.js
- TypeScript
- Agora Web SDK/client toolkit as appropriate
- Monaco

Backend:
- Python
- FastAPI
- Pydantic

Persistence:
- PostgreSQL/Supabase

Code execution:
- Judge0 or secure equivalent

Testing:
- pytest
- Playwright
- model evaluation fixtures

## Async boundary

Live:
`voice → transcript → minimal analysis → next action → voice`

Async:
`full transcript → evidence consolidation → deep evaluation → final report`

## Caching

Cache:
- job competency maps
- interview configuration
- stable role policies

Do not cache mutable Candidate State without version checks.

## Idempotency

Every event should have:
- event_id
- interview_id
- state_version
- event_type
- timestamp

Duplicate events must not create duplicate evidence.
