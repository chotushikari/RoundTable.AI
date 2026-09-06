# 25 — EXPERT REBUILD / AUDIT / MODIFY / BUILD PROMPT FOR ANTIGRAVITY

You are acting as the **principal engineer, staff-level product architect, realtime voice systems engineer, and adversarial hackathon technical judge** responsible for taking the existing RoundTable AI repository from its CURRENT state to the strongest technically credible PS-11 submission.

You are not here to blindly implement a new specification. You must first discover what exists, classify it, test it, identify gaps, and then modify the existing system with the smallest architecture-consistent changes.

---

# 0. SOURCE OF TRUTH

Read the entire `/docs` folder before changing architecture.

In particular, read:
- `00_READ_FIRST.md`
- `01_HACKATHON_AND_JUDGING.md`
- `02_PRODUCT_VISION.md`
- `03_PRODUCT_PRINCIPLES.md`
- `04_USER_JOURNEY.md`
- `05_CANDIDATE_UX.md`
- `06_PANEL_CONTROL_ROOM_UX.md`
- `07_INTERVIEW_ENGINE.md`
- `08_CANDIDATE_STATE_AND_EVIDENCE.md`
- `09_ORCHESTRATOR_NEXT_ACTION.md`
- `10_TECHNICAL_INTERVIEW_CODE_WORKSPACE.md`
- `11_AGORA_INTEGRATION.md`
- `12_MCP_TOOLING.md`
- `13_BACKEND_ARCHITECTURE.md`
- `14_API_EVENT_CONTRACTS.md`
- `15_ASSESSMENT_EVALUATION.md`
- `16_SECURITY_PRIVACY_FAIRNESS.md`
- `17_PERFORMANCE_RELIABILITY.md`
- `18_TESTING_VALIDATION.md`
- `19_OBSERVABILITY.md`
- `20_DESIGN_SYSTEM.md`
- `21_DEMO_SUBMISSION.md`
- `22_DECISION_LOG_OPEN_QUESTIONS.md`
- `24_BUILD_BLUEPRINT_AND_TIER_PLAN.md`

Then inspect the repository itself. The repository is the ultimate implementation truth.

---

# 1. MISSION

Build:

> **RoundTable AI — an adaptive, multimodal AI interview room powered by Agora Conversational AI.**

The key product behavior is:

`candidate interaction → understand → evidence → Candidate State → uncertainty → Next Interview Action → role/modality/objective → interaction`

The system must not behave like:
- a fixed questionnaire
- a fixed Technical → Product → Customer → Behavioral workflow
- multiple independent personas
- a generic LLM interviewer

The system must behave like:
- one coherent interview
- multiple specialist evaluation perspectives
- one shared candidate model
- continuous adaptation
- evidence-driven next actions

---

# 2. ASSUME THIS MAY ALREADY EXIST

The current team reports that the prototype may already contain:

`company dashboard → generated candidate link → candidate interview intro → technical interviewer → coding IDE → product manager → Excalidraw/canvas → customer → behavioral manager → end interview`

Do not rebuild these surfaces blindly.

Audit:
- which parts actually work
- which parts are UI-only
- which parts are hard-coded
- which parts are actually powered by Agora
- which parts share state
- which parts are dynamically generated
- which parts produce evidence
- which parts are testable

Convert assumptions into a written status matrix.

---

# 3. PHASE 1 — FULL REPOSITORY AUDIT

Before code changes:

1. Print repository tree.
2. Identify frontend and backend entrypoints.
3. Identify package/dependency versions.
4. Identify environment variables and external services without exposing secrets.
5. Run the app locally if possible.
6. Run all existing tests.
7. Trace candidate creation → candidate link → interview start.
8. Trace the Agora session.
9. Trace candidate speech → transcript → agent response.
10. Trace role changes.
11. Trace IDE lifecycle.
12. Trace canvas lifecycle.
13. Trace final assessment.
14. Identify every persistent state store.
15. Identify event/logging system.
16. Identify deployment.
17. Check TypeScript/Python/runtime errors.
18. Check browser console errors.
19. Check server logs.

Produce:
- `docs/implementation/CURRENT_STATE.md`
- `docs/implementation/FEATURE_STATUS.md`
- `docs/implementation/PS11_GAP_MATRIX.md`
- `docs/implementation/ARCHITECTURE_DIFF.md`
- `docs/implementation/RISK_REGISTER.md`

Do NOT implement features in this phase.

---

# 4. FEATURE STATUS CLASSIFICATION

For every requirement use exactly one:

- REAL — demonstrated end-to-end
- PARTIAL — exists but not fully integrated
- UI_ONLY — surface exists but behavior is not real
- SCRIPTED — behavior is hard-coded
- UNVERIFIED — cannot prove
- MISSING — does not exist

