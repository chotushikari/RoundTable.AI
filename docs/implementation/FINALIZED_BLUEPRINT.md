# RoundTable.AI — FINALIZED ENGINEERING BLUEPRINT (v1.0)

> Status: **Architecture-frozen, pre-implementation.** This document supersedes ambiguous points in `ARCHITECTURE_DECISIONS.md` and reconciles the code with `docs/02–17`. Read this before any sprint.

---

## 0. TL;DR verdict — are we doing "same or better"?

**The vision (docs) is already better than the mentor's 55-point note. The code had quietly regressed *below* both.**

- ✅ Your `docs/` correctly encode continuous adaptation, belief+confidence pairs, evidence graph, two-speed intelligence, evidence-linked assessment. This is *equal to or better than* the mentor writeup.
- ❌ Your `lib/orchestrator.ts` does the **exact thing the docs forbid**: linear, threshold-gated **levels** — `if technical>0.6 → product → manager → code`. One float per skill. No evidence graph. No confidence dimension. No persistence. The "two-speed" async split **does not exist** (everything runs synchronously inside the `/api/logger` POST).

So the task is **not** to invent new vision. It is to (a) make the code obey the docs, and (b) add the *one* structural idea that is stronger than anything in the mentor note: **the custom-LLM proxy as the interview control plane.**

---

## 1. The single most important architectural correction

**Decision (locked): One continuous Agora session whose LLM is OUR OWN `/api/chat/completions` proxy.**

You already scaffolded this route. This is the keystone. Here is why it beats both alternatives the docs waffle between (`session.update()` vs handoff):

```
                 ┌────────────────────────────────────────────┐
                 │              AGORA CONV-AI ENGINE           │
                 │   Deepgram STT → [OUR LLM] → MiniMax TTS    │
                 │   VAD / interruption / turn-taking (native) │
                 └───────────────┬──────────────┬─────────────┘
                                 │ every turn   │ RTM events
                                 ▼              ▼
                 ┌──────────────────────────────────────────┐
                 │   /api/chat/completions  (CONTROL PLANE)  │
                 │                                            │
                 │  On EVERY agent turn we assemble the       │
                 │  prompt from ONE shared brain:             │
                 │   • global candidate context               │
                 │   • active role persona + policy           │
                 │   • scoped evidence for the objective      │
                 │   • current NextInterviewAction            │
                 │   • anti-repetition + guardrails           │
                 └──────────────────────────────────────────┘
```

**Why this is the right answer to "I want all agents to share the candidate session":**
- There are not five agents. There is **one agent, one shared `CandidateState`, five role-personas** selected per turn. Shared context is *structural*, not bolted on.
- **Deterministic + observable:** every turn passes through our code, so we can log the reason for each question, inject evidence, and enforce "one question per turn / no solutions in code mode" *before* TTS speaks.
- **No race conditions:** `session.update()` can land mid-utterance; handoff drops the conversation. The proxy changes persona *between* turns, atomically, with zero reconnection.
- Agora still owns everything it's best at: real-time transport, VAD, barge-in/interruption, turn detection.

> Keep `session.update()` in the toolbox only for rare out-of-band nudges (e.g. force an interrupt). It is **not** the role-switching mechanism.

---

## 2. Corrected mental model — continuous, not levels

Replace the `CandidateState` in `lib/orchestrator.ts` entirely.

**Wrong (current code):**
```ts
{ technical: number, product: number, ... }   // single float, thresholds, linear
```

**Right (belief + confidence per competency):**
```ts
type Competency =
  | 'technical_reasoning' | 'system_design' | 'coding_implementation'
  | 'debugging' | 'product_thinking' | 'customer_orientation'
  | 'communication' | 'ownership' | 'behavioral';

interface CompetencySignal {
  belief: number;      // 0..1  how strong we think they are
  confidence: number;  // 0..1  how much evidence we have to justify that belief
}
```

The distinction is the whole product: `belief 0.7 / confidence 0.3` ("might be strong, untested") is completely different from `belief 0.7 / confidence 0.9` ("proven strong"). **The orchestrator hunts the competency with the highest `role_relevance × (uncertainty)` where `uncertainty = 1 − confidence`.** That is what replaces thresholds.

**Difficulty is a vector, never one number:**
```ts
interface ChallengeVector {
  technical_depth: number; ambiguity: number; scale: number;
  edge_case_complexity: number; business_complexity: number;
  time_pressure: number; cross_functional: number;
}
```

---

## 3. The adaptive loop (the heart)

```
CANDIDATE SPEAKS (or codes)
        │
   ┌────▼──────────── FAST PATH (< conversational latency) ─────────────┐
   │ 1. transcript arrives via RTM                                       │
   │ 2. cheap turn classifier: intent, claims, is-vague?, is-contra?     │
   │ 3. orchestrator picks NextInterviewAction (deterministic scoring)   │
   │ 4. /api/chat/completions renders ONE question for that action       │
   │ 5. Agora TTS speaks                                                  │
   └────┬───────────────────────────────────────────────────────────────┘
        │  (fire-and-forget)
   ┌────▼──────────── DEEP PATH (async, off critical path) ─────────────┐
   │ • full claim/mechanism/tradeoff extraction                          │
   │ • evidence records written to DB, linked to transcript segment      │
   │ • belief+confidence update with justification                       │
   │ • contradiction graph update                                        │
   │ • code/test results ingested as evidence                            │
   └─────────────────────────────────────────────────────────────────────┘
```

**Never block TTS on deep analysis.** The fast path uses a small/cheap model (or heuristics) to keep sub-second perceived latency; the deep path uses a stronger model and writes durable evidence.

---

## 4. Orchestrator — evidence-gap driven (kills the "levels" bug)

