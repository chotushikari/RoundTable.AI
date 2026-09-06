# Progress Log

## Sprints
*   [x] **Sprint 00:** Audit & Baseline
*   [x] **Sprint 01:** Agora Vertical Slice (Next.js baseline, structured event logging)
*   [x] **Sprint 02:** Candidate State & Orchestrator
*   [x] **Sprint 03:** Technical AI Policies
*   [x] **Sprint 04:** Product & Hiring Manager Profiles
*   [x] **Sprint 05:** Code Workspace
*   [x] **Sprint 06:** Control Room UX

## Sprint 00: Audit & Baseline
- Initialized git repository.
- Connected remote origin (`https://github.com/chotushikari/RoundTable.AI`).
- Set up `.gitignore` to prevent pushing `docs/` and `Sprints/`.
- Executed repository audit (found completely empty).
- Created baseline architecture and gap matrix documentation (`CURRENT_STATE.md`, `PS11_GAP_MATRIX.md`, `RISKS.md`, `ARCHITECTURE_DECISIONS.md`).

## Sprint 01: Agora Vertical Slice
- Adopted `agent-quickstart-nextjs` as the baseline foundation.
- Configured `.env.local` with Agora credentials.
- Injected `SESSION_STARTED`, `AGENT_STATE_CHANGED`, `TRANSCRIPT_FINAL`, `INTERRUPTED`, `METRICS`, and `ERROR` events into `ConversationComponent`.
- Routed events to a new `/api/logger` endpoint to build the skeleton for our "Two-Speed Intelligence" async architecture.

## Sprint 02: Candidate State & Orchestrator
- Created `lib/orchestrator.ts` to manage in-memory Candidate State vectors (`technical`, `product`, `communication`).
- Updated `ConversationComponent` to include the `restAgentId` in the telemetry.
- Updated `/api/logger` to pass transcripts into the Orchestrator for deep analysis.
- Implemented logic where the Orchestrator evaluates the state, emits a `NextInterviewAction`, and uses the Server SDK to securely `POST /update` the agent's system instructions mid-call without reconnecting.

## Sprint 03: Technical AI Policies (Real LLM)
- Replaced the mock LLM with a live connection to `gemini-3.8-flash` via the Google Generative Language REST API.
- Engineered a strict `SYSTEM_PROMPT` to analyze candidate transcripts and extract nuanced JSON state updates (deltas).
- Successfully verified that technical jargon triggers corresponding `technical` and `systemDesign` candidate state increments!

## Sprint 04: Product & Hiring Manager Profiles
- Expanded the `SYSTEM_PROMPT` to score `product` (business impact, user empathy) and `manager` (communication, conflict resolution) metrics simultaneously.
- Tracked the `activeRole` in the React frontend and dynamically updated the backend on each API route invocation.
- Implemented logic where the Orchestrator engine analyzes the `activeRole` and score thresholds to automatically transition the agent into the next persona.

## Sprint 05: Code Workspace (Multimodal UX)
- Built the `CodeWorkspace` React component using `@monaco-editor/react` for a premium, syntax-highlighted IDE aesthetic.
- Updated `ConversationComponent` to track `activeModality` (e.g., `'voice'` or `'code'`).
- Redesigned `QuickstartConversationLayout` to dynamically shift into a split-screen layout when the agent transitions into code mode, keeping the voice connection alive while providing a coding environment.

## Sprint 06 / R2: Control Room UX + Proxy Control Plane (2026-09-06)
- **Custom-LLM proxy control plane (R2 keystone):** Agora's agent now points at `/api/chat/completions` as its LLM. Every turn, the proxy loads the shared CandidateState from Supabase, runs the orchestrator, and injects the active persona + state digest + objective + guardrails into the system prompt — one continuous session, zero reconnects on role change. Persists `NEXT_ACTION_SELECTED` with `reason_code` per turn.
- **Specialist personas as config (5 roles):** Maya (Technical), Devin (Product), Priya (Customer roleplay), Sam (Hiring Manager), Jordan (Behavioural) — one shared brain, shifting lenses (`lib/interview/personas.ts`).
- **Deterministic R2 orchestrator baseline:** least-confidence competency routing, technical→product hand-off, coding/debugging gaps open the code workspace (`lib/interview/orchestrator.ts`).
- **Code-task library + workspace routing:** deterministic task selection (`lib/interview/problems.ts`); `/api/logger` pushes `codeTask` + `newModality` to the client (deduped via `CODE_TASK_OPENED`); proxy embeds the candidate's shared code into the next turn's prompt.
- **Brand system + marketing landing:** Wordmark, RoleBadge, FiveFacesOrb, BeliefBar; candidate flow rerouted to `/interview` with an AI-disclosure gate.
- **Recruiter Control Room:** `/recruiter` dashboard + `/recruiter/[id]` live view (competency belief bars, decision timeline, transcript) polled from Supabase; read-only recruiter APIs that degrade gracefully without DB.
- **Verification:** `verify-sprint06.ts` (11/11), `verify-api-contracts.ts`, `tsc --noEmit`, `next build` — all green.
- **Phase 1 expert audit completed** (see `docs/implementation/` reports); P0 gap identified: no state writer past v0 (R3 evidence extraction is next).