Requirements:
1. Agora realtime voice
2. interruption/barge-in
3. multiple roles
4. shared Candidate State
5. dynamic follow-up
6. controlled turn-taking
7. scenario/roleplay
8. continuous challenge adaptation
9. vague-answer detection
10. contradiction handling
11. evidence-linked assessment
12. AI disclosure

Do not report “done” merely because a screen exists.

---

# 5. ARCHITECTURAL NORTH STAR

The preferred logical architecture is:

```text
CANDIDATE UI
   ↓
AGORA CONVERSATIONAL AI
   ↓
INTERVIEW CORE
   ├── Candidate State
   ├── Evidence
   ├── Orchestrator
   ├── Next Interview Action
   ├── Challenge Controller
   └── Interview Budget
   ↓
SPECIALIST ROLE POLICIES
   ├── Technical
   ├── Product
   ├── Customer
   └── Hiring Manager
   ↓
MODALITY
   ├── Voice
   ├── Code
   ├── Canvas
   ├── Scenario
   └── MCP context
   ↓
EVIDENCE
   ↓
ASSESSMENT
```

---

# 6. AGORA REQUIREMENTS

Agora Conversational AI is mandatory and central.

Verify the exact installed SDK/API version against current official Agora documentation before implementing.

Use official capabilities where applicable.

Current official materials document:
- cascading ASR → LLM → TTS
- MLLM paths
- Agent sessions
- turn detection
- interruption controls
- runtime session control
- history
- agent events/metrics
- MCP recipes
- agent handoff recipes

Do not invent unsupported APIs.

## Preferred behavior

One continuous Agora session is preferred if runtime role/context updates are supported and reliable in the current repository.

Use explicit agent handoff only if it creates a demonstrable technical advantage and the implementation is more reliable.

The candidate should not hear a brittle handoff boundary.

---

# 7. LIVE CONVERSATION PATH

The critical path should be:

`candidate speech → Agora transcript → fast interpretation → Candidate State update → Next Interview Action → constrained question → Agora speech`

Do not wait for deep assessment.

Deep analysis should happen asynchronously when possible:

`full transcript/code/tool data → deep evidence consolidation → final assessment`

---

# 8. CANDIDATE STATE

Implement or repair a versioned CandidateState.

Minimum:
- interview_id
- state_version
- phase
- current_role
- current_modality
- competencies
- confidence_by_competency
- open_gaps
- claims
- contradictions
- evidence
- challenge_vector
- last_answer_summary
- time_budget

Use `belief + confidence`.

Do not use “difficulty level” as the primary concept.

---

# 9. NEXT INTERVIEW ACTION

Implement:

```json
{
  "role": "technical|product|customer|manager",
  "modality": "voice|code|canvas|scenario|roleplay",
  "competency": "string",
  "objective": "string",
  "question_type": "probe|challenge|clarify|verification|scenario",
  "challenge_vector": {},
  "evidence_required": [],
  "reason_code": "string",
  "context_refs": []
}
```

The orchestrator must decide:
- who
- what
- why
- how
- modality

The LLM may naturalize the selected objective.

The LLM must not be allowed to arbitrarily control microphone/session lifecycle.

---

# 10. CONTINUOUS ADAPTATION

Do not use hard-coded levels.

Represent challenge as a vector:
- technical depth
- ambiguity
- scale
- edge case
- business complexity
- time pressure
- cross-functional complexity

Each answer should modify the vector or state only when justified by evidence.

Example:
Strong technical reasoning does not automatically imply strong customer reasoning.

---

# 11. GAP DETECTION

After each meaningful answer identify:
- competencies strengthened
- competencies weakened/uncertain
- claims
- missing evidence
- contradictions
- unanswered implications

Select the highest-value unresolved evidence.

Avoid generic:
> “Can you elaborate?”

unless clarification truly is the best next action.

---

# 12. VAGUENESS DETECTION

Detect claims such as:
- significantly
- a lot
- faster
- better
- improved
- users liked it
without enough evidence.

Classify the missing evidence:
- baseline
- metric
- magnitude
- timeframe
- personal contribution
- causal mechanism

Trigger a focused probe.

---

# 13. CONTRADICTION HANDLING

Extract candidate claims with references.

If later evidence conflicts:
- mark possible contradiction
- preserve both references
- request reconciliation

Never immediately label candidate dishonest.

---

# 14. ROLE ARBITRATION

Technical, Product, Customer and Hiring Manager are specialist policies.

They do not compete for the microphone.

The orchestrator owns speaker selection.

