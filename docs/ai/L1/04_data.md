# Data and State

Draft definitions are editable. Publishing creates immutable `interview_versions`, and invitations/sessions point to a version. Candidate turns have a session-scoped dedupe key; analyses are unique per substantive candidate turn. Session state records introduction, background, panel, and wrap-up phases and increments `state_version` on controller/tool/interruption changes. Conversational pause/repeat turns are retained without scoring or advancing phase. Artifacts use optimistic versions and append `artifact_versions` via a database trigger.

Resume files are private, delimited as untrusted claims, and may only seed verification questions. They are never assessment evidence. Schedule `purge_expired_interview_data()` daily to enforce 30-day deletion.

Migration `202609050001_coverage_demo.sql` adds `interview_definitions.demo_mode`; publishing copies `demoMode` into immutable version JSON. An absent flag means normal mode, apart from legacy two-minute behavior. Demo progress derives from the initial Hiring Manager answer and prior analysis decisions, excluding the latest still-unanswered question. No additional scoring state is accepted from the browser.
