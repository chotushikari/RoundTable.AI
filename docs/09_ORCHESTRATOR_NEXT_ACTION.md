# 09 — ORCHESTRATOR & NEXT INTERVIEW ACTION

## Core idea

The orchestrator decides **what to do next**, not just what sentence to say.

## NextInterviewAction

Suggested schema:

```json
{
  "role": "technical|product|customer|manager",
  "modality": "voice|code|debug|scenario|roleplay|design|clarify",
  "objective": "string",
  "competency": "string",
  "question_type": "probe|challenge|evidence|scenario|verification",
  "challenge_vector": {},
  "evidence_required": [],
  "reason_code": "string",
  "context_refs": []
}
```

## Selection policy

Use a hybrid:
- deterministic hard constraints
- scoring/ranking for candidate actions
- LLM only where language/reasoning is genuinely valuable

## Action score

Conceptually:
`information_value`
+ `gap_coverage`
+ `role_relevance`
+ `challenge_fit`
+ `scenario_relevance`
- `repetition`
- `already_sufficient`
- `time_cost`

## Role arbitration

Rules:
- one active speaker
- cooldown after a role handoff
- do not switch roles without evidence
- preserve conversational continuity
- the role with the strongest unresolved evidence objective wins

## Question generation

The planner gives the LLM:
- objective
- competency
- required evidence
- relevant prior evidence
- constraints
- interviewer policy

The LLM returns one concise question.

## Validation

Reject:
- two questions in one response
- unrelated objectives
- questions already answered
- requests for prohibited information
- solutions/hints in coding mode
