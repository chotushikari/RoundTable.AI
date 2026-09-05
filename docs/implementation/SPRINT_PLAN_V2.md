# RoundTable.AI — CORRECTED SPRINT PLAN (v2)

> Reconciles `Sprints/00–08` with `FINALIZED_BLUEPRINT.md`. The old `PROGRESS.md` marks 00–05 "done" but they were built on the regressed **levels** model. We re-baseline: **keep the working Agora voice path + UI shell, remove the threshold orchestrator, rebuild on the blueprint.** No implementation until this plan is validated.

## Locked decisions
1. Agora control = **one continuous session, custom-LLM proxy** (`/api/chat/completions`) as control plane.
2. Backend = **all Next.js API routes**, Zod at AI boundaries.
3. Code exec = **real Judge0** behind a swappable interface (mock = failure fallback only).
4. Roles = **all 5** (Technical, Product, Customer, Hiring Manager, Behavioural), defined as config.
5. Persistence = **Supabase Postgres** (recommended; vetoable).

---

## Sprint R0 — Re-baseline & Truth Audit
**Goal:** Establish what actually works vs what the docs claim.
- Run `npm run verify`; boot app; complete one real voice turn end-to-end and record latency.
- Confirm interruption/barge-in works on the current build.
- Mark in `PROGRESS.md` which "done" sprints are real (voice path, UI shell) vs regressed (orchestrator, state, code workspace).
- **DoD:** a verified baseline note + a working voice smoke test. No new features.

## Sprint R1 — Persistence & Event Backbone
**Goal:** Durable shared context (prereq for everything "shared").
- Supabase schema per blueprint §5. Append-only `interview_events` with the `docs/14` envelope + idempotency by `event_id`.
- Replace in-memory state with versioned `candidate_state` reads/writes.
- **DoD:** events from a live session persist and are replayable; duplicate events don't double-write.

## Sprint R2 — Custom-LLM Proxy Control Plane
**Goal:** Make the proxy the brain. **This is the keystone sprint.**
- Point Agora's agent at `/api/chat/completions` (invite-agent config change).
- Proxy assembles each turn's prompt from: shared candidate context + active role persona + scoped evidence + current `NextInterviewAction` + guardrails (one question/turn, no solutions in code mode).
- **DoD:** the same agent changes persona between turns with zero reconnection, driven by server-side role selection; every turn logs a `NEXT_ACTION_SELECTED` event with `reason_code`.

## Sprint R3 — Belief/Confidence State + Evidence Extraction
**Goal:** Replace single-float state with belief+confidence + evidence graph.
- Implement `CompetencySignal{belief,confidence}` + `ChallengeVector`.
- Deep-path extractor: claims/mechanism/tradeoff → `evidence` rows linked to transcript segments.
- **DoD:** a strong technical answer raises technical belief AND confidence, writes traceable evidence, and leaves customer_orientation confidence low.

## Sprint R4 — Evidence-Gap Orchestrator (kills levels)
**Goal:** Deterministic, replayable next-action selection.
- Implement the scoring function (blueprint §4) + role arbitration (one speaker, cooldown, reason-gated).
- Fast-path turn classifier: vague? contradictory?
- **DoD:** given a fixture, the next action is reproducible; the PS-11 scenario (Technical accepts → Product challenges customer impact) emerges with **no hard-coded ladder**.

## Sprint R5 — Multimodal Canvas + Real Judge0
**Goal:** Voice → code and back, real execution.
- `CodeExecutor` interface → real Judge0; task model; Monaco becomes task-driven & event-emitting.
- Generalized Canvas surface (code/scenario/design/roleplay/voice) per blueprint §6.
- Code/test results ingested as structured evidence (not read aloud).
- **DoD:** scripted coding fixture runs end-to-end, real tests execute, results change the next question; falls back gracefully if Judge0 is down.

## Sprint R6 — All 5 Roles + Scenario/Role-play
**Goal:** Full panel as config + scenario modality.
- 5 role-policy objects; Customer role-play + scenario tasks.
- Natural, motivated transitions ("Your implementation makes sense — I want to explore the customer side.").
- **DoD:** a single interview traverses ≥3 roles with motivated transitions and zero simultaneous speech.

## Sprint R7 — MCP Real-World Context (safe, read-only)
**Goal:** One grounded scenario (GitHub/PostHog/Linear), read-only + mock fallback.
- **DoD:** interview still works if MCP is down; when up, a scenario is materially richer.

## Sprint R8 — Assessment, Control Room & Replay
**Goal:** The judge-facing payoff.
- Async assessment: competency profile + confidence + evidence refs + recommendation.
- Control-room UX: current role, "why this question?" card, candidate state, timeline replay.
- Candidate post-mortem: transcript-linked, actionable feedback.
- **DoD:** a full interview produces a coherent report whose every major claim is traceable to evidence.

## Sprint R9 — Hardening & Disclosure
**Goal:** Demo-proof.
- AI disclosure modal + persistent indicator + logged event.
- 20+ scripted E2E runs, 10+ interruptions, repeated role/code transitions, injected model/Judge0 failures.
- Latency measurement on voice path; failure containment per `docs/17`.
- **DoD:** reliability P0 items hold under stress; nothing on the critical voice path blocks on deep assessment.
