# Security and Privacy

Company APIs validate Supabase bearer tokens and organization membership. Candidate APIs validate an HttpOnly, SameSite=Strict signed cookie. The custom LLM uses a random token whose SHA-256 hash is stored. MCP URLs contain an expiring signed session grant.

The custom LLM ignores caller-provided system messages and model names. Employer, resume, and transcript content are untrusted data. Only literal transcript quotes survive evidence validation. E2B receives no process environment or app secrets, accepts only JS/TS checkpoints, runs a fixed command for 15 seconds, caps output, and permits at most five tool runs.
