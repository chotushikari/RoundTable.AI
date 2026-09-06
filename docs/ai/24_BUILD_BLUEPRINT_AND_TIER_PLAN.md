# 24 — FINAL BUILD BLUEPRINT, FEATURE TIERS & UX STRATEGY

## Purpose

This is the final prioritization document for RoundTable AI after the product, PS-11, Agora integration and recent implementation discussions.

The current prototype reportedly already has:

`company dashboard → interview link → candidate opens → AI intro → Technical → coding IDE → Product → Excalidraw/canvas → Customer → Behavioral/Hiring Manager → end`

Keep those surfaces. The critical work now is to transform the fixed journey into an adaptive system.

---

## 1. Product thesis

> **RoundTable does not ask more questions. It decides the next best way to learn something about the candidate.**

The product is a continuous evidence-acquisition system with voice as the primary interaction modality.

### Continuous adaptive loop

`candidate interaction → transcript/state update → evidence/uncertainty → next best action → role + modality + objective → interaction → repeat`

Do NOT use discrete question levels as the core model.

Difficulty is continuous and multi-dimensional.

Suggested challenge dimensions:
- technical depth
- ambiguity
- scale
- edge-case complexity
- business complexity
- time pressure
- cross-functional complexity

---

## 2. Feature tiers

### TIER P0 — MUST BE EXCELLENT

These are the features that decide whether PS-11 is genuinely satisfied.

1. Agora real-time conversational voice
2. Candidate can interrupt agent and continue naturally
3. One coherent live interview session
4. Candidate State / shared context
5. Evidence extraction from each meaningful answer
6. Central Interview Orchestrator
7. Dynamic next interviewer selection
8. Dynamic follow-up generation
9. Continuous challenge adaptation
10. Technical → Product transition driven by evidence
11. AI disclosure
12. Structured transcript-linked assessment
13. Reliable turn-taking
14. Clear error recovery

### TIER P1 — HIGH-VALUE DIFFERENTIATORS

1. Voice → Code transition
2. Voice → Canvas/Whiteboard transition
3. Code results become evidence
4. Canvas results become evidence
5. Vague-answer detection
6. Contradiction reconciliation
7. Role-play/scenario engine
8. Interview timeline
9. “Why this question?” judge/recruiter panel
10. Live competency/evidence radar

### TIER P2 — STRONG ENHANCEMENTS

1. One read-only MCP integration
2. Interview replay
3. richer recruiter analytics
4. configurable competency rubrics
5. evidence graph visualization

### TIER P3 — DO NOT PRIORITIZE BEFORE CORE IS HARDENED

1. Camera-based anti-cheating
2. emotion analysis
3. facial expression scoring
4. many more personas
5. large connector catalog
6. elaborate avatar system
7. complex vector infrastructure
8. unnecessary microservices

---

## 3. Candidate UX

The candidate should experience one interview, not a swarm.

### Persistent shell

- active interviewer identity
- voice state: listening / speaking / interrupted
- transcript
- timer / approximate remaining time
- connection status
- subtle panel rail
- workspace tabs

### Workspace tabs

`Voice | Code | Canvas | Scenario`

These are modalities, NOT fixed interview phases.

The orchestrator can activate a modality when it is the best way to obtain evidence.

### Example

Voice:
> “Explain your caching strategy.”

Then:
> “Let's make that concrete. Implement the cache.”

Code tab opens.

Later:
> “You've made a strong implementation. Show me the user flow you would design.”

Canvas opens.

Then:
> “Now imagine I'm the customer.”

Scenario mode begins.

The session remains one continuous interview.

---

## 4. Panel UI

Do not permanently place four large avatars on screen.

Candidate sees one active interviewer.

A compact rail shows:
- Technical
- Product
- Customer
- Hiring Manager

The active role is highlighted.

A role transition should be conversational:
> “Your technical approach makes sense. I want to explore the customer impact of that decision.”

NOT:
> “Switching to Product Agent.”

---

## 5. Judge / control-room UI

This is where intelligence becomes visible.

Show:
- current role
- current modality
- competency being assessed
- reason for current action
- Candidate State
- open evidence gaps
- challenge vector
- Agora metrics
- timeline

Example:

```text
CURRENT
Product Interviewer

WHY
Technical correctness established.
Customer impact remains unverified.

TARGET
Customer impact

NEXT ACTION
Evidence probe

AGORA
STT 190ms
LLM 410ms
TTS 220ms
```

Never show hidden chain-of-thought.

---

## 6. Code workspace

Use Monaco or equivalent browser IDE.

The technical interviewer can invoke code when implementation evidence is missing.

Events:
- code_task_opened
- code_changed
- run_started
- test_result
- submission
- timeout
- execution_error

Use a sandboxed executor such as Judge0 or another isolated execution system.

Never execute candidate code inside the core application process.

The technical agent can:
- clarify requirements
- restate constraints
- discuss failed tests

It must not:
- write the candidate's code
- reveal hidden tests
- solve the problem
- directly debug the candidate's implementation

---

## 7. Canvas / whiteboard

Keep the canvas.

Make it a persistent workspace modality rather than a mandatory Product stage.

Good uses:
- product flow
- wireframe
- user journey
- architecture diagram
- system design
- sequence flow

Events:
- canvas_opened
- canvas_changed
- shape_created
- text_added
- connection_created
- canvas_submitted

Canvas evidence should be connected to the same Candidate State as voice and code evidence.

---

## 8. Assessment model

Use:
- belief/score
- confidence
- evidence
- concerns
- unresolved questions

Example:

```text
Technical reasoning: 88
Confidence: High

Evidence:
03:12 verbal architecture
09:41 code test result
12:18 debugging explanation

Customer impact: 57
Confidence: Medium

Evidence:
05:22 Product challenge
06:01 metric response
```

Distinguish:
- candidate is weak
from
- we have insufficient evidence

No material high-confidence conclusion without supporting evidence.

---

## 9. Duration

Do not use a fixed question count.

Use:
`minimum useful time + evidence coverage + time budget + hard maximum`

The interview continues when important evidence remains unresolved.

It stops when required evidence is sufficient or the maximum is reached.

---

## 10. Example of continuous adaptation

Candidate:
> “I'd use caching to make the app faster.”

Technical probes stale data.

Candidate demonstrates strong technical understanding.

Candidate State:
- technical reasoning: strong
- caching: strong
- customer impact: unknown

Next Action:
`Product + voice + customer-impact objective`

Product:
> “How would you know whether this actually improved the customer's experience?”

Candidate:
> “Customers would be happier.”

Vagueness detector:
`metric missing`

Product:
> “What would you measure?”

Candidate:
> “Checkout completion rate.”

State:
customer impact confidence increases.

Later:
Technical:
> “Let's implement the cache.”

Code opens.

Tests become evidence.

That is the target product.

---

## 11. Hackathon alignment

Every P0/P1 feature should map to a mandatory PS-11 requirement.

The demo must make the following observable:

- real-time voice
- interruption
- multiple roles
- shared context
- dynamic follow-up
- controlled turns
- scenario/role-play
- continuous difficulty/challenge adjustment
- vague/contradictory handling
- transcript-linked evidence
- structured assessment
- AI disclosure

The judge should be able to see the adaptive transition happen.

---

## 12. Final implementation priority

`Agora reliability → Candidate State → Orchestrator → evidence → adaptive actions → code/canvas/scenario → assessment → one MCP → polish`

Never reverse this order.