Use:
- minimum turn/cooldown
- continuity protection
- no unnecessary role thrashing
- explicit transition reason

Transition example:
> “Your implementation makes sense. I want to understand what that means for the customer.”

---

# 15. MODALITY ARBITRATION

Do not hard-code:
- Technical → Code
- Product → Canvas

Instead:

Voice → Code when implementation evidence is valuable.

Voice → Canvas when visual reasoning is valuable.

Voice → Scenario when behavior under contextual constraints is valuable.

Voice → MCP context when external evidence improves the task.

All modalities share the same Candidate State.

---

# 16. CODE WORKSPACE

Audit the current IDE.

If present, preserve it and integrate it with the interview state.

Recommended:
- Monaco
- isolated executor such as Judge0 or equivalent
- strict CPU/memory/time/network limits

Emit:
- CODE_TASK_OPENED
- CODE_CHANGED
- RUN_STARTED
- TEST_RESULT
- SUBMISSION
- ERROR

Convert results into evidence.

Never run arbitrary candidate code inside the API process.

The interviewer cannot solve the candidate task.

---

# 17. CANVAS / WHITEBOARD

Audit the current Excalidraw or equivalent implementation.

Preserve it.

Convert it into an explicit interview modality.

Emit:
- CANVAS_OPENED
- CANVAS_CHANGED
- CANVAS_SUBMITTED

Use for:
- product flows
- architecture
- system design
- wireframes
- user journeys

Canvas events/evidence must return to Candidate State.

---

# 18. MCP

MCP is secondary to PS-11.

Add at most one useful read-only integration after the core adaptive loop is reliable.

Preferred:
- GitHub for technical context
- PostHog for product metrics
- Linear for prioritization

MCP failures must not break the interview.

Tool permissions must be explicit.

Never:
- delete
- pay
- deploy to production
- modify production data
in the hackathon demo.

---

# 19. UI/UX REBUILD STANDARD

### Candidate
One coherent interview room.

Persistent:
- active interviewer
- voice state
- transcript
- timer/status
- workspace tabs

Tabs:
`Voice | Code | Canvas | Scenario`

Optional compact panel rail.

### Judge/control room
Show:
- active role
- modality
- competency
- “why this action”
- Candidate State
- evidence gaps
- Agora metrics
- timeline

### Assessment
Show:
- competency scores
- confidence
- evidence links
- concerns
- unresolved areas
- recommendation

Do not overload the candidate with system internals.

---

# 20. AI DISCLOSURE

Before the interview:
> “You are interacting with an AI interview panel. Your responses may be analyzed to adapt the interview and generate structured feedback.”

Ensure this occurs before meaningful recording/analysis.

---

# 21. CAMERA FEATURE

Do not implement camera-based cheating detection unless all P0/P1 requirements pass.

If experimented with:
- make it optional
- treat it only as an integrity signal
- never infer cheating from mouth motion alone
- do not use appearance/emotion as hiring score

This is not a core PS-11 requirement.

---

# 22. PERFORMANCE

Instrument the actual system.

Measure:
- transcript-final to next-action time
- next-action to TTS start
- total response latency
- STT/LLM/TTS where available
- interruption detection/recovery
- role transition latency
- state update latency
- code execution latency
- MCP latency

Do not invent targets. Record the real measurements.

Keep deep analysis off the critical voice path.

---

# 23. TEST-FIRST ADAPTATION FIXTURES

Create deterministic fixtures before relying on live LLM behavior.

### Fixture A
Strong technical answer → customer impact missing.
Expected:
`role=product`

### Fixture B
Weak technical answer.
Expected:
`role=technical, modality=voice, objective=clarify`

### Fixture C
Vague performance claim.
Expected:
`evidence_probe`

### Fixture D
Contradictory testing claims.
Expected:
`reconciliation`

### Fixture E
Strong verbal coding concept but implementation evidence missing.
Expected:
`modality=code`

### Fixture F
Visual reasoning insufficient.
Expected:
`modality=canvas`

### Fixture G
Candidate interruption.
Expected:
agent stops and candidate continues.

### Fixture H
MCP unavailable.
Expected:
interview continues without MCP.

---

# 24. E2E TEST MATRIX

For every run verify:
- voice joins
- candidate speaks
- agent speaks
- candidate interrupts
- transcript updates
- state updates
- next action selected
- role change happens only when justified
- modality opens correctly
- evidence persists
- assessment references evidence
- interview can finish cleanly

Run at least 20 complete scripted interviews before release.

---

# 25. ADVERSARIAL TESTING

Inject:
- model timeout
- invalid JSON
- empty transcript
- transcript delay
- duplicated event
- out-of-order event
- role-selection race
- candidate silence
- very long answer
- candidate asks for prohibited help
- MCP timeout
- code execution timeout
- browser refresh
- lost Agora session

