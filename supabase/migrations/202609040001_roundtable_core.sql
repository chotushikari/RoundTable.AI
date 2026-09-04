begin;

create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = target_organization_id and user_id = auth.uid()
  );
$$;

create table public.interview_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  role_title text not null,
  jd_text text not null,
  desired_outcomes jsonb not null default '[]'::jsonb,
  panel_roles jsonb not null default '["technical","product","hiring_manager"]'::jsonb,
  must_ask_questions jsonb not null default '[]'::jsonb,
  must_cover_topics jsonb not null default '[]'::jsonb,
  duration_minutes integer not null default 30 check (duration_minutes between 15 and 90),
  instructions text not null default '',
  status text not null default 'draft' check (status in ('draft', 'ready')),
  plan jsonb,
  plan_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_versions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interview_definitions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null check (version > 0),
  definition jsonb not null,
  plan jsonb not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  unique (interview_id, version)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interview_definitions(id) on delete cascade,
  interview_version_id uuid not null references public.interview_versions(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  claimed_at timestamptz,
  candidate_name text,
  candidate_email text,
  resume_path text,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '7 days 1 minute')
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.invitations(id) on delete cascade,
  interview_id uuid not null references public.interview_definitions(id) on delete cascade,
  interview_version_id uuid not null references public.interview_versions(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null check (status in ('draft','ready','in_progress','assessing','completed','abandoned','failed','needs_review')),
  connection_health text not null default 'unknown' check (connection_health in ('unknown','connected','degraded','disconnected')),
  channel_name text not null unique,
  rtc_uid text not null,
  agent_uid text not null,
  agora_agent_id text unique,
  llm_token_hash text not null unique check (char_length(llm_token_hash) = 64),
  active_role text not null check (active_role in ('technical','product','hiring_manager','behavioral','customer')),
  previous_role text check (previous_role is null or previous_role in ('technical','product','hiring_manager','behavioral','customer')),
  consecutive_role_turns integer not null default 0 check (consecutive_role_turns >= 0),
  current_modality text not null default 'voice' check (current_modality in ('voice','code','canvas','scenario')),
  competency_state jsonb not null default '{}'::jsonb,
  asked_must_ask jsonb not null default '[]'::jsonb,
  covered_topics jsonb not null default '[]'::jsonb,
  pending_question text,
  state_version integer not null default 0,
  tool_run_count integer not null default 0 check (tool_run_count between 0 and 5),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null
);

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
    (session_record->>'state_version')::integer,
    (session_record->>'tool_run_count')::integer,
    (session_record->>'started_at')::timestamptz,
    (session_record->>'expires_at')::timestamptz
  ) returning *;
end;
$$;

create table public.transcript_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  speaker text not null check (speaker in ('candidate','interviewer')),
  speaker_role text check (speaker_role is null or speaker_role in ('technical','product','hiring_manager','behavioral','customer')),
  text text not null check (char_length(text) between 1 and 20000),
  status text not null check (status in ('final','interrupted')),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (session_id, sequence),
  unique (session_id, dedupe_key)
);

create or replace function public.reserve_transcript_turn(
  target_session_id uuid,
  target_turn_id uuid,
  target_speaker text,
  target_speaker_role text,
  target_text text,
  target_status text,
  target_dedupe_key text
) returns setof public.transcript_turns
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.interview_sessions where id = target_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  insert into public.transcript_turns(id, session_id, sequence, speaker, speaker_role, text, status, dedupe_key)
  values (
    target_turn_id,
    target_session_id,
    coalesce((select max(sequence) + 1 from public.transcript_turns where session_id = target_session_id), 1),
    target_speaker,
    nullif(target_speaker_role, ''),
    target_text,
    target_status,
    target_dedupe_key
  ) on conflict (session_id, dedupe_key) do nothing;
  return query select * from public.transcript_turns
  where session_id = target_session_id and dedupe_key = target_dedupe_key;
end;
$$;

create table public.turn_analyses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  turn_id uuid not null unique references public.transcript_turns(id) on delete cascade,
  analysis jsonb not null,
  decision jsonb not null,
  response_text text not null,
  model text not null,
  created_at timestamptz not null default now()
);

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

create table public.workspace_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  type text not null check (type in ('code','canvas')),
  version integer not null default 1 check (version > 0),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, type)
);

create table public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.workspace_artifacts(id) on delete cascade,
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  type text not null check (type in ('code','canvas')),
  version integer not null check (version > 0),
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (artifact_id, version)
);

