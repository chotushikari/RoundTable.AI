# 14 — API & EVENT CONTRACTS

## Core event envelope

```json
{
  "event_id": "uuid",
  "interview_id": "uuid",
  "event_type": "TRANSCRIPT_FINAL",
  "occurred_at": "timestamp",
  "sequence": 123,
  "source": "candidate|agora|orchestrator|code|mcp|assessment",
  "payload": {}
}
```

## Recommended event types

- INTERVIEW_CREATED
- AI_DISCLOSURE_SHOWN
- AGORA_SESSION_STARTED
- AGORA_STATE_CHANGED
- AGORA_METRICS
- TRANSCRIPT_PARTIAL
- TRANSCRIPT_FINAL
- CANDIDATE_STATE_UPDATED
- EVIDENCE_EXTRACTED
- GAP_DETECTED
- VAGUENESS_DETECTED
- CONTRADICTION_DETECTED
- NEXT_ACTION_SELECTED
- ROLE_CHANGED
- CODE_TASK_OPENED
- CODE_CHANGED
- TEST_RESULT
- MCP_TOOL_STARTED
- MCP_TOOL_COMPLETED
- AGENT_INTERRUPTED
- ASSESSMENT_STARTED
- ASSESSMENT_COMPLETED
- INTERVIEW_COMPLETED
- ERROR

## Next action API

Input:
Candidate State + latest interaction + interview configuration

Output:
validated NextInterviewAction

## Assessment API

Input:
interview ID

Output:
assessment ID + processing state

## API rules

- Pydantic request/response models
- schema versioning
- idempotency keys for mutation endpoints
- structured error codes
- no secrets in payloads
- no raw provider credentials in logs
