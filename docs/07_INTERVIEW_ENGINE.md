# 07 — INTERVIEW ENGINE

## Responsibilities

The Interview Engine is the domain core.

It should:
- ingest transcript/interaction events
- update Candidate State
- detect evidence gaps
- select next action
- control role transitions
- manage phase and time budget
- coordinate multimodal tasks
- request final assessment

## Domain model

Interview
→ InterviewSession
→ InterviewEvent stream
→ CandidateState versions
→ NextInterviewAction
→ specialist role policy
→ interaction
→ evidence

## Multimodal actions

`voice_question`
`clarify`
`challenge`
`scenario`
`code_task`
`debug_task`
`design_task`
`roleplay`
`evidence_probe`
`closing`

## Continuous challenge model

Represent difficulty as dimensions, not a single level.

Suggested dimensions:
- technical_depth
- ambiguity
- scale
- edge_case_complexity
- business_complexity
- time_pressure
- cross_functional_complexity

A candidate can be advanced on technical depth while still being probed gently on product thinking.

## Interview budgets

Track:
- max duration
- per competency budget
- per role budget
- number of repeated probes
- scenario/code time budget

## Failure behavior

If the reasoning layer fails:
- keep the voice session alive
- use a safe fallback follow-up
- log the failure
- never fabricate an explanation
