# Operations

Deploy as one Next.js app on Vercel and one Supabase project. Set all variables from `env.local.example`; keep certificate, service key, signing secret, Gemini key, E2B key, and webhook secret server-only. Set `APP_BASE_URL` to the public HTTPS origin so Agora can reach the custom LLM route.

Vercel invokes `/api/cron/retention` daily with `CRON_SECRET`; the route runs the Supabase cleanup function. Monitor session start failures, RTC connection state, agent errors, evaluator fallbacks, CAS conflicts, interruption events, role transitions, tool latency, E2B failures, and assessment completion. Never log bearer tokens, resumes, full prompts, or raw media.
