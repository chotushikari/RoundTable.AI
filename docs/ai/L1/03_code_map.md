# Code Map

- `components/LandingPage.tsx`, `ConversationComponent.tsx`: candidate bootstrap and Agora lifecycle.
- `components/CompanyDashboard.tsx`: minimal company auth/create/publish surface.
- `components/InterviewWorkspace.tsx`: Monaco, React Flow, drafts, checkpoints, test results.
- `app/api/interviews`, `invitations`, `sessions`: product and lifecycle APIs.
- `app/api/ai/chat/completions`: authenticated Agora custom LLM boundary.
- `app/api/mcp/[grant]`: session-scoped Streamable HTTP MCP endpoint.
- `lib/interview-controller.ts`: evaluator validation and deterministic next-speaker rules.
- `lib/interview-store.ts`: Supabase/in-memory persistence adapter.
- `lib/agora-server.ts`: combined tokens and managed-agent start/stop.
- `lib/assessment.ts`: evidence-only final report.
- `supabase/migrations`: schema, RLS, Realtime projection, retention.
