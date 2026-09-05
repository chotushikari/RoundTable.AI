# 00 — READ FIRST / ANTIGRAVITY OPERATING CONTRACT

You are not starting a greenfield toy. Treat the repository as an existing production prototype that must be audited before modification.

## Mission

Build RoundTable AI as an **adaptive interview control system** over Agora Conversational AI.

Core thesis:

> The panel does not ask more questions. It decides what it still needs to learn about the candidate.

Do NOT reduce the product to:
- multiple prompts,
- multiple avatars,
- a scripted question list,
- a generic voice chatbot.

The product is a stateful interview loop:

`listen → understand → update evidence → identify uncertainty → select next action → speak/act → repeat → assess`

## Hard engineering principles

1. Audit before coding.
2. Preserve the working Agora voice path.
3. Use typed schemas at AI boundaries.
4. Keep orchestration deterministic where control/safety matters.
5. Let models generate natural language under explicit objectives.
6. Persist interview events and versioned candidate state.
7. Never expose hidden chain-of-thought; expose concise decision reasons.
8. Separate latency-critical live behavior from deep post-interview analysis.
9. Never execute candidate code in the main application server.
10. Never allow arbitrary destructive MCP actions in the hackathon demo.
11. Do not add microservices, vector databases, or agent frameworks without a demonstrated need.
12. Every feature must map to PS-11, judging criteria, or a concrete product requirement.

## Before every sprint

- Read this file and the sprint file.
- Read the relevant architecture/spec files.
- Inspect current code and dependencies.
- Run the existing app/tests.
- State what is already working.
- Make a short implementation plan.
- Implement the smallest coherent change.
- Run the narrowest relevant tests first.
- Run the broader regression suite.
- Perform a real end-to-end smoke test when applicable.
- Update documentation.
- Review `git diff`.
- Commit with a conventional commit message.
- Push the completed sprint branch.
- Only begin the next sprint after the current Definition of Done is met.

## Never claim success without evidence

A completion report must contain:

- changed files
- tests executed
- actual outcomes
- screenshots/logs/metrics when relevant
- known limitations
- next sprint recommendation

If a required external service is unavailable, do not fake the integration. Isolate it behind a clear interface and document the blocker.
