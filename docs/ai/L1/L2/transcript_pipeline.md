# Transcript Pipeline

Agora STT sends conversation messages to the custom OpenAI-compatible LLM endpoint. The route extracts only the latest user message and ignores system/model input. `processCandidateTurn` hashes session, recent message context, and answer; reserves a candidate turn; reuses an existing analysis when present; evaluates all roles; validates quotes; selects one speaker; updates session state with compare-and-swap; records the interviewer turn; and returns cached response text as SSE.

The browser's toolkit transcript remains the display source. It reports metrics, errors, connection state, and interruptions to a typed event route, but it never sends scores or authoritative role state. Interrupted interviewer turns are marked, mandatory coverage is undone when appropriate, and the next controller turn rephrases the pending question.
