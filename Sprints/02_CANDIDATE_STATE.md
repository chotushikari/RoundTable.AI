# SPRINT 02 — CANDIDATE STATE & EVENT LOG

## Goal
Create the shared memory backbone.

## Read
- `08_CANDIDATE_STATE_AND_EVIDENCE.md`
- `14_API_EVENT_CONTRACTS.md`

## Implement
- Interview
- InterviewEvent
- TranscriptSegment
- CandidateState
- Evidence
- Claim

## Requirements
- versioned state
- deterministic event sequence
- idempotent event ingestion
- replay utility

## Test
Replay a fixture and reconstruct the same final state.

## Definition of Done
Two interviewer roles can consume the same state without relying on full raw chat history.

## Git
Branch: `sprint/02-candidate-state`
Commit: `feat(state): add versioned candidate state`
