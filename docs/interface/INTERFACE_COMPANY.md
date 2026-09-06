# Company / Recruiter Interface (v1)

> Audience: hiring companies, recruiters, and hackathon judges. This surface is where RoundTable's **intelligence becomes visible**. Candidate calm ≠ recruiter depth — this side shows evidence, reasoning, and control.

## Personas
- **Recruiter / Hiring Manager** — sets up roles, reviews assessments, makes decisions.
- **Judge** (hackathon) — needs to answer "why did the AI do that?" in <5 seconds.

## Information architecture (routes)
```
/company
  /dashboard              list of interviews (draft / live / completed)
  /jobs/new               create a job + configure panel
  /jobs/[id]              job detail, invite links, candidate list
  /interviews/[id]/live   CONTROL ROOM (live intelligence)
  /interviews/[id]/report ASSESSMENT REPORT (evidence-backed)
  /interviews/[id]/replay DECISION REPLAY (timeline)
  /settings               org, rubric templates, connectors (MCP)
```

## Screen 1 — Job & Panel Setup (`/jobs/new`)
The company defines *what evidence matters*, not a question list.
- **Job basics:** title, seniority, JD (paste or upload), optional company context.
- **Resume intake:** upload candidate resume(s) (PDF) → parsed into candidate context.
- **Panel composition:** toggle the 5 roles (Technical, Product, Customer, Hiring Manager, Behavioural). Each shows its owned competencies.
- **Rubric / competency weights:** sliders for how much each competency matters for *this* role. Feeds the orchestrator's `role_relevance`.
- **Interview budget:** min duration, hard max, "depth vs breadth" preference.
- **Optional seed questions:** must-ask items (the system still adapts around them).
- **AI disclosure preview:** shows exactly what the candidate will be told.
- Output: a shareable **invite link** + optional email.

## Screen 2 — Dashboard (`/company/dashboard`)
- Table: candidate, role, status (Draft/Invited/Live/Processing/Complete), recommendation chip, date.
- Live interviews show a pulsing "LIVE" badge → click into Control Room.
- Filters by job, status, recommendation.

## Screen 3 — CONTROL ROOM (`/interviews/[id]/live`) — the flagship
Real-time window into the shared brain. Layout (desktop):
```
┌───────────────────────────────────────────────────────────────┐
│ CURRENT ROLE: PRODUCT          ● LIVE  12:04 elapsed           │
│ WHY: technical correctness established; customer impact unproven│
├──────────────────────────────┬────────────────────────────────┤
│ CANDIDATE STATE              │ LIVE TRANSCRIPT                 │
│ Technical    ████████░ .84 H │ Candidate: I'd cache the catalog│
│ System Des.  ███████░░ .73 H │ Alex(T): Why the catalog?       │
│ Product      ████░░░░░ .44 M │ ...                             │
│ Customer     ███░░░░░░ .31 L │                                 │
│ Communication█████████ .89 H │ (H/M/L = confidence)            │
├──────────────────────────────┼────────────────────────────────┤
│ SIGNALS                      │ WHY THIS QUESTION? (card)       │
│ ⚠ vague claim: "big improve" │ role: Product                   │
│ ⚠ missing metric baseline    │ objective: measurable outcome   │
│ ⚠ possible contradiction #2  │ competency: customer_orientation│
│                              │ evidence_refs: tr_32, tr_41     │
│ CHALLENGE VECTOR (radar)     │ reason_code: CUSTOMER_IMPACT_GAP│
└──────────────────────────────┴────────────────────────────────┘
                     Agora pipeline metrics: STT 210ms · LLM 380ms · TTS 240ms
```
- **Belief bars + confidence letter (H/M/L)** — the core differentiator; shows "weak evidence" vs "proven weak."
- **"Why this question?" card** updates every turn from the `NEXT_ACTION_SELECTED` event.
- **Signals** stream: vagueness, contradictions, missing metric/mechanism/tradeoff.
- **Live Agora metrics** (per-stage latency) prove real-time voice.
- Never expose hidden chain-of-thought — only the concise reason code + refs.

## Screen 4 — ASSESSMENT REPORT (`/interviews/[id]/report`)
Recruiter-grade, evidence-first.
- **Recommendation chip:** Strong Hire / Hire / Lean Hire / Lean No / No Hire — always beside a confidence label.
- **Competency profile:** each competency → belief score + confidence + top evidence snippets (timestamped, clickable to transcript/code/tool).
- **Strengths / Concerns / Unresolved** (unresolved = insufficient evidence, explicitly distinguished from weakness — fairness rule).
- **Code evidence:** task, tests passed/failed, complexity, failing edge cases.
- **Scenario/role-play evidence:** decisions made.
- **Export:** PDF for sharing.

## Screen 5 — DECISION REPLAY (`/interviews/[id]/replay`)
- Horizontal timeline of every action with role color-coding.
- Click any node → trigger, evidence, action taken, outcome (e.g. "Customer impact 31 → 62").
- The single best artifact for judges: proves adaptation was reasoned, not scripted.

## Design system (shared with candidate side)
- **Stack:** Next.js + Tailwind + **shadcn/ui** (Radix, already partially present) for accessible primitives; **lucide-react** icons (installed); **Recharts** for radar/bars (free, MIT).
- **Aesthetic:** calm, professional "control room" — dark-friendly, high-contrast text, restrained color; role colors are semantic (Technical=blue, Product=violet, Customer=amber, Manager=teal, Behavioural=rose).
- **Accessibility:** WCAG-minded — keyboard nav, ARIA live regions for transcript/signals, no color-only meaning (pair with H/M/L text).
- All libraries are free/open-source.
