# Architecture Decisions

1. **Monorepo Structure**: Next.js App Router using the official `agent-quickstart-nextjs` as the baseline. The backend logic (Orchestrator, Candidate State) runs in Next.js API Routes.
2. **Two-Speed Intelligence**:
   - *Fast Path*: Real-time Voice (Agora) → Lightweight NextAction generation → Voice Response.
   - *Async Path*: Transcript processing → Deep Evidence Extraction → Continuous Candidate State Updates.
3. **Role Transitions**: We will maintain one continuous Agora session. Role transitions (Technical → Product) are handled by injecting dynamic runtime instruction updates into the running agent, avoiding latency-heavy session handoffs.
4. **Multimodal Workspace (Canvas)**: The UI features a persistent "Canvas" powered by Monaco Editor. The AI orchestrator can dispatch a `NextInterviewAction` with a `modality: "code"` flag, opening the workspace seamlessly alongside the voice session.
5. **Code Execution**: We will use Judge0 for sandboxed execution of candidate code. Code events (run success, test failures) are fed into the async intelligence pipeline as structured observations, NOT read aloud by the TTS.
6. **Continuous Adaptation Vector**: We do not use rigid "levels". Candidate state is a continuous float vector of confidence/belief values (e.g., Technical: 0.82, System Design: 0.40). Every answer and code execution updates this vector, driving the next optimal question.
