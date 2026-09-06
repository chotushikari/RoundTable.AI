begin;

alter table public.interview_sessions
add column accumulated_contradictions jsonb not null default '[]'::jsonb,
add column challenge_vector jsonb not null default '{"technicalDepth": 3, "ambiguity": 3, "scale": 3, "edgeCaseComplexity": 3, "businessComplexity": 3, "timePressure": 2, "crossFunctionalComplexity": 3}'::jsonb;

create or replace function public.claim_invitation_and_create_session(
  target_invitation_id uuid,
  session_record jsonb
) returns setof public.interview_sessions
language plpgsql security definer set search_path = public as $$
declare invitation_row public.invitations%rowtype;
begin
  select * into invitation_row from public.invitations where id = target_invitation_id for update;
  if not found or invitation_row.revoked_at is not null or invitation_row.expires_at <= now() then
    raise exception 'Invitation not found, revoked, or expired';
  end if;
  if invitation_row.claimed_at is not null then
    raise exception 'Invitation has already been used';
  end if;
  if invitation_row.interview_id <> (session_record->>'interview_id')::uuid
    or invitation_row.interview_version_id <> (session_record->>'interview_version_id')::uuid
    or invitation_row.organization_id <> (session_record->>'organization_id')::uuid then
    raise exception 'Session does not match invitation';
  end if;

  update public.invitations set claimed_at = (session_record->>'started_at')::timestamptz
  where id = target_invitation_id;

  return query insert into public.interview_sessions (
    id, invitation_id, interview_id, interview_version_id, organization_id,
    status, connection_health, channel_name, rtc_uid, agent_uid, llm_token_hash,
    active_role, current_modality, competency_state, asked_must_ask, covered_topics,
    accumulated_contradictions, challenge_vector,
    state_version, tool_run_count, started_at, expires_at
  ) values (
    (session_record->>'id')::uuid,
    target_invitation_id,
    (session_record->>'interview_id')::uuid,
    (session_record->>'interview_version_id')::uuid,
    (session_record->>'organization_id')::uuid,
    session_record->>'status',
    session_record->>'connection_health',
    session_record->>'channel_name',
    session_record->>'rtc_uid',
    session_record->>'agent_uid',
    session_record->>'llm_token_hash',
    session_record->>'active_role',
    session_record->>'current_modality',
    session_record->'competency_state',
    session_record->'asked_must_ask',
    session_record->'covered_topics',
    session_record->'accumulated_contradictions',
    session_record->'challenge_vector',
    (session_record->>'state_version')::integer,
    (session_record->>'tool_run_count')::integer,
    (session_record->>'started_at')::timestamptz,
    (session_record->>'expires_at')::timestamptz
  ) returning *;
end;
$$;

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
    accumulated_contradictions = coalesce(session_patch->'accumulated_contradictions', accumulated_contradictions),
    challenge_vector = coalesce(session_patch->'challenge_vector', challenge_vector),
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
