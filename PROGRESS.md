# Progress

Last updated: 2026-09-04

## Implemented

- Source-aligned Agora RTC/RTM quickstart lifecycle retained, including StrictMode guards, hook-owned cleanup, combined RTC+RTM tokens, transcript UID remapping, and interrupted-turn rendering.
- Supabase schema for organizations, memberships, versioned interviews, invitations, sessions, transcript evidence, analyses, workspace history, tool runs, events, assessments, RLS, status-only Realtime, and 30-day cleanup.
- Supabase magic-link company sign-in surface, organization onboarding API, interview creation, plan generation/editing, immutable publishing, revocation API, and signed guest session flow.
- One managed Agora agent wired to an authenticated custom LLM route with a fixed AI disclosure and barge-in VAD configuration.
- All-role structured evaluation, literal quote validation, deterministic turn controller, bounded difficulty, clarification/contradiction rules, role rotation, response caching, and the Technical-to-Product customer-impact handoff.
- Monaco code workspace and React Flow system-design canvas with optimistic versioning, autosaved drafts, explicit AI checkpoints, MCP tools, and E2B execution controls.
- Evidence-only structured assessment with mandatory human review and company-controlled candidate feedback release.
- Unit tests and API boundary checks; npm is the canonical package manager.

## Not yet live-verified

- Agora CLI credential binding and official start command in this workspace.
- Real agent join, RTC connection, spoken round trip, RTM transcript receipt, and renewal.
- Twenty timed interruption attempts and p95 audio-stop measurement.
- 300 ms RTT / 5% loss / 512 kbps impaired-network run.
- Deployed Supabase RLS pgTAP run, scheduled retention job, Agora webhook signature configuration, and live E2B sandbox run.

The application must not be described as end-to-end working until these gates are recorded with real credentials.
