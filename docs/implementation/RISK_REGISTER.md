# RISK_REGISTER — Phase 1 Audit (2026-09-06)

| # | Risk | Sev | Detail | Mitigation |
|---|---|---|---|---|
| 1 | Adaptive loop inert live | 🔴 P0 | No state writer past v0 → `warmup_technical` forever; the product story doesn't manifest in real sessions | Build R3 (evidence extraction → `saveNewStateVersion`) |
| 2 | Unauthenticated proxy | 🟠 P1 | `/api/chat/completions` never checks `NEXT_LLM_PROXY_KEY` — any caller gets persona prompts + can burn Gemini quota | Verify the `Authorization: Bearer` header Agora presents matches the key |
| 3 | Unauthenticated recruiter APIs | 🟠 P1 | Service-role reads with no auth — interview lists/transcripts publicly readable when deployed | Add a shared recruiter token or defer behind demo auth |
| 4 | Workspace-open latency coupling | 🟠 P1 | `codeTask` reaches the client only as a piggyback on the *next* logged event — a quiet candidate delays the workspace | Consider a lightweight poll or RTM push for workspace commands |
| 5 | Dead orchestrator module | 🟡 P2 | `lib/orchestrator.ts` levels model still type-imported — divergence confusion | Delete module; import types from `lib/interview/types` |
| 6 | Disclosure not event-logged | 🟡 P2 | `AI_DISCLOSURE_SHOWN` never emitted — compliance unprovable in replay | Emit from `QuickstartPreCallCard` start handler |
| 7 | Model pin drift | 🟡 P2 | Code pins `gemini-2.0-flash`; earlier sprints referenced newer models | Confirm intended model + update `MODEL_ID` |
| 8 | Voice-path DB reads per turn | 🟡 P2 | Proxy does 2 Supabase reads/turn before streaming | Acceptable; instrument latency per docs/17 during R9 |
| 9 | Browser RTC join failure | 🟠 P1 | Candidate start flow reached the room and invited the agent, but browser RTC join failed with `GET_LOCAL_CONNECTION_PARAMS_FAILED: Error: Invalid space at 12`; transcript/audio/interruption remain unverified | Debug Agora RTC join parameters/browser SDK behavior before claiming live voice complete |
| 10 | Stale `index.lock` incident | 🟡 P2 | A crashed git process left `.git/index.lock` (2026-09-05 19:44); removed safely 2026-09-06 | None — resolved; noted for provenance |
