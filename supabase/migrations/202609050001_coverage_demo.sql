-- Demo policy is explicit and frozen into interview_versions.definition.
-- Existing invitations keep their original duration and policy.
alter table public.interview_definitions
  add column if not exists demo_mode boolean not null default false;
