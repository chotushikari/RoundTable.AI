# Data and State

Draft definitions are editable. Publishing creates immutable `interview_versions`, and invitations/sessions point to a version. Candidate turns have a session-scoped dedupe key; analyses are unique per candidate turn. Session state increments `state_version` on controller/tool/interruption changes. Artifacts use optimistic versions and append `artifact_versions` via a database trigger.

Resume files are private, delimited as untrusted claims, and may only seed verification questions. They are never assessment evidence. Schedule `purge_expired_interview_data()` daily to enforce 30-day deletion.
