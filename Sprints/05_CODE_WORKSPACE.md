# SPRINT 05 — TECHNICAL CODE WORKSPACE

## Goal
Support adaptive transition from voice explanation to coding/debugging.

## Implement
- Monaco integration
- task model
- sandbox execution adapter
- test result events
- return-to-voice flow

## Safety
Never execute candidate code directly in the main backend.

## Interaction
Voice:
“Let's make that concrete. Implement the core operation.”

Workspace opens.

Candidate codes.

Run tests.

Results become Evidence.

Technical interviewer resumes based on results.

## Definition of Done
A scripted coding fixture works end-to-end and is replayable.

## Git
Branch: `sprint/05-code-workspace`
Commit: `feat(code): add interview coding workspace`
