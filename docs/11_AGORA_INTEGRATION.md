# 11 — AGORA INTEGRATION

## Strategic role

Agora is the **real-time voice execution plane**.

RoundTable owns:
- interview intelligence
- Candidate State
- orchestration
- evidence
- assessment

Agora owns/executes the real-time conversational transport and agent session behavior.

## Official references

Agora Conversational AI Python SDK:
https://github.com/AgoraIO/agora-agents-python

AgentSession reference:
https://github.com/AgoraIO/agora-agents-python/blob/main/docs/reference/session.md

Official voice agent quickstart:
https://github.com/AgoraIO/docs-portal/blob/main/content/docs/en/ai/get-started/quickstart.mdx

Official events recipe:
https://github.com/AgoraIO-Conversational-AI/recipe-agent-events

Official handoff recipe:
https://github.com/AgoraIO-Conversational-AI/recipe-agent-handoff

Agora Skills:
https://github.com/AgoraIO/skills

## Important current capabilities to verify against the installed version

The current official Python SDK documents:
- Agent builder configuration
- cascading ASR → LLM → TTS
- MLLM flows
- session start/stop
- `say()`
- `interrupt()`
- runtime `update()`
- runtime `think()`
- history access
- turn detection and interruption-related configuration

Do not hard-code undocumented behavior. Read the installed SDK/version and official reference before implementation.

## Recommended architecture

Prefer a single live Agora session when a role switch can be represented as runtime context/instruction changes, because it preserves conversational continuity.

Use explicit agent handoff when it creates a clear technical benefit and the chosen pattern is more reliable in your current implementation.

This is a mentor-validation decision, not an assumption.

## Agora event observability

Use available agent events/metrics to expose:
- state
- transcript
- per-stage latency
- errors

Keep the event model internal and typed.

## Model strategy

Use Agora-managed models where they improve simplicity and reliability for the hackathon. Use BYOK/custom providers only where a specific capability is required.

## Runtime role change concept

```text
Orchestrator
role = Product
objective = customer impact
difficulty = current vector

→ update/think runtime context using supported Agora API
→ agent continues same session
→ Product-style response
```

Validate the exact request payload against the current SDK before coding.

## Interruption

Test:
- candidate cuts off agent
- agent stops
- candidate continues
- transcript stays consistent
- orchestrator does not duplicate the question

## Agora-specific success criteria

A judge should be able to see that Agora is central to the real-time experience, not merely listed in the stack.
