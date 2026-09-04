# Testing

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run verify:api`, and `npm run build`. `npm run verify` additionally requires a complete `.env.local` through `doctor`.

The live gate requires real Agora join/RTC/RTM/renewal proof, 20 barge-in attempts with p95 stop time, impaired-network recovery, SSE/audio latency, deployed Supabase RLS tests, and E2B isolation checks. Offline success must not be represented as live success.
