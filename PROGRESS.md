# Progress Log

## Sprints
*   [x] **Sprint 00:** Audit & Baseline
*   [x] **Sprint 01:** Agora Vertical Slice (Next.js baseline, structured event logging)
*   [x] **Sprint 02:** Candidate State & Orchestrator
*   [x] **Sprint 03:** Technical AI Policies
*   [x] **Sprint 04:** Product & Hiring Manager Profiles
*   [ ] **Sprint 05:** Code Workspace
*   [ ] **Sprint 06:** Control Room UX

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
