# Progress

Last updated: 2026-09-05

## Implemented

- Demo pacing regression fix: 1500 ms end-of-speech silence, grouped answer fragments, completed-question receipts, and one atomic accepted-answer reservation per question. Offline regression covers all five roles, interrupted/unheard questions, receipt authentication/matching, and concurrent duplicates. Live speech receipt/timing rehearsal remains pending.
- Source-aligned Agora RTC/RTM quickstart lifecycle retained, including StrictMode guards, hook-owned cleanup, combined RTC+RTM tokens, transcript UID remapping, and interrupted-turn rendering.
- Supabase schema for organizations, memberships, versioned interviews, invitations, sessions, transcript evidence, analyses, workspace history, tool runs, events, assessments, RLS, status-only Realtime, and 30-day cleanup.
- Supabase magic-link company sign-in surface, organization onboarding API, interview creation, plan generation/editing, immutable publishing, revocation API, and signed guest session flow.
- One managed Agora agent wired to an authenticated custom LLM route with a fixed AI disclosure and barge-in VAD configuration.
- Contextual company/role/panel greeting, introduction/background/panel/wrap-up phases, non-scoring pause/repeat/readiness controls, and direct Agora interruption events.
- Explicit demo mode: combined Hiring Manager opening → Technical → Product Manager → Customer → Behavioural, five answers then spoken closing and auto-finalization, with a five-minute maximum and answered-role progress. Product prompt adapts to customer-impact evidence; all-role evaluation remains active.
- Bounded Groq JSON completion budgets, purpose-specific model configuration, and concise 429 logging while preserving the evidence-only assessment fallback.
- Compact deduplicated assessment input with total input guard, narrative-only output validation, process-local shared provider cooldown, and a successful synthetic live Groq assessment check on 2026-09-05. The voice/network acceptance gates below are still separate.
- Candidate session bootstrap returns immediately while an authenticated, idempotent lifecycle route starts the managed agent in the background, removing the apparent double-click startup path.
- All-role structured evaluation, literal quote validation, deterministic turn controller, bounded difficulty, clarification/contradiction rules, role rotation, response caching, and the Technical-to-Product customer-impact handoff.
- Monaco code workspace and React Flow system-design canvas with optimistic versioning, autosaved drafts, explicit AI checkpoints, MCP tools, and E2B execution controls.
- Evidence-only structured assessment with mandatory human review and company-controlled candidate feedback release.
- Unit tests and API boundary checks; npm is the canonical package manager.

## Not yet live-verified

- Agora CLI credential binding and official start command in this workspace.
- Real agent join, RTC connection, spoken round trip, RTM transcript receipt, and renewal.
- Twenty timed interruption attempts and p95 audio-stop measurement.
- Live verification of the contextual greeting, one-click room entry, phase sequence, pause/repeat behavior, five-role demo timing, closing-audio completion, and automatic finalization.
- 300 ms RTT / 5% loss / 512 kbps impaired-network run.
- Deployed Supabase RLS pgTAP run, scheduled retention job, Agora webhook signature configuration, and live E2B sandbox run.

The application must not be described as end-to-end working until these gates are recorded with real credentials.
