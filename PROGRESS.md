# Progress

- Linear MCP is integrated as an optional voice action: a published interview freezes one issue identifier, candidates can load it, hear an exact generated comment preview, and must explicitly confirm before posting. Tool outcomes appear in the completed company report and never affect assessment ratings.

- Final assessment now associates accepted answers with the panel member whose question preceded them, excludes workspace/navigation controls, and connects completed code/canvas work to conservative immutable evidence. Existing reports upgrade to the current evidence rules when opened.

Last updated: 2026-09-06

## Implemented

- Completed-report hardening: all five demo perspectives can resolve to their actual spoken answer or completed workspace, generic and duplicate headline strengths were removed, structural workspace inspection uses bounded confidence, and candidate report names are collected before invitation claim. The five-role regression is part of the 48-test offline suite.

- Server-only Linear Streamable HTTP MCP client with advertised tool discovery, bounded issue projection, candidate-confirmed comment writes, cached voice responses, audit tool runs, optional dashboard configuration, and completed-report status/link.

- New dashboard demos target zero-experience interns, allow ten minutes, and schedule code with Technical plus canvas with Product before Customer and Behavioural. Python/JavaScript/TypeScript selection persists in checkpoints; E2B adds a fixed Python function-loading harness. Voice review and answer-time acknowledgements describe saved checkpoints; detailed model review remains dependent on provider availability. New live language, sandbox, and spoken-review rehearsal is pending.

- Workspace pacing fix: checkpoint reviews no longer call the speaker model or spend the tool-run quota; they respond immediately from saved artifacts. “Now see it” is recognized, and “please continue”/“next question” advances a demo workspace turn instead of repeating the prompt. Partial Groq role findings are normalized with explicit missing-role evidence gaps rather than producing a noisy schema fallback.

- Voice/workspace reliability fix: empty startup LLM probes return a valid no-op SSE response, preventing a misleading Agora 401 provider error. Workspace review reads the latest autosaved code/canvas without a click. E2B now runs functional exercise packs for `reverseString` and even-number tasks, and the canvas has visible high-contrast nodes, handles, starter components, and click-to-add labels. Live voice, E2B, and canvas acceptance still need rehearsal.

- User confirmed the voice demo works. Added automatic code/canvas selection for relevant questions, animated focused workspace with compact voice panels, editable canvas components, persistent drafts, checkpoint-only evaluator input, and voice-triggered workspace tools. New workspace animation/audio/E2B live acceptance is still pending.

- Demo pacing regression fix: 1500 ms end-of-speech silence, grouped answer fragments, completed-question receipts, and one atomic accepted-answer reservation per question. Offline regression covers all five roles, interrupted/unheard questions, receipt authentication/matching, and concurrent duplicates. Live speech receipt/timing rehearsal remains pending.
- Source-aligned Agora RTC/RTM quickstart lifecycle retained, including StrictMode guards, hook-owned cleanup, combined RTC+RTM tokens, transcript UID remapping, and interrupted-turn rendering.
- Supabase schema for organizations, memberships, versioned interviews, invitations, sessions, transcript evidence, analyses, workspace history, tool runs, events, assessments, RLS, status-only Realtime, and 30-day cleanup.
- Supabase magic-link company sign-in surface, organization onboarding API, interview creation, plan generation/editing, immutable publishing, revocation API, and signed guest session flow.
- One managed Agora agent wired to an authenticated custom LLM route with a fixed AI disclosure and barge-in VAD configuration.
- Contextual company/role/panel greeting, introduction/background/panel/wrap-up phases, non-scoring pause/repeat/readiness controls, and direct Agora interruption events.
- Explicit demo mode: combined Hiring Manager opening → Technical → Product Manager → Customer → Behavioural, five answers then spoken closing and auto-finalization, with a ten-minute maximum and answered-role progress. Product prompt adapts to customer-impact evidence; all-role evaluation remains active.
- Bounded Groq JSON completion budgets, purpose-specific model configuration, and concise 429 logging while preserving the evidence-only assessment fallback.
- Compact deduplicated assessment input with total input guard, narrative-only output validation, process-local shared provider cooldown, and a successful synthetic live Groq assessment check on 2026-09-05. The voice/network acceptance gates below are still separate.
- Candidate session bootstrap returns immediately while an authenticated, idempotent lifecycle route starts the managed agent in the background, removing the apparent double-click startup path.
- All-role structured evaluation, literal quote validation, deterministic turn controller, bounded difficulty, clarification/contradiction rules, role rotation, response caching, and the Technical-to-Product customer-impact handoff.
- Monaco code workspace and one Excalidraw system-design canvas with optimistic versioning, autosaved drafts, explicit AI checkpoints, MCP tools, and server-scoped E2B execution controls.
- Evidence-only structured assessment with mandatory human review and company-controlled candidate feedback release.
- Unit tests and API boundary checks; npm is the canonical package manager.
- Full offline release verification passed on 2026-09-06: doctor, 48 tests, lint, TypeScript, API contracts, and the Next.js production build.

## Not yet live-verified

- Agora CLI credential binding and official start command in this workspace.
- Real agent join, RTC connection, spoken round trip, RTM transcript receipt, and renewal.
- Twenty timed interruption attempts and p95 audio-stop measurement.
- Live verification of the contextual greeting, one-click room entry, phase sequence, pause/repeat behavior, five-role demo timing, closing-audio completion, and automatic finalization.
- 300 ms RTT / 5% loss / 512 kbps impaired-network run.
- Deployed Supabase RLS pgTAP run, scheduled retention job, Agora webhook signature configuration, and live E2B sandbox run.

The application must not be described as end-to-end working until these gates are recorded with real credentials.
