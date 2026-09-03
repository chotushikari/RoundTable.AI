# RoundTable AI 

**The Continuous Adaptive Interview Workspace**

RoundTable AI replaces rigid interview "levels" with a fluid, continuous adaptive interview. The interview is multimodal: voice-first, powered by Agora Conversational AI, but seamlessly transitions personas (Technical -> Product -> Communication) based on real-time LLM analysis (Two-Speed Intelligence) of the candidate's speech.

[**View Project on GitHub**](https://github.com/chotushikari/RoundTable.AI)

## 🚀 Deployment

This project is Vercel-ready (stateless architecture)! To deploy:
1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the following Environment Variables in Vercel:
   - `NEXT_PUBLIC_AGORA_APP_ID` (Your Agora App ID)
   - `NEXT_AGORA_APP_CERTIFICATE` (Your Agora App Certificate)
   - `GEMINI_API_KEY` (Your Google AI Studio Key)

## ✅ What's Done (Checklist)

- [x] **Sprint 00: Audit & Baseline**
  - Next.js foundation initialized.
- [x] **Sprint 01: Agora Vertical Slice**
  - Integrated `agora-rtc-react`, `agora-rtm`, and `agora-agents`.
  - Established real-time voice plane with structured event logging (`SESSION_STARTED`, `TRANSCRIPT_FINAL`, etc.).
- [x] **Sprint 02: Candidate State & Orchestrator**
  - Built the **Deep Path Orchestrator** which listens to transcripts and maintains a 5-dimensional candidate state (`technical`, `product`, `systemDesign`, `communication`, `confidence`).
  - Integrated Agora REST API (`POST /update`) to dynamically inject new system prompts into the live agent without dropping the call.
- [x] **Sprint 03: Technical AI Policies (Real LLM)**
  - Swapped mock intelligence for real **Gemini 3.8 Flash** integration via REST API.
  - Implemented strict `SYSTEM_PROMPT` to analyze candidate transcripts and extract JSON state updates.
- [x] **Sprint 03.5: Vercel Scalability Refactor** (*Damn Important Fix*)
  - Refactored the orchestrator to be 100% stateless! Moved the `CandidateState` and rolling transcript buffer into the React frontend (`useRef`). 
  - The API route is now safe for Vercel serverless deployment and won't lose state on cold starts.

## ⏳ What's Remaining (Future Sprints)
- [ ] **Sprint 04: Product & Hiring Manager Profiles**
  - Define the AI policies and prompt transitions for Product and Manager roles.
- [ ] **Sprint 05: Code Workspace (Multimodal UX)**
  - Build the visual code editor that opens when the interviewer asks the candidate to implement their design.
- [ ] **Sprint 06: Control Room UX**
  - Build the dashboard for hiring managers to view the candidate's live telemetry in real-time.

---

### *Original Quickstart Documentation Below*

This project was built on top of the Agora Conversational AI Next.js Quickstart.