create table public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  name text not null check (name in ('get_workspace_snapshot','run_code_tests','inject_scenario_constraint')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null check (status in ('completed','failed')),
  created_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.interview_sessions(id) on delete cascade,
  assessment jsonb not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Deliberately content-free projection: this is the only table added to Realtime.
create table public.company_session_status (
  session_id uuid primary key references public.interview_sessions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null,
  health text not null default 'idle',
  started_at timestamptz not null,
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace function public.sync_company_session_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.company_session_status(session_id, organization_id, status, health, started_at, updated_at, completed_at)
  values (
    new.id,
    new.organization_id,
    new.status,
    case when new.status = 'failed' then 'error' else new.connection_health end,
    new.started_at,
    now(),
    new.completed_at
  )
  on conflict (session_id) do update set
    status = excluded.status,
    health = excluded.health,
    updated_at = excluded.updated_at,
    completed_at = excluded.completed_at;
  return new;
end;
$$;

create trigger interview_session_status_projection
after insert or update of status, connection_health, completed_at on public.interview_sessions
for each row execute function public.sync_company_session_status();

create or replace function public.broadcast_company_session_status()
returns trigger language plpgsql security definer set search_path = public, realtime as $$
begin
  perform realtime.broadcast_changes(
    'organization:' || new.organization_id::text || ':status',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

create trigger company_session_status_broadcast
after insert or update on public.company_session_status
for each row execute function public.broadcast_company_session_status();

create or replace function public.capture_artifact_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.artifact_versions(artifact_id, session_id, type, version, content)
  values (new.id, new.session_id, new.type, new.version, new.content);
  return new;
end;
$$;

create trigger workspace_artifact_version_history
after insert or update of version on public.workspace_artifacts
for each row execute function public.capture_artifact_version();

create index interview_definitions_org_idx on public.interview_definitions(organization_id, created_at desc);
create index invitations_org_idx on public.invitations(organization_id, created_at desc);
create index interview_sessions_org_idx on public.interview_sessions(organization_id, started_at desc);
create index transcript_turns_session_idx on public.transcript_turns(session_id, sequence);
create index session_events_session_idx on public.session_events(session_id, created_at);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.interview_definitions enable row level security;
alter table public.interview_versions enable row level security;
alter table public.invitations enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.transcript_turns enable row level security;
alter table public.turn_analyses enable row level security;
alter table public.workspace_artifacts enable row level security;
alter table public.artifact_versions enable row level security;
alter table public.tool_runs enable row level security;
alter table public.assessments enable row level security;
alter table public.session_events enable row level security;
alter table public.company_session_status enable row level security;

create policy organizations_select on public.organizations for select using (public.is_org_member(id));
create policy memberships_select on public.memberships for select using (user_id = auth.uid());
create policy definitions_member_all on public.interview_definitions for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy versions_member_select on public.interview_versions for select using (public.is_org_member(organization_id));
create policy invitations_member_all on public.invitations for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy sessions_member_select on public.interview_sessions for select using (public.is_org_member(organization_id) and status = 'completed');
create policy transcript_member_select on public.transcript_turns for select using (
  exists (select 1 from public.interview_sessions s where s.id = session_id and s.status = 'completed' and public.is_org_member(s.organization_id))
);
create policy analyses_member_select on public.turn_analyses for select using (
  exists (select 1 from public.interview_sessions s where s.id = session_id and s.status = 'completed' and public.is_org_member(s.organization_id))
);
create policy artifacts_member_select on public.workspace_artifacts for select using (
  exists (select 1 from public.interview_sessions s where s.id = session_id and s.status = 'completed' and public.is_org_member(s.organization_id))
);
create policy artifact_versions_member_select on public.artifact_versions for select using (
  exists (select 1 from public.interview_sessions s where s.id = session_id and s.status = 'completed' and public.is_org_member(s.organization_id))
);
create policy tool_runs_member_select on public.tool_runs for select using (
  exists (select 1 from public.interview_sessions s where s.id = session_id and s.status = 'completed' and public.is_org_member(s.organization_id))
);
create policy assessments_member_select on public.assessments for select using (
  exists (select 1 from public.interview_sessions s where s.id = session_id and s.status = 'completed' and public.is_org_member(s.organization_id))
);
create policy status_member_select on public.company_session_status for select using (public.is_org_member(organization_id));
create policy organization_status_broadcast_read on realtime.messages
for select to authenticated using (
  realtime.messages.extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'organization'
  and split_part(realtime.topic(), ':', 3) = 'status'
  and public.is_org_member(split_part(realtime.topic(), ':', 2)::uuid)
);

insert into storage.buckets (id, name, public)
values ('candidate-resumes', 'candidate-resumes', false)
on conflict (id) do update set public = false;

create or replace function public.purge_expired_interview_data()
returns integer language plpgsql security definer set search_path = public, storage as $$
declare deleted_count integer;
begin
  delete from storage.objects o
  using public.invitations i, public.interview_sessions s
  where o.bucket_id = 'candidate-resumes'
    and o.name = i.resume_path
    and i.id = s.invitation_id
    and s.completed_at < now() - interval '30 days';

  delete from public.interview_sessions
  where completed_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  delete from public.invitations
  where claimed_at < now() - interval '30 days';
  return deleted_count;
end;
$$;

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.interview_definitions to authenticated;
grant select on public.organizations, public.memberships, public.interview_versions,
  public.invitations, public.interview_sessions, public.transcript_turns,
  public.turn_analyses, public.workspace_artifacts, public.artifact_versions,
  public.tool_runs, public.assessments, public.company_session_status to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
revoke all on function public.purge_expired_interview_data() from public, anon, authenticated;
revoke all on function public.claim_invitation_and_create_session(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.reserve_transcript_turn(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.commit_interview_turn_outcome(uuid, integer, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.claim_invitation_and_create_session(uuid, jsonb) to service_role;
grant execute on function public.reserve_transcript_turn(uuid, uuid, text, text, text, text, text) to service_role;
grant execute on function public.commit_interview_turn_outcome(uuid, integer, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.purge_expired_interview_data() to service_role;

commit;
