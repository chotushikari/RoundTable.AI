# Current State Audit

Phase: 1 only  
Audited: 2026-09-06  
Branch: `piyush` tracking `origin/piyush`  
Scope: repository, current Agora integration, runtime checks, feature classification against PS-11. No implementation code was modified.

## Method

- Read `docs/25_EXPERT_REBUILD_AUDIT_PROMPT.md`.
- Read the full `docs/` product/spec set, including `00_READ_FIRST.md` through `22_DECISION_LOG_OPEN_QUESTIONS.md`, `24_BUILD_BLUEPRINT_AND_TIER_PLAN.md`, and `26_CURRENT_STATUS_TEMPLATE.md`.
- Read the progressive-disclosure docs under `docs/ai/`, including L0, all L1 files, RECIPE, and relevant L2 files.
- Read the local Agora skill references for Conversational AI, integration patterns, testing guidance, and TypeScript server SDK usage.
- Inspected repository files with `rg --files` and source search.
- Ran build/type/API/browser checks and a server-side Agora start/stop smoke.

## Repository Tree

Top-level:

```text
D:\RoundTable-AI
|-- .agents/
|-- .github/
|-- .next/
|-- .s6build/
|-- .vercel/
|-- app/
|   |-- api/
|   |   |-- chat/completions/route.ts
|   |   |-- generate-agora-token/route.ts
|   |   |-- health/db/route.ts
|   |   |-- invite-agent/route.ts
|   |   |-- logger/route.ts
|   |   |-- recruiter/interviews/route.ts
|   |   |-- recruiter/interviews/[id]/route.ts
|   |   `-- stop-conversation/route.ts
|   |-- interview/page.tsx
|   |-- recruiter/page.tsx
|   |-- recruiter/[id]/page.tsx
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- components/
|   |-- brand/
|   |-- marketing/
|   |-- recruiter/
|   |-- ui/
|   |-- CodeWorkspace.tsx
|   |-- ConversationComponent.tsx
|   |-- LandingPage.tsx
|   |-- QuickstartConversationLayout.tsx
|   |-- QuickstartPreCallCard.tsx
|   |-- QuickstartPipelineMetrics.tsx
|   `-- QuickstartTranscriptPanel.tsx
|-- docs/
|-- hooks/
|-- lib/
|   |-- db/
|   |-- interview/
|   |-- agora.ts
|   |-- conversation.ts
|   `-- orchestrator.ts
|-- public/
|-- scripts/
|-- styles/
|-- supabase/
|   `-- migrations/0001_init.sql
|-- types/
|-- package.json
|-- package-lock.json
|-- next.config.mjs
|-- tailwind.config.ts
|-- tsconfig.json
`-- vercel.json
```

Important note: `docs/implementation/FEATURE_STATUS.md`, `ARCHITECTURE_DIFF.md`, and `RISK_REGISTER.md` were absent before this audit. `docs/implementation/CURRENT_STATE.md` and `PS11_GAP_MATRIX.md` existed but described an older empty-repo state and were stale.

## Git State

The working tree was dirty before this audit. Existing uncommitted changes include Agora control-plane work, recruiter UI, branding, Supabase repository code, and interview domain files. These were treated as repository truth and were not reverted.

Observed uncommitted areas:

- Modified: `.gitignore`, `app/api/chat/completions/route.ts`, `app/api/invite-agent/route.ts`, `app/api/logger/route.ts`, `components/ConversationComponent.tsx`, `components/LandingPage.tsx`, `components/CodeWorkspace.tsx`, `lib/db/repository.ts`, `scripts/verify-api-contracts.ts`, `tailwind.config.ts`, `types/conversation.ts`, and several UI files.
- Untracked: recruiter routes/components, interview route, marketing/brand components, docs `20` through `26`, `lib/interview/*`, and `scripts/verify-sprint06.ts`.

## Entrypoints

Frontend pages:

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | Real | Marketing landing page. |
| `/interview` | Real | Candidate pre-call and live Agora room. |
| `/recruiter` | Real shell | Recruiter dashboard reading persisted interviews. |
| `/recruiter/[id]` | Real shell | Control Room for one persisted interview. |

API routes:

| Route | Status | Purpose |
| --- | --- | --- |
| `GET /api/generate-agora-token` | Real | Mints RTC plus RTM-capable Agora token and a fresh `interview_id` when no channel is passed. |
| `POST /api/invite-agent` | Real | Starts an Agora Conversational AI agent session. Uses custom LLM proxy only when `NEXT_PUBLIC_APP_URL` is set. |
| `POST /api/stop-conversation` | Real | Stops Agora agent by id; handles already-stopping/not-found patterns. |
| `POST /api/chat/completions` | Partial | OpenAI-compatible custom LLM proxy. Real route, validated by mocked contract tests, not used locally without `NEXT_PUBLIC_APP_URL`. |
| `POST /api/logger` | Partial | Persists client events and returns workspace commands. Does not update candidate state from transcript evidence. |
| `GET /api/health/db` | Real | Checks Supabase schema reachability. |
| `GET /api/recruiter/interviews` | Partial | Read-only list of persisted interviews. |
| `GET /api/recruiter/interviews/[id]` | Partial | Read-only state/event/timeline fetch. |

Missing route families:

- No company dashboard route at `/company`.
- No job setup route.
- No generated candidate-link route.
- No tokenized `/interview/[token]` candidate link flow.
- No assessment/report/replay routes.
- No code execution route.
- No canvas/design route.

## Versions

Declared in `package.json`:

- Next `^16.2.6`
- React `^19.0.0`
- TypeScript `^5.7.3`
- `agora-agents` `^2.3.1`
- `agora-rtc-react` `^2.5.1`
- `agora-rtc-sdk-ng` `^4.24.3`
- `agora-rtm` `^2.2.3`
- `agora-token` `^2.0.5`
- `agora-agent-client-toolkit` `1.2.0`
- `agora-agent-uikit` `1.1.0`
- `@supabase/supabase-js` `^2.45.4`
- `ai` `^6.0.275`

Resolved locally by `npm list --depth=0`:

- Next `16.3.4`
- React / React DOM `19.2.8`
- TypeScript `5.9.3`
- `agora-agents` `2.7.0`
- `agora-rtc-react` `2.5.1`
- `agora-rtc-sdk-ng` `4.24.8`
- `agora-rtm` `2.3.0`
- `agora-token` `2.0.6`
- `agora-agent-client-toolkit` `1.2.0`
- `agora-agent-uikit` `1.1.0`
- `@supabase/supabase-js` `2.115.0`
- `ai` `6.0.275`
- `@ai-sdk/openai` `3.0.106`
- `@ai-sdk/google` `4.0.63`
- `@monaco-editor/react` `4.7.0`
- `zod` `4.5.4`

## Environment Variables

Observed names only; secrets were not printed.

Present in `.env.local`:

- `NEXT_PUBLIC_AGORA_APP_ID`
- `NEXT_AGORA_APP_CERTIFICATE`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Declared in `env.local.example`:

- `NEXT_PUBLIC_AGORA_APP_ID`
- `NEXT_AGORA_APP_CERTIFICATE`

Referenced in source but not present locally:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_LLM_PROXY_KEY`
- `GEMINI_OPENAI_BASE_URL`
- optional commented BYOK keys for Deepgram/ElevenLabs.

Important consequence: local `/api/invite-agent` does not use `/api/chat/completions` as Agora's custom LLM because `NEXT_PUBLIC_APP_URL` is unset. It falls back to Agora-managed OpenAI.

## Agora Integration Trace

Source-level integration:

- `GET /api/generate-agora-token` uses `RtcTokenBuilder.buildTokenWithRtm`, preserving RTM capability.
- `LandingPage` fetches token, starts agent, creates RTM client, logs in, subscribes to channel, mounts `ConversationComponent`.
- `invite-agent` creates `AgoraClient`, `Agent`, Deepgram STT, OpenAI LLM, MiniMax TTS, RTM events, metrics, errors, VAD, and agent session.
- `ConversationComponent` uses `agora-rtc-react` `useJoin`, `useLocalMicrophoneTrack`, `usePublish`, `useRemoteUsers`, `useClientEvent`.
- `AgoraVoiceAI.init()` subscribes transcript, agent state, metrics, and errors through RTM.
- `lib/conversation.ts` normalizes transcript data and preserves `INTERRUPTED` turns.

Runtime evidence from this audit:

- Token route returned a token, UID, channel, and UUID `interview_id`.
- DB health returned all six core tables reachable.
- Direct API start/stop smoke succeeded: `/api/invite-agent` returned a `RUNNING` agent id, and `/api/stop-conversation` returned success.
- Browser start flow reached the live room and rendered "Agora Conversational AI", "RTC connecting", transcript panel, and End Conversation.
- Browser RTC did not complete join in this environment. Console/server logs showed:
  - `parsing media attribute ice-options error, "a=ice-options:trickle goog-sped-v1"`
  - `AgoraRTCError GET_LOCAL_CONNECTION_PARAMS_FAILED: Error: Invalid space at 12`
- Because RTC join did not complete, no live candidate speech, final transcript, agent response, interruption, or transcript-to-state loop was demonstrated.

Observed server timings:

- `/api/generate-agora-token`: 40 to 62 ms after compile.
- Direct `/api/invite-agent`: 5.8 s in one API-only run; browser start run 2.4 s.
- `/api/stop-conversation`: 2.7 to 3.1 s.
- `/api/health/db`: 7.3 s application-code time on first check.
- `/api/recruiter/interviews`: first run slow due compile/Supabase, later 342 ms.

These are route timings, not voice latency metrics.

## Candidate Creation To Candidate Link

Current real path:

```text
/ -> /interview -> disclosure checkbox -> Start interview -> generated Agora channel/interview_id -> live room
```

Missing target path:

```text
company dashboard -> create job -> generated candidate invite link -> /interview/[token] -> device check -> room
```

There is no persisted job creation, invite-token generation UI, or tokenized candidate route. The current candidate link is the static `/interview` route.

## Candidate Speech To Transcript To Agent Response

Implemented in source:

```text
candidate mic -> Agora RTC -> Agora STT -> RTM transcript events -> AgoraVoiceAI -> transcript panel -> /api/logger
```

Actual runtime result:

- Browser reached RTC connecting but RTC join failed in this environment.
- No transcript final was observed.
- No candidate speech to agent response loop was demonstrated.
- `TRANSCRIPT_FINAL` is only logged after `messageList` receives a completed turn.

## Role Changes

Implemented in source:

- Five role personas exist in `lib/interview/personas.ts`.
- `selectNextAction()` can pick role and modality from `CandidateState`.
- `/api/chat/completions` builds a per-turn role/persona prompt and persists `NEXT_ACTION_SELECTED`.

Actual runtime result:

- Local Agora session did not use the proxy because `NEXT_PUBLIC_APP_URL` is unset.
- No persisted state update beyond version 0 is implemented from transcripts.
- `selectNextAction(null or version < 2)` always returns `warmup_technical`.
- No live role change was demonstrated.

## IDE Lifecycle

Implemented:

- `CodeWorkspace` uses Monaco.
- Task library exists for LRU cache, debounce, async bug, and rate limiter.
- `/api/logger` can return `newModality: code` and `codeTask` when latest decision has code/debug/design modality.
- "Share with interviewer" emits `CODE_CHANGED`.

Missing:

- No Run button.
- No tests.
- No Judge0 or sandboxed executor.
- No `RUN_STARTED`, `RUN_COMPLETED`, `TEST_RESULT`, `SUBMISSION`, timeout, or execution-error route.
- No code-result evidence writer.

## Canvas Lifecycle

- No Excalidraw or general whiteboard implementation found.
- `design` exists as an action modality and `isCanvasModality()` treats `design` as workspace-opening, but `CodeWorkspace` is the only rendered workspace.
- No `CANVAS_OPENED`, `CANVAS_CHANGED`, or `CANVAS_SUBMITTED` code path exists.

## Final Assessment

- Supabase `assessments` table exists.
- No assessment generator route, UI, worker, report, replay, evidence aggregation, recommendation, or candidate feedback pipeline exists.

## Persistent State Stores

Real:

- Supabase Postgres schema:
  - `interviews`
  - `interview_events`
  - `candidate_state`
  - `evidence`
  - `contradictions`
  - `assessments`

Partial:

- `lib/db/repository.ts` can append events, list events, get latest state, save new state version, and ensure an initial interview state.
- `ensureInterview()` creates an initial state version.

In-memory only:

- `ConversationComponent` still has stale `candidateStateRef`, `activeRoleRef`, and `recentTranscriptRef`.

Missing:

- No transcript-analysis writer calls `saveNewStateVersion()` after meaningful answers.
- No evidence rows are written.
- No contradiction rows are written.
- No assessment rows are written.

No `localStorage` or `sessionStorage` usage was found in the inspected app code.

## Event And Logging System

Implemented event sinks:

- Client posts `SESSION_STARTED`, `AGENT_STATE_CHANGED`, `METRICS`, `ERROR`, `TRANSCRIPT_FINAL`, `INTERRUPTED`, and `CODE_CHANGED` to `/api/logger`.
- `/api/chat/completions` can persist `NEXT_ACTION_SELECTED`.
- `/api/logger` can synthesize `CODE_TASK_OPENED` once per code decision.

Gaps:

- `SESSION_STARTED` is not the canonical `AGORA_SESSION_STARTED` event name.
- `METRICS` is not the canonical `AGORA_METRICS` event name.
- `INTERRUPTED` is not the canonical `AGENT_INTERRUPTED` event name.
- `AI_DISCLOSURE_SHOWN` is not emitted despite a disclosure checkbox.
- `TRANSCRIPT_PARTIAL` is not logged.
- `ROLE_CHANGED`, `CANDIDATE_STATE_UPDATED`, `EVIDENCE_EXTRACTED`, `GAP_DETECTED`, `VAGUENESS_DETECTED`, `CONTRADICTION_DETECTED`, `TEST_RESULT`, `ASSESSMENT_*`, and `INTERVIEW_COMPLETED` are not implemented.
- Event `sequence` is nullable and not assigned monotonically by the server.

## Deployment

- `vercel.json` declares Next.js framework and `npm install`.
- `.vercel/` exists locally.
- `.env.local` has local secrets, but deployment env was not verified.
- Build produced all expected routes locally.
- No remote deploy or Vercel preview was checked during this audit.

## Verification Results

| Command/check | Result | Notes |
| --- | --- | --- |
| `npm install` | PASS | Restored dependencies after a failed pnpm attempt against npm-installed `node_modules`. |
| `npm run typecheck` | PASS | `tsc --noEmit` clean. |
| `npm run verify:api` | PASS | API contract checks passed; route tests use mocks for Agora/model surfaces. |
| `npm run build` | PASS | Next build generated 12 routes successfully. |
| `node --import tsx scripts/verify-sprint06.ts` | PASS | 11 pure checks passed for orchestrator modality routing, problem selection, prompt assembly. |
| `npm run lint` | FAIL | React compiler error plus warnings. See below. |
| `npm run doctor` | FAIL under npm | Doctor requires pnpm user agent. |
| `pnpm run *` | BLOCKED/dirty-env | pnpm tried to normalize npm-installed `node_modules`; not reliable without a clean pnpm install. |
| Browser `/` | PASS | Page loads, no overlay. |
| Browser `/interview` pre-call | PASS | Disclosure gate renders. |
| Browser `/recruiter` | PARTIAL | Page loads, reads empty interview list. |
| Browser start interview | PARTIAL/FAIL | Live room renders, but RTC join fails with AgoraRTC `GET_LOCAL_CONNECTION_PARAMS_FAILED`. |
| API Agora start/stop | PASS | Server-side invite and stop succeeded. |

Lint failure:

```text
components/ConversationComponent.tsx:164:9
Error: Cannot access variable before it is declared
setActiveModality is accessed before it is declared
```

Warnings:

- Unused `interviewId` in `app/api/logger/route.ts`.
- Unused imports and `any` usage in `components/ConversationComponent.tsx`.

Browser console/server errors:

- Next image warning for modified Agora logo width/height.
- Agora RTC join error:
  - media attribute `ice-options` parse error
  - `GET_LOCAL_CONNECTION_PARAMS_FAILED: Error: Invalid space at 12`

## Summary Verdict

Keep:

- Agora token route using RTC+RTM token builder.
- Agora server start/stop route scaffolding.
- StrictMode guarded RTC/RTM client lifecycle.
- Transcript/metrics/error subscriptions in `ConversationComponent`.
- Supabase schema/repository shape.
- Custom LLM proxy design, with the caveat that it is not active locally without `NEXT_PUBLIC_APP_URL`.
- Five role persona config.
- Recruiter Control Room shell.
- Monaco workspace shell.

Do not call done:

- Adaptive loop.
- Shared candidate state in live behavior.
- Dynamic role selection in live behavior.
- Evidence-linked assessment.
- Vague/contradiction handling.
- Scenario/canvas modalities.
- Interruptible live voice, because it was not demonstrated end-to-end in this environment.

Critical current gap:

The repository has the shell of the PS-11 architecture, but the central loop is not complete: transcript evidence does not update Candidate State, so the orchestrator has no changing evidence model to select meaningful next actions from.
