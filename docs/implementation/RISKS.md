# Risks

1. **Agora SDK Unfamiliarity**: We need to use the `agora-agents-python` SDK correctly for handoffs and runtime state updates. The exact payload for runtime updates must be strictly validated.
2. **Latency vs Deep Reasoning**: Deep reasoning required for candidate state updates might conflict with the low-latency requirement of voice response. This needs the Async boundary strategy outlined in backend architecture.
3. **Empty Baseline**: We are starting entirely from scratch, which means standard boilerplate and plumbing will consume significant time before we hit core logic.
