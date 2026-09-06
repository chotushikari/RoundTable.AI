# FEATURE_STATUS — Phase 1 Audit (2026-09-06)

Classification per `docs/25` §4: REAL / PARTIAL / UI_ONLY / SCRIPTED / UNVERIFIED / MISSING.

| # | Requirement | Class | Evidence |
|---|---|---|---|
| 1 | Agora realtime voice | **PARTIAL** | Server token/invite/stop smoke passed and RTC/RTM lifecycle is implemented, but browser live join failed with `GET_LOCAL_CONNECTION_PARAMS_FAILED`; no live speech exchange was demonstrated |
| 2 | Interruption / barge-in | **UNVERIFIED** | Agora VAD (`interrupt_duration_ms: 160`) and `INTERRUPTED` logging exist, but the RTC failure prevented a live interruption test |
| 3 | Multiple roles | **PARTIAL** | 5 personas + arbitration + per-turn prompt injection all real (`personas.ts`, `orchestrator.ts`, `prompt.ts`) — but live rotation is dead: state stays v0 → `warmup_technical` every turn |
| 4 | Shared Candidate State | **PARTIAL** | Versioned immutable rows + idempotent events + real read path; **write path beyond v0 missing** |
| 5 | Dynamic follow-up | **PARTIAL** | Proxy grounds each turn in the actual transcript; objective static (`warmup_technical`) due to the state gap |
| 6 | Controlled turn-taking | **PARTIAL** | Agora `turnDetection` + one-question-per-turn guardrail in `GLOBAL_RULES`; live behavior unverified because RTC join failed |
| 7 | Scenario / roleplay | **UI_ONLY** | Customer persona is roleplay-styled in prompts; no scenario task system or modality surface |
| 8 | Continuous challenge adaptation | **MISSING** | `ChallengeVector` schema only — never written, never drives decisions |
| 9 | Vague-answer detection | **MISSING** | `VAGUENESS_DETECTED` event type defined; no detector (only soft persona instruction) |
| 10 | Contradiction handling | **MISSING** | `contradictions` table + event type; no logic writes them |
| 11 | Evidence-linked assessment | **MISSING** | `evidence`/`assessments` tables exist; no writer, no report route, no report UI |
| 12 | AI disclosure | **REAL** (⚠️ unlogged) | Checkbox gate blocks start until acknowledged (`QuickstartPreCallCard.tsx`); `AI_DISCLOSURE_SHOWN` never emitted |

## Team-reported flow vs reality
| Claimed surface | Reality |
|---|---|
| Company dashboard → generated candidate link | **MISSING** — no interview-creation flow; `invite_token`/`panel_config`/`job_title` columns unused; candidate self-starts at `/interview` |
| Technical interviewer → coding IDE | **PARTIAL** — task-driven Monaco + interviewer-reads-code are real; no execution, no `RUN_STARTED`/`TEST_RESULT` |
| Product manager / customer / behavioral manager stages | **PARTIAL** — personas exist as prompt policies; live rotation blocked by the state gap |
| Excalidraw/canvas | **MISSING** — no component anywhere (`design` modality is an enum value with no tasks and no UI) |
| End interview → final assessment | **MISSING** — schema only |

## Working infrastructure (KEEP list)
Agora token routes, invite-agent scaffold, proxy control plane (R2, inactive locally until `NEXT_PUBLIC_APP_URL` is set), event backbone (R1), personas, prompt assembly, recruiter Control Room, brand system, Monaco workspace shell, graceful DB degradation.
