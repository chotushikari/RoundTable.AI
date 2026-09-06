# 20 — DESIGN SYSTEM

## Aesthetic direction

Professional enterprise product, not a sci-fi dashboard.

Use:
- restrained color
- generous whitespace
- clear typography
- strong information hierarchy
- subtle state transitions
- accessible contrast
- responsive layout

## Candidate UI

Primary:
- active interviewer
- transcript
- timer/status
- current task

Secondary:
- quiet panel rail
- progress

Tertiary:
- controls

## Control room

Use denser information:
- evidence cards
- competency radar
- timeline
- current action
- Agora metrics

## Motion

Use motion to communicate state:
- speaking
- listening
- role transition
- code workspace opening
- score/evidence change

Do not animate continuously for decoration.

## Typography

Choose a readable modern sans-serif. Avoid novelty fonts.

## Components

- InterviewerHeader
- VoiceIndicator
- Transcript
- PanelRail
- StateRadar
- EvidenceCard
- NextActionCard
- ModeSwitcher
- CodeWorkspace
- TestResults
- InterviewTimeline
- AssessmentSummary
- EvidenceDrawer

## Error UX

Never show stack traces to candidate.
Candidate sees:
“Something went wrong. We’ll keep the interview moving.”

Judge/debug view can show the actual error class and event ID.
