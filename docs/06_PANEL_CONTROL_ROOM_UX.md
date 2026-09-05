# 06 — PANEL / CONTROL ROOM UX

## Purpose

This screen is primarily for recruiters, judges, or internal debugging. It should make the intelligence visible.

## Information hierarchy

1. Current role
2. Why this role/action was selected
3. Competency being assessed
4. Candidate state
5. Evidence / signal
6. Difficulty/challenge vector
7. Live Agora metrics
8. Timeline

## Recommended layout

Current action:
PRODUCT
Reason:
“Technical correctness established; customer impact remains unverified.”

Candidate state:
- Technical 84%
- Product 52%
- Customer 31%
- Communication 88%

Signals:
- vague quantitative claim
- missing baseline

Timeline:
- 01:42 Technical
- 04:31 Technical
- 06:12 Product ← evidence gap
- 08:15 Code task
- 12:44 Customer

## “Why this question?” card

Show:
- selected role
- objective
- competency
- evidence references
- concise reason code
- difficulty/challenge values

Never expose hidden chain-of-thought.

## Judge experience

A judge should be able to answer “why did that happen?” in under five seconds.
