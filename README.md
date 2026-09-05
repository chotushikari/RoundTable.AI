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

The company dashboard creates an explicit `demoMode: true` showcase: one project explored by Hiring Manager, Technical Interviewer, Product Manager, Customer, then Behavioural Interviewer. The hiring manager's greeting combines introduction and background into the first question. Five substantive answers complete the panel; the agent gives a short closing statement, then the browser finalizes after the closing transcript and end of agent speech. Allow roughly 30 seconds per answer and rehearse within the five-minute maximum; long answers can still reach the ceiling. The demo waits 1.5 seconds of silence before responding. Candidate speech fragments are grouped under the pending question, and an introduction alone does not complete the project question. A completed question transcript plus end-of-speech state produces a candidate transport receipt; an unheard/interrupted question is repeated before that role can advance. Explicit “skip”, “I don't know”, or “that's my answer” allows a short answer to finish. Normal interviews retain their adaptive policies, and old two-minute invitations retain their original configuration.

## Setup

Requirements: Node.js 22+, npm, an Agora project with Conversational AI and RTM enabled, a Supabase project, Groq API access, and E2B.

```bash
npm install
copy env.local.example .env.local
npm run doctor
npm run dev
```

Apply every migration in [supabase/migrations](supabase/migrations) in filename order before using company or candidate flows. Configure these values in `.env.local` and in Vercel:

- `NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`
- `APP_BASE_URL`
- `GROQ_API_KEY`, with optional `GROQ_EVALUATOR_MODEL`, `GROQ_SPEAKER_MODEL`, `GROQ_PLANNER_MODEL`, and `GROQ_ASSESSMENT_MODEL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_DEMO_MODE=true` (optional local testing mode; disables company email authentication and must not be enabled in production)
- `DEMO_COMPANY_NAME` (optional label when using the process-local demo store)
- `SESSION_SIGNING_SECRET`
- `E2B_API_KEY`
- `AGORA_WEBHOOK_SECRET`
- `CRON_SECRET`

Secrets without the `NEXT_PUBLIC_` prefix must never reach the browser.

## Product flow

1. A company signs in at `/company`, creates an organization, pastes a JD and desired outcomes, and chooses two to five panel roles.
2. `POST /api/interviews/:id/plan` creates a Zod-validated editable rubric. Employer text is treated as untrusted input.
3. Publishing freezes an immutable version and returns a seven-day, single-use candidate URL.
4. The candidate sees the fixed AI/retention/human-review disclosure and must consent before the server creates the Agora session. The browser receives credentials immediately; agent startup continues while the candidate room connects.
5. The agent introduces the role, company, and panel. Demo mode combines introduction/background and prioritizes one answer per role. Product asks about missing customer impact or verifies an impact already claimed; Customer runs a spoken role-play. Pause, repeat, and brief readiness requests do not advance or score the interview. Candidate progress reports answered roles, not merely generated questions. The deadline starts after agent startup completes.
6. Agora calls the authenticated OpenAI-compatible endpoint. It ignores caller model and system instructions, stores transcript evidence, evaluates all roles, applies controller rules, and streams the chosen interviewer question.
7. Code/canvas drafts autosave; only explicit checkpoints are exposed to AI tools. E2B executes a server-selected JS/TS harness for at most 15 seconds with capped output and no app secrets.
8. Finalization creates an idempotent evidence-linked assessment. The company gets the report after completion; candidate feedback remains hidden until explicitly released.

## Main APIs

- `POST /api/interviews`, `POST /api/interviews/:id/plan`, `POST /api/interviews/:id/publish`
- `GET /api/invitations/:token`, `POST /api/invitations/:token/session`
- `POST /api/sessions/:id/start|renew|stop|finalize|release`
- `GET|PUT /api/sessions/:id/artifacts/:type`
- `POST /api/ai/chat/completions`
- `POST /api/mcp/:grant`
- `POST /api/webhooks/agora`

Company endpoints require a Supabase access token. Candidate session endpoints require the HttpOnly signed guest cookie. The LLM endpoint uses a random per-session bearer credential known only to Agora and the server.

For the new demo, apply `202609050001_coverage_demo.sql`, restart the app, then create and publish a new invitation. `POST /api/interviews` accepts optional `demoMode` (requires all five roles); the immutable version preserves it. Candidate session polling returns `session.demo` with role progress, closing state, and `pendingQuestion: {id, text}` plus the server deadline. `QUESTION_DELIVERED` events must match that server-owned question. Receipts, answer fragments, and response cache entries use the existing private session events table; no additional migration is needed. Company live responses still contain only status and health.

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

Groq assessment requests send a deduplicated packet of verified candidate quotes (up to 4,000 UTF-8 bytes), not the full transcript, rubric, analyses, and report repeated together. The complete system/schema/input has a 6,000-byte preflight limit and output is capped at 1,500 tokens. The model only adds short evidence-linked narratives; stored ratings, full evidence, unobserved competencies, and contradictions remain intact. Demo evaluation uses shorter context and a 1,536-token output cap. GPT-OSS requests use low reasoning effort. A 429 activates a per-key/model process-local cooldown honoring `Retry-After`; calls in that window use existing fallbacks immediately. This reduces request size and repeat failures but does not increase the provider's organization quota or coordinate separate server instances.

Optional live provider check: `node --import tsx scripts/verify-assessment-provider.ts`. This consumes one small Groq request using synthetic evidence and verifies the assessment response passes validation. It is not part of offline verification. Completed assessments are retained unchanged; new sessions use the compact generation path.

## Privacy and scope

No raw audio or video is recorded. Transcript, resume, events, artifacts, tool results, assessments, and claimed invitation metadata are purged 30 days after completion by `purge_expired_interview_data()`; `vercel.json` invokes it daily through an authenticated cron route. Live company views receive only session ID, status, health, and timestamps. Video identity/lip-sync analysis, avatars, candidate accounts, ATS integrations, multilingual support, and automatic employment decisions are intentionally outside this MVP.
