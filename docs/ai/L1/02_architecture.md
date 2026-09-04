# Architecture

The candidate browser joins Agora RTC and RTM. One managed agent uses Agora-managed STT/TTS and calls `/api/ai/chat/completions` with a per-session bearer token. The route evaluates the final answer for every role, validates literal evidence, applies deterministic controller rules, persists with compare-and-swap, and streams one question.

Supabase is the production store and auth provider. An in-memory adapter is development/test-only and is prohibited in production. E2B is called only by the server-selected workspace harness. Changes from `company_session_status` are broadcast to a private organization topic; no content table is added to the Realtime publication.
