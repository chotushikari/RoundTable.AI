# CURRENT_STATE — Phase 1 Audit (2026-09-06)

> Produced per `docs/25_EXPERT_REBUILD_AUDIT_PROMPT.md` Phase 1. No code was modified.

## Repository & runtime
- **Stack:** Next.js 16.3.4 (App Router, Turbopack), React 19.2.8, TypeScript 5.9.3, Tailwind 3.4, Zod 4.5.4
- **Agora client:** `agora-agent-client-toolkit` 1.2.0, `agora-agent-uikit` 1.1.0, `agora-rtc-react` 2.5.1, `agora-rtc-sdk-ng` 4.24.8, `agora-rtm` 2.3.0
- **Agora server:** `agora-agents` 2.7.0 (AgoraClient/Agent; Deepgram nova-3 STT → OpenAI-compatible LLM → MiniMax TTS), `agora-token` 2.0.6
- **LLM:** `gemini-2.0-flash` via Google's OpenAI-compatible gateway (`@ai-sdk/openai` + `ai` v6, streaming SSE)
- **Persistence:** Supabase Postgres — server-only service-role client; RLS enabled, anon key has no table access
- **Env vars (names only):** local `.env.local` contains `NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; `NEXT_PUBLIC_APP_URL`, `NEXT_LLM_PROXY_KEY`, and `GEMINI_OPENAI_BASE_URL` are referenced but not set locally
- **Deployment:** Vercel project `roundtable-ai` (linked via `.vercel/`), default Next.js pipeline, npm

## Entrypoints
| Kind | Path | Role |
|---|---|---|
| Page | `/` | Marketing landing (`components/marketing/MarketingLanding.tsx`) |
| Page | `/interview` | Candidate experience: AI-disclosure gate → live room |
| Page | `/recruiter`, `/recruiter/[id]` | Dashboard + Control Room |
| API | `/api/chat/completions` | **Control plane** — intended Agora custom LLM; per-turn persona/state injection, OpenAI SSE out |
| API | `/api/invite-agent` | Starts Agora agent; points LLM at the proxy only when `NEXT_PUBLIC_APP_URL` is set; local env falls back to managed `gpt-4o-mini` |
| API | `/api/generate-agora-token` | RTC+RTM token; mints `interview_id` on fresh channel |
| API | `/api/logger` | Idempotent event sink + workspace open/close commands |
| API | `/api/recruiter/interviews[/id]` | Read-only recruiter data (service client) |
| API | `/api/stop-conversation`, `/api/health/db` | Lifecycle + health |

## Verified checks (2026-09-06)
- `npm run typecheck` ✅
- `npm run verify:api` ✅
- `npm run build` ✅ (12 routes)
- `node --import tsx scripts/verify-sprint06.ts` ✅ 11/11
- `npm run lint` ❌ — `components/ConversationComponent.tsx:164` calls `setActiveModality` before declaration; several unused/`any` warnings also remain
- `npm run doctor` ❌ under npm because the repo doctor expects pnpm, but pnpm and npm dependency layouts currently conflict
- Browser smoke ✅ pages load (`/`, `/interview`, `/recruiter`), but candidate live RTC join ❌ failed with `AgoraRTCError GET_LOCAL_CONNECTION_PARAMS_FAILED: Error: Invalid space at 12`
- Server-side Agora lifecycle smoke ✅ token mint, invite-agent, and stop-conversation all returned success

## Candidate flow trace
`/` → Start → `/interview` → AI-disclosure checkbox gate → start → token route mints channel + `interview_id` → invite-agent starts the Agora agent. In local env, the agent uses the managed OpenAI path because `NEXT_PUBLIC_APP_URL` is absent; with that env set, it should call `/api/chat/completions` as the custom LLM proxy. Client code is prepared to log `TRANSCRIPT_FINAL`, `INTERRUPTED`, `AGENT_STATE_CHANGED`, `METRICS`, `ERROR`, `SESSION_STARTED`, and `CODE_CHANGED` to `/api/logger`, and the logger can return `newModality`/`codeTask` to open Monaco. The browser run did not reach a working RTC voice exchange because the RTC join failed, so live transcript finalization, interruption handling, agent audio, and code trigger behavior remain unverified in-browser.

## ⚠️ Critical finding — the adaptive loop is inert live
`ensureInterview()` writes state v0; **no code path writes a new state version after transcripts arrive** (R1 removed the old logger analysis; its replacement — R3 evidence extraction — is not built). `selectNextAction()` therefore sees `version < 2` every turn and permanently returns `warmup_technical`. In a live interview today: one Technical warm-up persona forever; role rotation, code-workspace triggers, and gap-driven probing never fire live (they pass unit tests because tests craft advanced states). The old `lib/orchestrator.ts` (levels model + Gemini analysis) is dead code, kept alive only by a type import.

## Persistent state stores
- `interviews` (row per session; `invite_token`, `panel_config`, `job_title` etc. currently unused)
- `interview_events` (append-only, idempotent by `(interview_id, event_id)`)
- `candidate_state` (immutable versioned rows, latest = max version)
- `evidence`, `contradictions`, `assessments` (schema only — never written)

## Missing surfaces
Company dashboard / candidate-link generation (no interview-creation flow), canvas/Excalidraw, scenario task system, code execution (Judge0), MCP, assessment generation, `AI_DISCLOSURE_SHOWN` event.