The user should see graceful recovery, not stack traces.

---

# 26. SECURITY

Check:
- no provider secret in browser
- no secret in logs
- code sandbox isolation
- MCP allowlists
- input validation
- event idempotency
- candidate-data minimization
- AI disclosure

---

# 27. REBUILD ORDER

Execute in this exact order:

### Phase A
Audit.

### Phase B
Repair/harden Agora voice.

### Phase C
Implement/repair Candidate State and event model.

### Phase D
Implement orchestrator and NextInterviewAction.

### Phase E
Implement vagueness/contradiction/evidence.

### Phase F
Convert existing Technical/Product/Customer/Manager stages into specialist policies.

### Phase G
Convert existing IDE and Canvas into adaptive modalities.

### Phase H
Assessment and evidence-linked report.

### Phase I
One MCP integration.

### Phase J
UX polish and judge control room.

### Phase K
Performance/reliability testing.

### Phase L
Demo/submission freeze.

Never move to the next phase because a file exists. Move only when the Definition of Done is demonstrated.

---

# 28. GIT / DELIVERY PROTOCOL

For every phase:

1. Create or checkout a dedicated branch.
2. Inspect status.
3. Implement only that phase.
4. Run unit tests.
5. Run integration tests.
6. Run E2E/manual validation.
7. Update docs.
8. Inspect `git diff`.
9. Remove accidental/unrelated changes.
10. Commit using Conventional Commits.
11. Verify commit.
12. Push branch.
13. Verify remote branch exists.
14. Report branch + commit SHA + tests + actual result.
15. Only then begin next phase.

Never force-push.
Never reset away user changes.
Never claim push success without checking.

Suggested branches:
- `sprint/00-audit`
- `sprint/01-agora`
- `sprint/02-state`
- `sprint/03-orchestrator`
- `sprint/04-intelligence`
- `sprint/05-code-canvas`
- `sprint/06-assessment`
- `sprint/07-mcp`
- `sprint/08-hardening`
- `sprint/09-submission`

---

# 29. COMPLETION REPORT FORMAT

At the end of every sprint output:

```text
SPRINT:
STATUS:

What changed:
- ...

Files changed:
- ...

Tests:
- command
- actual result

Manual validation:
- ...

Metrics:
- ...

PS-11 coverage:
- ...

Known risks:
- ...

Git:
branch =
commit =
remote_push = verified/unverified

Next sprint:
- ...
```

Never say “done” without evidence.

---

# 30. FINAL ACCEPTANCE TEST

RoundTable is not ready until a fresh reviewer can perform this without prior explanation:

1. Create interview from role/job context.
2. Candidate opens link.
3. AI disclosure appears.
4. Candidate starts voice interview.
5. Candidate gives a strong technical answer.
6. Technical evidence appears in Candidate State.
7. Product is selected because customer impact remains unverified.
8. Product asks a question specific to the prior answer.
9. Candidate gives a vague answer.
10. System requests a metric.
11. Candidate interrupts the interviewer.
12. Interview continues naturally.
13. Technical asks candidate to implement something.
14. Code workspace opens without leaving interview.
15. Test result becomes evidence.
16. Candidate can continue by voice.
17. Canvas can be opened when visual reasoning is required.
18. Final report links major conclusions to evidence.
19. Judge can inspect why important transitions occurred.

If any of these is fake, hard-coded, or unreliable, continue engineering.

---

# 31. FINAL JUDGE TEST

Ask an independent technical reviewer to answer:

1. Is Agora clearly essential to this product?
2. Is the interview genuinely adaptive?
3. Can they explain why the next interviewer spoke?
4. Can they identify shared candidate context?
5. Can they see evidence driving the next action?
6. Does the voice interaction feel natural?
7. Does code/canvas feel like part of the same interview?
8. Does the assessment look trustworthy?
9. Is the architecture understandable?
10. Would they remember this project among other AI interviewer submissions?

The final demo should make the answer to all ten “yes”.

---

# 32. DO NOT ADD FEATURES BY HUNCH

Before any new feature, ask:

- Does it materially improve PS-11?
- Does it improve Agora usage?
- Does it improve evidence quality?
- Does it improve the live demo?
- Does it introduce unacceptable latency/reliability risk?

If none apply, do not build it.

---

# 33. FINAL PRODUCT STORY

The product story must remain:

> “A candidate speaks. The panel learns. The system identifies what remains uncertain. The right interviewer or modality is selected. The interview evolves. Every conclusion is backed by evidence.”

That is the product.

Now begin with the repository audit and do not modify implementation until the audit is complete.
