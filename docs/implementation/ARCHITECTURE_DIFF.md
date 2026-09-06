# ARCHITECTURE_DIFF — Phase 1 Audit (2026-09-06)

North star (docs/25 §5) vs. reality:

```
CANDIDATE UI ──────────────── ✅ real (interview room, disclosure gate, workspace)
AGORA CONVO AI ────────────── ⚠️ server lifecycle real; browser RTC join failed; local custom proxy inactive without NEXT_PUBLIC_APP_URL
INTERVIEW CORE
  ├ Candidate State ───────── ⚠️  half: versioned store, no writer past v0 (R3)
  ├ Evidence ──────────────── ❌   tables only
  ├ Orchestrator ──────────── ⚠️  R2 baseline (least-confidence heuristic);
  │                                 evidence-gap scoring (R4) not built
  ├ Next Interview Action ─── ✅   shape + persistence + reason codes
  ├ Challenge Controller ──── ❌
  └ Interview Budget ───────── ❌   time_budget always null
ROLE POLICIES ─────────────── ✅   5 personas as config (blueprint-conformant)
MODALITY
  ├ Voice ─────────────────── ⚠️   implemented; browser live join failed in this audit
  ├ Code ──────────────────── ⚠️   workspace real; no executor, no TEST_RESULT
  ├ Canvas/Design ─────────── ❌
  ├ Scenario ──────────────── ❌
  └ MCP ───────────────────── ❌
EVIDENCE ──────────────────── ❌
ASSESSMENT ────────────────── ❌
CONTROL ROOM (judge UX) ───── ✅   early version polling persisted events/state
```

## Where the architecture already matches the blueprint
- One continuous Agora session with runtime perspective shifts via the proxy (preferred over agent handoff — docs/25 §6) ⚠️ implemented, but local env currently falls back to managed OpenAI unless `NEXT_PUBLIC_APP_URL` is set
- Two-speed split: deterministic action selection on the hot path; deep analysis designated off-path (but the deep path is not yet built) ⚠️
- Zod at AI boundaries ✅ · idempotent events ✅ · versioned state ✅ · graceful degradation without DB ✅

## Drift notes
1. `lib/orchestrator.ts` (old levels model + Gemini analysis) is dead code; `ConversationComponent.tsx:52` still type-imports `CandidateState` from it — should import from `lib/interview/types`.
2. `PROGRESS.md` (sprint 00–06 framing) is out of sync with `docs/implementation/SPRINT_PLAN_V2.md` (R0–R9 framing — the plan actually being followed). Recommend PROGRESS.md adopts R-numbering going forward.
3. `docs/` and `Sprints/` were gitignored until 2026-09-06 (commit cd7a7b8 un-ignored docs/) — planning docs now travel with the code.
4. Schema enums (`role_kind`) and TS enums are duplicated between SQL and `lib/interview/types.ts` — keep in sync manually for now.
