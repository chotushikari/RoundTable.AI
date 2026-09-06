# 08 — CANDIDATE STATE & EVIDENCE

## Candidate State

Recommended fields:

- interview_id
- version
- phase
- current_role
- current_action
- competency_scores
- confidence_by_competency
- covered_topics
- open_gaps
- claims
- contradictions
- evidence
- unanswered_questions
- challenge_vector
- last_answer_summary
- time_budget_remaining

## Competency representation

Use a pair:
`belief` + `confidence`

Example:
`customer_impact = { belief: 0.42, confidence: 0.88 }`

Interpretation:
“We believe customer impact evidence is weak, and we are confident that we have insufficient evidence.”

## Evidence object

Each evidence record should have:
- id
- transcript_segment_id / code_event_id / tool_event_id
- competency
- evidence_type
- candidate claim
- supporting observation
- confidence
- created_at

## Evidence types

- explanation
- implementation
- debugging
- tradeoff
- measurement
- scenario_decision
- customer_reasoning
- ownership_example
- contradiction
- correction/recovery

## Contradictions

Do not immediately penalize.

Store:
- claim A
- claim B
- references
- similarity/semantic conflict score
- status: possible / reconciled / unresolved

Then ask the candidate to reconcile.

## Evidence graph

The assessment engine should be able to traverse:
`score → evidence → interaction → transcript/code/tool reference`

This is the foundation for trustworthy feedback.
