# PS11_GAP_MATRIX — Phase 1 Audit (2026-09-06)

| PS-11 pillar | Target (docs/25) | Current | Gap |
|---|---|---|---|
| Agora-centric voice | Mandatory, central | Real and central — proxy is the control plane | 🟢 low |
| One coherent interview, shifting perspectives | Signature behavior | Mechanism built, **inert live** (state never advances past v0) | 🔴 **P0** |
| Evidence → State → Action loop | The product | Read path only; R3 extraction + R4 gap orchestrator missing | 🔴 **P0** |
| Belief + confidence model | Required | Schema + BeliefBar UI real; never updated after v0 | 🔴 P0 |
| Challenge vector (no levels) | Required | Type exists; dead | 🟠 P1 |
| Vagueness detection | Required | Event name reserved only | 🟠 P1 |
| Contradiction handling | Required | Table + event name only | 🟠 P1 |
| Code modality w/ real execution (Judge0) | Blueprint-locked | Monaco + task library + interviewer-reads-code; **no executor** | 🟠 P1 |
| Canvas / design modality | Required | `design` enum value; no tasks, no Excalidraw | 🟠 P1 |
| Scenario modality | Required | Persona-level only | 🟠 P1 |
| Assessment + evidence-linked report | Judge payoff | Tables only | 🔴 P0 for demo |
| Judge / control room | Required | Recruiter dashboard + Control Room live on persisted events | 🟢 built early |
| AI disclosure | Before recording/analysis | Real gate; `AI_DISCLOSURE_SHOWN` not persisted | 🟡 P2 |
| Security | Secrets server-side, auth | Two holes (see RISK_REGISTER #3, #4) | 🟠 P1 |
| MCP context | Secondary | None | 🟡 P2 |
| Interview budget / time | Required field | `time_budget_remaining` always null | 🟡 P2 |

## Recommended build order (matches SPRINT_PLAN_V2 R3→R9)
1. **R3** — transcript → Gemini evidence extraction → `saveNewStateVersion()` (unlocks requirements 3, 4, 5, 8 live — the entire adaptive story)
2. **R4** — evidence-gap scoring + vagueness/contradiction fast-path (already partially testable via `verify-sprint06`)
3. **R5** — real Judge0 executor + `TEST_RESULT` evidence
4. **R8** — assessment report + control-room polish
5. P1 security fixes can ride along any sprint (proxy key check, recruiter auth)
