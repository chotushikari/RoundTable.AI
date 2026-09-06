begin;

alter table public.interview_definitions
  add column if not exists linear_issue_identifier text;

alter table public.interview_definitions
  drop constraint if exists interview_definitions_linear_issue_identifier_check;

alter table public.interview_definitions
  add constraint interview_definitions_linear_issue_identifier_check
  check (
    linear_issue_identifier is null
    or linear_issue_identifier ~ '^[A-Za-z][A-Za-z0-9_-]*-[0-9]+$'
  );

alter table public.tool_runs drop constraint if exists tool_runs_name_check;
alter table public.tool_runs add constraint tool_runs_name_check check (name in (
  'get_workspace_snapshot',
  'run_code_tests',
  'inject_scenario_constraint',
  'linear_get_issue',
  'linear_prepare_comment',
  'linear_post_comment'
));

commit;
