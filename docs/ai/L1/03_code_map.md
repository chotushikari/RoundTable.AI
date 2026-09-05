# Code Map

- `components/LandingPage.tsx`, `ConversationComponent.tsx`: candidate bootstrap and Agora lifecycle.
- `components/CompanyDashboard.tsx`: minimal company auth/create/publish surface.
- `components/InterviewWorkspace.tsx`: Monaco, React Flow, drafts, checkpoints, test results.
- `app/api/interviews`, `invitations`, `sessions`: product and lifecycle APIs, including responsive background agent startup.
- `app/api/ai/chat/completions`: authenticated Agora custom LLM boundary.
- `app/api/mcp/[grant]`: session-scoped Streamable HTTP MCP endpoint.
- `lib/interview-controller.ts`: evaluator validation and deterministic next-speaker rules.
- `lib/interview-demo.ts`: five-role showcase order, opening/closing text, and answered-role progress.
- `lib/interview-store.ts`: Supabase/in-memory persistence adapter.
- `lib/agora-server.ts`: combined tokens and managed-agent start/stop.
- `lib/assessment.ts`: evidence-only final report.
- `lib/assessment-prompt.ts`: bounded quote catalog and validated narrative-only report enrichment.
- `supabase/migrations`: schema, RLS, Realtime projection, retention.