`NextInterviewAction` (typed with Zod, validated before use):
```ts
interface NextInterviewAction {
  role: 'technical'|'product'|'customer'|'manager'|'behavioral';
  modality: 'voice'|'clarify'|'challenge'|'scenario'|'roleplay'|'code'|'debug'|'design'|'evidence_probe'|'closing';
  objective: string;             // "obtain a measurable customer outcome"
  competency: Competency;
  question_type: 'probe'|'challenge'|'evidence'|'scenario'|'verification';
  challenge_vector: ChallengeVector;
  reason_code: string;           // machine label, judge-facing
  evidence_refs: string[];       // transcript/code/tool ids that motivated this
}
```

**Selection = deterministic score, LLM only writes the sentence:**
```
score(action) =  info_value            // uncertainty it would reduce
              +  gap_coverage           // open_gaps it addresses
              +  role_relevance
              +  challenge_fit          // matches candidate's current level
              +  scenario_relevance
              −  repetition_penalty
              −  already_sufficient
              −  time_cost
```
Role arbitration rules (from `docs/09`, enforce them): one active speaker, **cooldown after a handoff** (don't ping-pong roles every turn), never switch without an evidence reason, the role owning the strongest unresolved objective wins.

This is what makes the PS-11 example scenario emerge naturally: Technical accepts a correct implementation → its objective is satisfied, confidence high → the highest remaining uncertainty is `customer_orientation` → Product role wins → challenges business impact. **No hard-coded ladder.**

---

## 5. Data & persistence (forced by "real + shared + serverless")

Serverless in-memory state dies between invocations, so shared context **requires a real store**.

**Decision (recommended, vetoable): Supabase Postgres** — one managed dep, native to Next.js, no extra deploy.

Tables (minimum):
- `interviews` (config, JD, resume, status, budgets)
- `interview_events` (append-only; envelope from `docs/14`: `event_id, interview_id, sequence, event_type, source, occurred_at, payload`)
- `candidate_state` (versioned; competency signals, challenge vector, open_gaps, phase, active_role)
- `evidence` (id, competency, evidence_type, claim, observation, confidence, `transcript_segment_id|code_event_id|tool_event_id`)
- `contradictions` (claim_a, claim_b, refs, status)
- `assessments` (final competency profile + confidence + recommendation)

Idempotency: dedupe events by `event_id`; never write duplicate evidence for a replayed event.

---

## 6. Multimodal / Code workspace — real Judge0

- **Editor:** Monaco (already installed). Current `CodeWorkspace.tsx` is a static stub — must become task-driven and event-emitting.
- **Execution:** **real Judge0** behind `interface CodeExecutor { run(submission): Promise<ExecResult> }`. Managed Judge0 (RapidAPI) for speed; the interface lets us swap to self-hosted or a deterministic mock **only** if the network fails mid-demo. Never run candidate code in the Next.js process.
- **Code events become evidence, not narration:** `CODE_TASK_OPENED, CODE_CHANGED, RUN_STARTED, TEST_RESULT, SUBMISSION`. The interviewer receives `{tests_passed, tests_failed, complexity, failing_edge_cases}` as structured facts and asks intelligently — it never reads code aloud line by line.
- **Interviewer constraint (encode in role policy):** may clarify requirements/constraints; may NOT solve, rewrite, or reveal hidden tests.

### The "Canvas" question you asked about
Yes — we keep a **multimodal Canvas**, but generalize it beyond code. It is a single right-hand surface that swaps content by `modality`:
- `code` → Monaco + tests
- `scenario`/`roleplay` → scenario brief / MCP-sourced artifact (a PR, a metric chart, a ticket)
- `design` → a lightweight text/diagram pad
- `voice` → collapsed; voice-only, transcript centered

The candidate **never leaves the room**; the Canvas is a stateful extension of the same conversation. That's the mentor's point #5/#6 done right.

---

## 7. All 5 roles (locked) — as config, not code

Each role is a **policy object** (persona, owned competencies, allowed modalities, allowed/forbidden behaviors, transition style), loaded by the proxy. Adding a role = adding config, per `docs/09`.

| Role | Owns | Signature move |
|---|---|---|
| Technical | technical_reasoning, system_design, coding, debugging | "Make it concrete — implement it." |
| Product | product_thinking | "What customer metric proves this helped?" |
| Customer | customer_orientation | Role-play: "I'm seeing stale data at checkout…" |
| Hiring Manager | ownership, communication | Scope, prioritization, conflict. |
| Behavioural | behavioral, communication | STAR probing, real past examples. |

---

## 8. What we ADD beyond the mentor's 55 points

1. **Custom-LLM proxy as control plane** (§1) — the mentor never names *where* control lives; this is the cleanest possible answer and it's uniquely enabled by Agora's custom-LLM support.
2. **belief × confidence as a first-class pair** wired into the *selection score* (mentor mentions uncertainty but doesn't operationalize it into action ranking).
3. **Replayable decision log** — every `NEXT_ACTION_SELECTED` event carries `reason_code + evidence_refs`, powering the judge-facing "Why this question?" card and a timeline replay. This is our strongest judge artifact.
4. **Generalized Canvas** (not just an IDE) — code/scenario/design/roleplay share one surface.
5. **Evidence-vs-insufficiency distinction** in scoring (fairness): we never punish a candidate for what we failed to ask.

---

## 9. Clear AI disclosure (mandatory, don't forget)
Pre-interview modal + persistent "AI • Recording" indicator, and an `AI_DISCLOSURE_SHOWN` event logged before the session starts.

---

## 10. Corrected build order (see SPRINTS section below)
The old `PROGRESS.md` claims Sprints 00–05 "done," but they were built on the regressed model. We **re-baseline**: keep the working Agora voice path + UI shell, rip out the levels orchestrator, rebuild on this blueprint.
