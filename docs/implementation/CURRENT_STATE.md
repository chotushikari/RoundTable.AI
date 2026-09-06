# CURRENT_STATE — Phase 1 Audit (2026-09-06)

> Produced per `docs/25_EXPERT_REBUILD_AUDIT_PROMPT.md` Phase 1. No code was modified.

## Repository & runtime
- **Stack:** Next.js 16.3.4 (App Router, Turbopack), React 19, TypeScript 5.7, Tailwind 3.4, Zod 4
- **Agora client:** `agora-agent-client-toolkit` 1.2.0, `agora-agent-uikit` 1.1.0, `agora-rtc-react` 2.5.1, `agora-rtc-sdk-ng` 4.24.3, `agora-rtm` 2.2.3
- **Agora server:** `agora-agents` 2.3.1 (AgoraClient/Agent; Deepgram nova-3 STT → custom-LLM proxy → MiniMax TTS), `agora-token` 2.0.5
- **LLM:** `gemini-2.0-flash` via Google's OpenAI-compatible gateway (`@ai-sdk/openai` + `ai` v6, streaming SSE)
- **Persistence:** Supabase Postgres — server-only service-role client; RLS enabled, anon key has no table access
- **Env vars (names only):** `NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`, `NEXT_PUBLIC_APP_URL`, `NEXT_LLM_PROXY_KEY`, `GEMINI_API_KEY`, `GEMINI_OPENAI_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (+ commented optional BYOK Deepgram/ElevenLabs)
- **Deployment:** Vercel project `roundtable-ai` (linked via `.vercel/`), default Next.js pipeline, npm

## Entrypoints
| Kind | Path | Role |
|---|---|---|
| Page | `/` | Marketing landing (`components/marketing/MarketingLanding.tsx`) |
| Page | `/interview` | Candidate experience: AI-disclosure gate → live room |
| Page | `/recruiter`, `/recruiter/[id]` | Dashboard + Control Room |
| API | `/api/chat/completions` | **Control plane** — Agora's custom LLM; per-turn persona/state injection, OpenAI SSE out |
| API | `/api/invite-agent` | Starts Agora agent; points LLM at the proxy with `interview_id` |
| API | `/api/generate-agora-token` | RTC+RTM token; mints `interview_id` on fresh channel |
| API | `/api/logger` | Idempotent event sink + workspace open/close commands |
| API | `/api/recruiter/interviews[/id]` | Read-only recruiter data (service client) |
| API | `/api/stop-conversation`, `/api/health/db` | Lifecycle + health |

## Verified checks (2026-09-05/06)
- `tsc --noEmit` ✅ · `next build` ✅ (12 routes) · `verify:api` ✅ · `verify-sprint06` ✅ 11/11
- Not verified this pass: live voice session, browser console, server logs (harness tool outage during audit; re-run before Phase B)

## Candidate flow trace
`/` → Start → `/interview` → AI-disclosure checkbox gate → start → token route mints channel + `interview_id` → invite-agent starts the Agora agent with LLM = proxy → voice loop: candidate speech → Deepgram STT → Agora calls proxy → proxy loads CandidateState, runs `selectNextAction()`, builds persona prompt, streams Gemini SSE → MiniMax TTS → candidate hears the reply. Client logs `TRANSCRIPT_FINAL`, `INTERRUPTED`, `AGENT_STATE_CHANGED`, `METRICS`, `ERROR`, `SESSION_STARTED`, `CODE_CHANGED` to `/api/logger` → Supabase (idempotent). Logger responses carry `newModality`/`codeTask` → Monaco workspace opens with the selected task; "Share with interviewer" → `CODE_CHANGED` → proxy embeds the candidate's code in the next turn's prompt.

## ⚠️ Critical finding — the adaptive loop is inert live
`ensureInterview()` writes state v0; **no code path writes a new state version after transcripts arrive** (R1 removed the old logger analysis; its replacement — R3 evidence extraction — is not built). `selectNextAction()` therefore sees `version < 2` every turn and permanently returns `warmup_technical`. In a live interview today: one Technical warm-up persona forever; role rotation, code-workspace triggers, and gap-driven probing never fire live (they pass unit tests because tests craft advanced states). The old `lib/orchestrator.ts` (levels model + Gemini analysis) is dead code, kept alive only by a type import.

## Persistent state stores
- `interviews` (row per session; `invite_token`, `panel_config`, `job_title` etc. currently unused)
- `interview_events` (append-only, idempotent by `(interview_id, event_id)`)
- `candidate_state` (immutable versioned rows, latest = max version)
- `evidence`, `contradictions`, `assessments` (schema only — never written)

## Missing surfaces
Company dashboard / candidate-link generation (no interview-creation flow), canvas/Excalidraw, scenario task system, code execution (Judge0), MCP, assessment generation, `AI_DISCLOSURE_SHOWN` event.
