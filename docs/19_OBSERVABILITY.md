# 19 — OBSERVABILITY

## Every interview should be replayable

Log:
- event sequence
- role
- action
- reasoning reason_code
- evidence references
- state version
- timing

## Core dashboards

### Live voice
- session state
- STT latency
- LLM latency
- TTS latency
- interruption count
- errors

### Adaptive engine
- role transitions
- action selection
- gap detection
- state updates
- repeated question count
- unresolved contradictions

### Interview outcomes
- duration
- competencies covered
- evidence confidence
- assessment status

## Judge view

A compact live timeline can show:
`AGORA → TRANSCRIPT → STATE → GAP → NEXT ACTION → SPEAK`

## Debugging principle

When a judge asks:
“Why did Product take over?”

the logs should answer:
- prior evidence
- missing competency
- selected action
- reason code
- transcript refs
- state version
