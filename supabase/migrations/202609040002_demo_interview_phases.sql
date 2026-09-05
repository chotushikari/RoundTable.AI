begin;

alter table public.interview_definitions
  drop constraint if exists interview_definitions_duration_minutes_check;

alter table public.interview_definitions
  add constraint interview_definitions_duration_minutes_check
  check (duration_minutes between 2 and 90);

alter table public.interview_sessions
  drop constraint if exists interview_sessions_status_check;

alter table public.interview_sessions
  add constraint interview_sessions_status_check
  check (status in ('draft','ready','starting','in_progress','assessing','completed','abandoned','failed','needs_review'));

alter table public.interview_sessions
  add column if not exists phase text not null default 'introduction';

alter table public.interview_sessions
  drop constraint if exists interview_sessions_phase_check;

alter table public.interview_sessions
  add constraint interview_sessions_phase_check
  check (phase in ('introduction','background','panel','wrap_up'));

create or replace function public.commit_interview_turn_outcome(
  target_session_id uuid,
  expected_state_version integer,
  session_patch jsonb,
  interviewer_turn jsonb,
  analysis_record jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare current_version integer;
declare saved_analysis public.turn_analyses%rowtype;
begin
  select state_version into current_version
  from public.interview_sessions where id = target_session_id for update;
  if not found then raise exception 'Session not found'; end if;

  select * into saved_analysis from public.turn_analyses
  where turn_id = (analysis_record->>'turn_id')::uuid;
  if found then return to_jsonb(saved_analysis); end if;
  if current_version <> expected_state_version then
    raise exception 'Session state changed; retry the turn';
  end if;

  update public.interview_sessions set
    active_role = coalesce(session_patch->>'active_role', active_role),
    previous_role = case when session_patch ? 'previous_role' then session_patch->>'previous_role' else previous_role end,
    consecutive_role_turns = coalesce((session_patch->>'consecutive_role_turns')::integer, consecutive_role_turns),
    current_modality = coalesce(session_patch->>'current_modality', current_modality),
    phase = coalesce(session_patch->>'phase', phase),
    competency_state = coalesce(session_patch->'competency_state', competency_state),
    asked_must_ask = coalesce(session_patch->'asked_must_ask', asked_must_ask),
    covered_topics = coalesce(session_patch->'covered_topics', covered_topics),
    pending_question = case when session_patch ? 'pending_question' then session_patch->>'pending_question' else pending_question end,
    state_version = (session_patch->>'state_version')::integer
  where id = target_session_id and state_version = expected_state_version;
  if not found then raise exception 'Session state changed; retry the turn'; end if;

  insert into public.transcript_turns(id, session_id, sequence, speaker, speaker_role, text, status, dedupe_key)
  values (
    (interviewer_turn->>'id')::uuid,
    target_session_id,
    coalesce((select max(sequence) + 1 from public.transcript_turns where session_id = target_session_id), 1),
    interviewer_turn->>'speaker',
    nullif(interviewer_turn->>'speaker_role', ''),
    interviewer_turn->>'text',
    interviewer_turn->>'status',
    interviewer_turn->>'dedupe_key'
  ) on conflict (session_id, dedupe_key) do nothing;

  insert into public.turn_analyses(id, session_id, turn_id, analysis, decision, response_text, model, created_at)
  values (
    (analysis_record->>'id')::uuid,
    target_session_id,
    (analysis_record->>'turn_id')::uuid,
    analysis_record->'analysis',
    analysis_record->'decision',
    analysis_record->>'response_text',
    analysis_record->>'model',
    (analysis_record->>'created_at')::timestamptz
  ) on conflict (turn_id) do nothing;

  select * into saved_analysis from public.turn_analyses
  where turn_id = (analysis_record->>'turn_id')::uuid;
  return to_jsonb(saved_analysis);
end;
$$;

commit;
