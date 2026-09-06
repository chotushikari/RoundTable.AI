# RoundTable.AI — Master Sprint Index (v2, execution guide)

> Single source of truth for build order. Each sprint: goal → deliverables → Definition of Done → the git commands **you** run (the sandbox can't push; see R0_TRUTH_AUDIT). All work lands on `origin/piyush`, never `main`. Vercel auto-builds the `piyush` preview — that's where build/lint/test are authoritative.

## Workflow contract per sprint
1. I write/edit files for the sprint on branch `piyush`.
2. You run the commit+push block I give you (from `D:\RoundTable-AI` in PowerShell/Git Bash).
3. Vercel builds the `piyush` preview; we read the build result + smoke-test the deploy.
4. Only after DoD is green do we start the next sprint.

Standard push block (template):
```bash
git add -A
git commit -m "<conventional message for the sprint>"
git push -u origin piyush
```

---

## ✅ R0 — Re-baseline & Truth Audit  (DONE, pending your push)
- Deliverables: `FINALIZED_BLUEPRINT.md`, `SPRINT_PLAN_V2.md`, `R0_TRUTH_AUDIT.md`, interface docs, un-ignored `docs/`, `piyush` branch.
- DoD: typecheck green ✅; keep-vs-rebuild map ✅; live voice smoke test ⛳ (needs networked `npm install` — do on your machine or Vercel).
- Push:
```bash
del .git\index.lock
git add -A
git commit -m "docs(blueprint): finalize architecture, sprint plan v2, R0 audit, interface docs; un-ignore docs"
git push -u origin piyush
```

## R1 — Persistence & Event Backbone
- Deliverables: Supabase schema (`interviews`, `interview_events`, `candidate_state`, `evidence`, `contradictions`, `assessments`); typed event envelope + `event_id` idempotency; `/api/logger` writes durable events; state read/write helpers in `lib/`.
- Needs: **Supabase credentials** (URL, anon key, service role key) in `.env.local` + Vercel env.
- DoD: live session events persist + replay; duplicate events don't double-write.
- Commit: `feat(persistence): supabase event backbone + versioned candidate state`

## R2 — Custom-LLM Proxy Control Plane  (keystone)
- Deliverables: `invite-agent` points Agora at `/api/chat/completions`; proxy assembles each turn from shared state + active role persona + scoped evidence + current action + guardrails; every turn emits `NEXT_ACTION_SELECTED`.
- DoD: same agent changes persona between turns, zero reconnection, server-driven; reason logged per turn.
- Commit: `feat(control-plane): custom-llm proxy drives shared-brain role personas`

## R3 — Belief/Confidence State + Evidence Extraction
- Deliverables: `CompetencySignal{belief,confidence}` + `ChallengeVector`; deep-path extractor (claims/mechanism/tradeoff) → `evidence` linked to transcript segments; two-speed split real (fast path never blocks on deep path).
- DoD: strong technical answer raises technical belief+confidence, writes traceable evidence, leaves customer_orientation confidence low.
- Commit: `feat(intelligence): belief+confidence state and evidence graph`

## R4 — Evidence-Gap Orchestrator  (removes the "levels" bug)
- Deliverables: deterministic action scoring (info_value, gap_coverage, role_relevance, challenge_fit, − repetition/sufficiency/time); role arbitration (one speaker, cooldown, reason-gated); vagueness + contradiction fast classifiers.
- DoD: reproducible next action from a fixture; PS-11 scenario emerges with no hard-coded ladder.
- Commit: `feat(orchestrator): evidence-gap driven next-action selection`

## R5 — Multimodal Canvas + Real Judge0
- Deliverables: `CodeExecutor` interface → real Judge0; task model; Monaco task-driven + event-emitting; generalized Canvas (code/scenario/design/roleplay/voice); code/test results ingested as evidence; graceful fallback.
- Needs: Judge0 access (RapidAPI key or self-host decision).
- DoD: scripted coding fixture runs end-to-end with real execution; results change next question; fallback works if Judge0 down.
- Commit: `feat(canvas): real judge0 execution + multimodal workspace`

## R6 — All 5 Roles + Scenario/Role-play
- Deliverables: 5 role-policy config objects; Customer role-play + scenario tasks; motivated conversational transitions.
- DoD: one interview traverses ≥3 roles with motivated transitions; zero simultaneous speech.
- Commit: `feat(panel): five role policies + scenario/roleplay modality`

## R7 — MCP Real-World Context (read-only, safe)
- Deliverables: one connector (GitHub/PostHog/Linear) behind a tool interface; allowlist; mock fallback; tool events as evidence context.
- DoD: interview works with MCP down; richer scenario when up.
- Commit: `feat(mcp): safe read-only real-world interview context`

## R8 — Assessment, Control Room & Replay
- Deliverables: async assessment (profile + confidence + evidence refs + recommendation); Control Room UX; "why this question?" card; timeline replay; candidate feedback page.
- DoD: full interview → coherent report; every major claim traceable to evidence.
- Commit: `feat(assessment): evidence-linked report, control room, replay`

## R9 — Hardening & Disclosure
- Deliverables: AI disclosure modal + persistent indicator + logged event; 20+ E2E runs; 10+ interruptions; injected model/Judge0 failures; latency measurement; failure containment.
- DoD: P0 reliability holds under stress; nothing on voice path blocks on deep assessment.
- Commit: `chore(hardening): reliability, disclosure, stress runs for submission`

---

## Environment note (why pushes are manual)
The repo is on a Windows drive mounted read-limited into the Linux build sandbox; git can't write `.git/` locks there, and the sandbox has no network for `next build`/`esbuild`. So: **I author files, you run git + let Vercel build.** This is a tooling boundary, not a code issue.
