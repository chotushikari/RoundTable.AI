# Applicant / Candidate Interface (v1)

> Audience: the candidate being interviewed. Principle: **one coherent interview room, voice-first, minimal cognitive overhead.** They should feel they're talking to one intelligent panel whose interviewer changes only when there's a reason — never "operating a multi-agent dashboard."

## Flow overview
```
invite link → welcome + AI disclosure → device/mic check → interview room
   → (Canvas opens when needed: code / scenario / role-play)
   → completion / processing → optional feedback summary
```

## Routes
```
/interview/[token]            welcome + AI disclosure
/interview/[token]/check      mic + connection check
/interview/[token]/room       the live interview (voice + Canvas)
/interview/[token]/complete   thank-you / processing
/interview/[token]/feedback   candidate-facing feedback (when released)
```

## Screen 1 — Welcome + AI Disclosure (`/interview/[token]`)
- Warm, branded, low-anxiety. Role/company name.
- **Mandatory AI disclosure (explicit, before anything records):**
  > "You are interviewing with RoundTable, an AI interview panel. Your responses may be analyzed to adapt the interview and generate structured feedback. This session is recorded."
- What to expect: ~20–30 min, voice is primary, some questions may involve coding or scenarios, you can ask to repeat/clarify, and you can say "I don't know."
- Consent checkbox → **Start**. Logs `AI_DISCLOSURE_SHOWN`.

## Screen 2 — Device Check (`/check`)
- Mic selector (component already exists), input-level meter, connection test.
- Headphone recommendation (echo). Permission prompts handled gracefully.

## Screen 3 — INTERVIEW ROOM (`/room`) — the core
Voice-first. Default (voice) layout:
```
┌───────────────────────────────────────────────────────────────┐
│  ● AI Interview • Recording          20:00 remaining          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                   ┌─────────────────┐                         │
│                   │   ● Alex        │   ← ONE active           │
│                   │   Technical     │     interviewer          │
│                   │   (orb pulsing) │                          │
│                   └─────────────────┘                         │
│                                                               │
│   "Walk me through how you'd design an LRU cache."            │
│                                                               │
│   LIVE TRANSCRIPT (quiet, scrollable)                         │
│   You: ...                                                    │
│   Alex: ...                                                   │
├───────────────────────────────────────────────────────────────┤
│        🎙 (mic)      [Repeat]   [End interview]               │
└───────────────────────────────────────────────────────────────┘
```
- **Active interviewer** = one identity + orb visualizer (reacts to agent speech). Reuses `AgentVisualizer`.
- **Role transitions are conversational**, shown as a gentle banner: "Alex established the technical side. Priya (Product) would like to explore the customer impact." No jarring "switching agent."
- **Quiet panel rail** (optional, collapsed): shows the panel exists (Alex/Priya/Sam/Maya/…) as dim status dots — tells the candidate it's a panel without five talking heads.
- **Interruption is first-class:** candidate can cut in; Agora VAD stops the agent (barge-in). Transcript stays consistent.
- Controls: mic mute, **Repeat/clarify**, End. Accessible keyboard shortcuts.

### Canvas mode (opens inside the same room)
When the interviewer moves to a demonstration, the room splits and a **Canvas** slides in on the right — the candidate never navigates away:
```
┌────────────────────────┬──────────────────────────────────────┐
│  ● Alex (Technical)     │  CANVAS — Code                        │
│  "Let's make it         │  Problem: Implement LRUCache (O(1))   │
│   concrete — implement  │  ┌────────────────────────────────┐  │
│   get() and put()."     │  │ Monaco editor                  │  │
│                         │  │ class LRUCache { ... }         │  │
│  LIVE TRANSCRIPT        │  └────────────────────────────────┘  │
│  You: ...               │  Language ▾   [Run] [Submit]          │
│                         │  TESTS: ✓ 8 / 10   ✕ capacity=1       │
└────────────────────────┴──────────────────────────────────────┘
```
Canvas variants (same surface, swapped by modality):
- **Code** — Monaco + language picker + Run/Submit; real test results (Judge0). Voice continues; interviewer reacts to results, never reads code aloud.
- **Scenario / role-play** — a brief or artifact (e.g. a metric chart, a PR, a ticket via MCP). Candidate responds by voice.
- **Design** — a lightweight text/diagram pad.
- Voice stays the primary channel throughout; the interviewer says "take your time, I'll wait" while the candidate works.

## Screen 4 — Completion (`/complete`)
- "Thanks — your interview is complete." Explains the assessment is being generated.
- No scores shown here.

## Screen 5 — Candidate Feedback (`/feedback`, when company releases it)
- Specific, transcript-linked, actionable, role-aware — never "communicate better."
- Example: "Your LRU architecture was strong (03:12). The customer-impact of the change wasn't quantified until the Product follow-up (06:12), where you identified checkout conversion. Practice tying technical choices to a measurable customer outcome."
- Strengths + growth areas; encouraging tone.

## Candidate-side design principles
- **Calm > dense.** No dashboards, no live scores, no confidence bars (those are recruiter-only).
- **Low latency perceived** — Agora chorus profile; UI never blocks on backend analysis.
- **Trust & clarity** — persistent "AI • Recording" indicator; disclosure up front.
- **Accessible** — captions via live transcript, keyboard operable, ARIA live region for the current question, respects reduced-motion for the orb.
- **Stack:** same as company side (Next.js, Tailwind, shadcn/ui, lucide-react, Monaco) — all free/open-source.
