# SPRINT 01 — AGORA VERTICAL SLICE

## Goal
Make one real interview turn reliable.

## Actions
- Stabilize Agora session startup
- token/session lifecycle
- browser mic
- real-time audio
- transcript
- turn detection
- interruption
- stop/restart
- errors

## Add
Structured events:
SESSION_STARTED
AGENT_STATE_CHANGED
TRANSCRIPT_FINAL
INTERRUPTED
METRICS
ERROR

## Test
- 20 natural turns
- 10 candidate interruptions
- 5 reconnect/restart attempts

## Measure
- STT latency
- LLM latency
- TTS latency
- perceived response latency
- interruption recovery

## Definition of Done
A reviewer can talk to one interviewer naturally and interrupt it.

## Git
Branch: `sprint/01-agora-vertical-slice`
Commit: `feat(agora): stabilize interview voice session`
Push only after tests pass.
