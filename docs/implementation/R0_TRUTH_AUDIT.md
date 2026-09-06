# R0 — Truth Audit (verified 2026-09-05)

## Method
Static verification run in a Linux sandbox (no network, node_modules originally installed on Windows). Results interpreted with that constraint in mind. Full build/lint proof deferred to Vercel + GitHub CI on push.

## Results

| Check | Result | Notes |
|---|---|---|
| `tsc --noEmit` (typecheck) | ✅ **PASS (exit 0)** | TypeScript is coherent across the whole repo. Meaningful, environment-independent signal. |
| `eslint .` | ⚠️ Inconclusive here | Timed out in sandbox; ESLint 9 flat config is heavy. Runs in CI. |
| `next build` | ⚠️ Blocked by env | Fails only on `getaddrinfo EAI_AGAIN registry.npmjs.org` — cannot download `@next/swc-linux-x64-gnu` offline. Not a code defect. |
| `verify:api` | ⚠️ Blocked by env | `esbuild` binary is win32; sandbox is linux; cannot re-fetch offline. Platform mismatch, not a code defect. |

## Git baseline
- Current branch: `sprint/00-audit`, tracking `origin/sprint/00-audit`.
- Remote: `https://github.com/chotushikari/RoundTable.AI.git`.
- `.gitignore` **excludes `docs/` and `Sprints/`** — planning docs are NOT in the repo history. (Flag: our blueprint/sprint docs won't push unless we change this. See decision below.)
- Node 22.23, npm 10.9.

## Code reality vs PROGRESS.md claims

| PROGRESS claim | Reality | Verdict |
|---|---|---|
| S01 Agora vertical slice | Real: `ConversationComponent.tsx` has full RTC/RTM lifecycle, StrictMode guards, transcript, metrics, error capture. | ✅ **KEEP** |
| S01 event logging → `/api/logger` | Real, but synchronous (no true async path). | ⚠️ Keep shell, rework |
| S02 Candidate State + Orchestrator | Regressed: single float per skill, in-memory only. | ❌ **REBUILD** (R3) |
| S02 runtime `session.update()` role swap | Present in `/api/logger` `triggerAgentUpdate`; racey mechanism. | ❌ Replace w/ proxy (R2) |
| S03 "real LLM" Gemini analysis | Real call, but drives the **levels** model + wrong model id string. | ❌ **REBUILD** (R3/R4) |
| S04 Product/Manager transitions | Regressed: `if score>0.6 → next role` linear ladder. | ❌ **REBUILD** (R4) |
| S05 Code Workspace | Partial: Monaco mounts, but static stub — no task model, no execution, no events. | ⚠️ **REBUILD** (R5) |
| Two-speed intelligence | Does **not** exist — all runs synchronously in logger POST. | ❌ Build (R3) |
| Persistence (DB) | None. In-memory only. | ❌ Build (R1) |
| Custom-LLM proxy wired to Agora | Route exists (`/api/chat/completions`) but Agora uses managed OpenAI, not our proxy. | ❌ Wire it (R2) |

## Keep / Rebuild summary
- **KEEP (working, do not touch in early sprints):** Agora RTC/RTM voice path, token routes, invite-agent scaffold, UI shell (`QuickstartConversationLayout`, transcript panel, metrics, visualizer, connection status), StrictMode lifecycle handling.
- **REBUILD on blueprint:** candidate state model, orchestrator, role control (via proxy), code workspace, assessment, persistence, two-speed split.

## Decisions triggered
1. **`docs/` and `Sprints/` are gitignored.** To version the blueprint + interface docs on `origin/piyush`, we should stop ignoring at least `docs/implementation/`. **Recommend:** un-ignore `docs/` and `Sprints/` on the `piyush` branch so the plan travels with the code. (Awaiting confirmation — low risk, reversible.)
2. Build/lint/verify gates are **green-lit to run in CI/Vercel**, which is where they're authoritative anyway.

## DoD
- [x] Static truth audit complete; typecheck green.
- [x] Keep-vs-rebuild map produced.
- [ ] Live voice smoke test (needs `npm install` on a networked machine — your local or Vercel preview).
