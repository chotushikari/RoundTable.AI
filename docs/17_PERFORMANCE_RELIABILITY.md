# 17 — PERFORMANCE & RELIABILITY

## Voice targets

Measure, do not guess.

Track:
- time from end-of-speech to agent response
- STT latency
- reasoning latency
- TTS latency
- barge-in detection/recovery
- role transition time

Prototype targets:
- aim for sub-second perceived response where feasible
- aim for low and consistent P95
- prompt interruption recovery
- zero simultaneous interviewer speech

These are engineering targets, not claims.

## Reliability hierarchy

P0:
- voice session
- interruption
- turn control
- transcript
- state update
- next action

P1:
- code mode
- vagueness
- contradiction
- MCP

P2:
- advanced analytics
- replay
- extra personas

## Failure containment

If LLM times out:
- use fallback question objective
- keep voice session alive

If transcript event duplicates:
- de-duplicate by event ID

If role switch races:
- orchestrator lock / sequence check

If code executor fails:
- show execution unavailable
- do not invent test result

If MCP fails:
- continue with known interview context

## Load / soak

Before submission:
- 20+ scripted end-to-end runs
- 10+ interruptions
- repeated role transitions
- repeated code runs
- injected model failures

## Performance principle

Never put deep assessment on the critical voice path.
