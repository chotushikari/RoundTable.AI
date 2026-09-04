# RoundTable AI

RoundTable is a backend-first, voice-native adaptive interview panel. One interruptible Agora Conversational AI agent speaks for several logical interviewers, while a deterministic controller chooses exactly one role and one objective per candidate turn.

The MVP supports Technical, Product, Hiring Manager, Behavioural, and Customer perspectives; signed single-use invitations; shared durable context; dynamic follow-ups; difficulty adjustment; vague-answer and contradiction checks; Monaco and React Flow workspaces; session-scoped MCP tools; isolated E2B tests; and evidence-linked final assessments. It never emits an automatic hire/reject decision.

## Current verification status

The code is derived from Agora's official `agent-quickstart-nextjs`, and the source mapping has been checked. Offline tests, lint, type checking, API contract checks, and a production build are the required local gates. A real Agora voice round trip, RTM transcript delivery, token renewal, 20-attempt barge-in test, and impaired-network test still require project credentials and must not be reported as verified until they are run.

## Architecture

```text
Candidate browser <-- Agora RTC/RTM --> one managed voice agent
                                           |
                                 /api/ai/chat/completions
                                           |
                           panel evaluator + controller
                              |                    |
                         Supabase            MCP / E2B

Company dashboard <-- status-only Realtime projection while live
Company results   <-- transcript + assessment after completion
```

The browser never owns scores, role selection, or candidate state. Each finalized answer is reserved with a hash, evaluated once for all configured roles, checked against literal transcript evidence, and committed with compare-and-swap session state. Duplicate LLM calls reuse the stored response.

## Setup

Requirements: Node.js 22+, npm, an Agora project with Conversational AI and RTM enabled, a Supabase project, Gemini API access, and E2B.

```bash
npm install
copy env.local.example .env.local
npm run doctor
npm run dev
```

Apply [the Supabase migration](supabase/migrations/202609040001_roundtable_core.sql) before using company or candidate flows. Configure these values in `.env.local` and in Vercel:

- `NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`
- `APP_BASE_URL`
- `GEMINI_API_KEY`, with optional `GEMINI_EVALUATOR_MODEL` and `GEMINI_SPEAKER_MODEL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `SESSION_SIGNING_SECRET`
- `E2B_API_KEY`
- `AGORA_WEBHOOK_SECRET`
- `CRON_SECRET`

Secrets without the `NEXT_PUBLIC_` prefix must never reach the browser.

## Product flow

1. A company signs in at `/company`, creates an organization, pastes a JD and desired outcomes, and chooses two to five panel roles.
2. `POST /api/interviews/:id/plan` creates a Zod-validated editable rubric. Employer text is treated as untrusted input.
3. Publishing freezes an immutable version and returns a seven-day, single-use candidate URL.
4. The candidate sees the fixed AI/retention/human-review disclosure and must consent before the server creates the Agora session.
5. Agora calls the authenticated OpenAI-compatible endpoint. It ignores caller model and system instructions, stores transcript evidence, evaluates all roles, applies controller rules, and streams the chosen interviewer question.
6. Code/canvas drafts autosave; only explicit checkpoints are exposed to AI tools. E2B executes a server-selected JS/TS harness for at most 15 seconds with capped output and no app secrets.
7. Finalization creates an idempotent evidence-linked assessment. The company gets the report after completion; candidate feedback remains hidden until explicitly released.

## Main APIs

- `POST /api/interviews`, `POST /api/interviews/:id/plan`, `POST /api/interviews/:id/publish`
- `GET /api/invitations/:token`, `POST /api/invitations/:token/session`
- `POST /api/sessions/:id/renew|stop|finalize|release`
- `GET|PUT /api/sessions/:id/artifacts/:type`
- `POST /api/ai/chat/completions`
- `POST /api/mcp/:grant`
- `POST /api/webhooks/agora`

Company endpoints require a Supabase access token. Candidate session endpoints require the HttpOnly signed guest cookie. The LLM endpoint uses a random per-session bearer credential known only to Agora and the server.

The original unauthenticated quickstart token/start/stop routes remain available only in non-production for baseline diagnostics. Production returns 404 unless `ENABLE_LEGACY_QUICKSTART_DEMO=true` is set deliberately.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run verify:api
npm run build
```

`npm run verify` begins with `doctor`, so it requires a complete `.env.local`. Supabase RLS assertions are in [supabase/tests/rls.sql](supabase/tests/rls.sql).

## Privacy and scope

No raw audio or video is recorded. Transcript, resume, events, artifacts, tool results, assessments, and claimed invitation metadata are purged 30 days after completion by `purge_expired_interview_data()`; `vercel.json` invokes it daily through an authenticated cron route. Live company views receive only session ID, status, health, and timestamps. Video identity/lip-sync analysis, avatars, candidate accounts, ATS integrations, multilingual support, and automatic employment decisions are intentionally outside this MVP.
