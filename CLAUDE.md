# RoundTable.AI — Architecture & Handoff Blueprint

## 1. Project Context & Aim
**RoundTable.AI** is an advanced, multimodal AI interviewer designed to conduct continuous, adaptive, and highly realistic technical interviews. 

**Our primary goal:** Move beyond basic voice bots and build a dynamic interview experience that perfectly simulates a top-tier technical interview. The AI evaluates the candidate in real-time across multiple axes (Technical, Product, System Design, Communication, Confidence) and adapts the difficulty based on performance. Crucially, the interview is **multimodal** — it operates voice-first, but the AI can dynamically open a **Live Code Workspace** when it's time for the candidate to implement a solution (e.g., "Let's make this concrete. Please implement the LRU cache we just discussed.").

## 2. Blueprint Architecture
The application is built on modern web primitives and real-time streaming infrastructure:

- **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **RTC & Signaling:** **Agora Conversational AI** is the backbone. We use `agora-rtc-react` (WebRTC audio) and `agora-rtm` (Real-Time Messaging for signaling, state, and transcripts).
- **Agent Toolkit:** `agora-agent-client-toolkit` (manages the `AgoraVoiceAI` instance) and `agora-agent-uikit` (provides visualizers and mic controls).
- **AI Pipeline:** 
  - **STT (Speech-to-Text):** Deepgram (Managed via Agora)
  - **LLM:** OpenAI / Gemini (Configurable via backend endpoints)
  - **TTS (Text-to-Speech):** MiniMax (Managed via Agora)
- **Frontend Modalities:** A split-screen UI containing:
  - Transcript Rail (live speech history)
  - Agent Visualizer (orb that reacts to speech)
  - **Code Workspace** (powered by `@monaco-editor/react`, dynamically mounted when the AI triggers a coding round).

## 3. What We Have Done (Progress to Date)
- **Base Infrastructure:** Successfully scaffolded the Next.js app and integrated the Agora SDKs. Handled strict React 18/19 StrictMode hooks to prevent duplicate tracks and SDK crashes.
- **Authentication & Security:** Created secure backend routes (`/api/generate-agora-token`, `/api/invite-agent`) to issue RTC/RTM tokens dynamically without exposing App Certificates to the client.
- **Vercel Deployment Pipeline:** Configured Vercel to force `npm install` (overriding rogue pnpm lockfiles) and injected essential environment variables at build-time (`NEXT_PUBLIC_AGORA_APP_ID`) to ensure client-side initialization works perfectly in production.
- **Multimodal UI Foundation:** Completed **Sprint 05**. We built `CodeWorkspace.tsx` using Monaco Editor and refactored `QuickstartConversationLayout.tsx` and `ConversationComponent.tsx`. The UI can now dynamically transition between `activeModality: 'voice'` and `activeModality: 'code'`.

## 4. Remaining Steps & Next Sprints (The Roadmap)
*These are the minute, expert-level tasks remaining to achieve the full product vision:*

### Sprint 06: LLM-to-UI Command Routing
- [ ] **Agent RTM Commands:** Modify the AI's system prompt (in `/api/invite-agent`) to instruct the LLM to output specific structural commands when it wants the candidate to code.
- [ ] **Command Parsing:** Intercept these commands on the frontend via `AgoraVoiceAI` RTM listeners. When the command is detected, programmatically trigger `setActiveModality('code')`.
- [ ] **Context Injection:** When the code workspace opens, dynamically inject the specific problem stub (e.g., `class LRUCache...`) into the Monaco Editor state based on the AI's current context.

### Sprint 07: Live Code Evaluation Loop
- [ ] **Code Syncing:** Capture the candidate's code from the Monaco Editor (e.g., via a debounced `onChange` or a "Submit Code" button).
- [ ] **RTM Data Channel:** Send the candidate's code back to the AI Agent via RTM messages so the LLM can "read" the code in real-time while maintaining the voice conversation.
- [ ] **Execution Environment (Optional/Stretch):** Add a lightweight JS sandbox or backend eval route to actually run the candidate's code and pass the stdout/stderr back to the LLM.

### Sprint 08: Continuous Adaptive Scoring
- [ ] **State Tracker Refinement:** Expand the `candidateState` object in `ConversationComponent.tsx` and the `/api/logger` route to permanently store the rolling scores in a database (e.g., Supabase, Vercel Postgres, or Redis).
- [ ] **Dynamic Difficulty:** Update the agent prompt injection during the interview so the LLM knows the candidate's current score and adjusts follow-up questions accordingly.
- [ ] **Interview Post-Mortem:** Build a summary page that displays the final parsed scores, transcript, and code snapshots when the user clicks "End Conversation".

### Sprint 09: Polish & Stress Testing
- [ ] **Responsive Design:** Ensure the side-by-side Monaco Editor layout doesn't break on iPads or smaller laptop screens (using Tailwind flex grid adjustments).
- [ ] **Error Recovery:** Add robust reconnection logic if the user drops off WebRTC for a few seconds.
- [ ] **End-to-End QA:** Conduct a full 20-minute mock interview to ensure latency, TTS generation, and RTM state sync hold up under pressure.
