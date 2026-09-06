# SPRINT 03 — ORCHESTRATOR & NEXT ACTION

## Goal
Replace fixed question flow with a controlled decision engine.

## Implement
`NextInterviewAction` and deterministic orchestration.

## Required cases
- technical strong → product gap
- weak evidence → clarify/scaffold
- vague claim → evidence probe
- contradiction → reconciliation
- sufficient evidence → move onward
- time budget → close

## Guardrails
- one active speaker
- role cooldown
- no repeated question
- no two questions in one utterance
- safe fallback action

## Definition of Done
Given the same fixture, the expected next action is reproducible.

## Git
Branch: `sprint/03-orchestrator`
Commit: `feat(interview): add adaptive next-action orchestrator`
