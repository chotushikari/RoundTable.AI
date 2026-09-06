-- RoundTable.AI — R1 schema (event backbone + versioned candidate state)
-- Run in Supabase SQL editor (or via supabase CLI). Idempotent where practical.

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type interview_status as enum ('draft','invited','live','processing','complete','aborted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type role_kind as enum ('technical','product','customer','manager','behavioral');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recommendation as enum ('strong_hire','hire','lean_hire','lean_no','no_hire','insufficient');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- interviews — one row per interview session
-- ─────────────────────────────────────────────────────────────
create table if not exists interviews (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  status          interview_status not null default 'draft',
  job_title       text,
  job_description text,
  seniority       text,
  resume_text     text,
  -- which of the 5 roles are enabled + per-competency weights
  panel_config    jsonb not null default '{}'::jsonb,
  rubric_weights  jsonb not null default '{}'::jsonb,
  seed_questions  jsonb not null default '[]'::jsonb,
  -- budgets: { min_seconds, max_seconds, depth_vs_breadth }
  budget          jsonb not null default '{}'::jsonb,
  invite_token    text unique,
  agora_channel   text,
  agora_agent_id  text
);

-- ─────────────────────────────────────────────────────────────
-- interview_events — append-only event log (docs/14 envelope)
--   idempotency: unique (interview_id, event_id)
-- ─────────────────────────────────────────────────────────────
create table if not exists interview_events (
  id            bigserial primary key,
  interview_id  uuid not null references interviews(id) on delete cascade,
  event_id      uuid not null,                 -- client/server supplied idempotency key
  sequence      bigint,                        -- monotonic per interview (nullable; server may assign)
  event_type    text not null,
  source        text not null,                 -- candidate|agora|orchestrator|code|mcp|assessment
  occurred_at   timestamptz not null default now(),
  state_version int,
  payload       jsonb not null default '{}'::jsonb,
  unique (interview_id, event_id)
);
create index if not exists idx_events_interview on interview_events(interview_id, id);
create index if not exists idx_events_type on interview_events(interview_id, event_type);

-- ─────────────────────────────────────────────────────────────
-- candidate_state — versioned snapshots (immutable rows, latest = max version)
--   competency_signals: { technical_reasoning: {belief,confidence}, ... }
-- ─────────────────────────────────────────────────────────────
create table if not exists candidate_state (
  id                  bigserial primary key,
  interview_id        uuid not null references interviews(id) on delete cascade,
  version             int not null,
  created_at          timestamptz not null default now(),
  phase               text,
  active_role         role_kind,
  competency_signals  jsonb not null default '{}'::jsonb,
  challenge_vector    jsonb not null default '{}'::jsonb,
  open_gaps           jsonb not null default '[]'::jsonb,
  covered_topics      jsonb not null default '[]'::jsonb,
  last_action         jsonb,
  time_budget_remaining int,
  unique (interview_id, version)
);
create index if not exists idx_state_latest on candidate_state(interview_id, version desc);

-- ─────────────────────────────────────────────────────────────
-- evidence — atomic evidence records linked to a source reference
-- ─────────────────────────────────────────────────────────────
create table if not exists evidence (
  id                   uuid primary key default gen_random_uuid(),
  interview_id         uuid not null references interviews(id) on delete cascade,
  created_at           timestamptz not null default now(),
  competency           text not null,
  evidence_type        text not null,   -- explanation|implementation|debugging|tradeoff|measurement|scenario_decision|customer_reasoning|ownership_example|contradiction|correction
  candidate_claim      text,
  supporting_observation text,
  confidence           real not null default 0.5,
  transcript_segment_id text,
  code_event_id        text,
  tool_event_id        text
);
create index if not exists idx_evidence_interview on evidence(interview_id, competency);

-- ─────────────────────────────────────────────────────────────
-- contradictions — do not auto-penalize; track for reconciliation
-- ─────────────────────────────────────────────────────────────
create table if not exists contradictions (
  id            uuid primary key default gen_random_uuid(),
  interview_id  uuid not null references interviews(id) on delete cascade,
  created_at    timestamptz not null default now(),
  claim_a       text not null,
  claim_b       text not null,
  refs          jsonb not null default '[]'::jsonb,
  conflict_score real,
  status        text not null default 'possible'   -- possible|reconciled|unresolved
);

-- ─────────────────────────────────────────────────────────────
-- assessments — final evidence-backed evaluation
-- ─────────────────────────────────────────────────────────────
create table if not exists assessments (
  id                 uuid primary key default gen_random_uuid(),
  interview_id       uuid not null references interviews(id) on delete cascade unique,
  created_at         timestamptz not null default now(),
  competency_profile jsonb not null default '{}'::jsonb,  -- per competency: belief, confidence, evidence_refs
  strengths          jsonb not null default '[]'::jsonb,
  concerns           jsonb not null default '[]'::jsonb,
  unresolved         jsonb not null default '[]'::jsonb,
  recommendation     recommendation not null default 'insufficient',
  overall_confidence real,
  candidate_feedback text
);

-- ─────────────────────────────────────────────────────────────
-- RLS: enable, but the server uses the service_role key which bypasses RLS.
-- Anon key gets no direct table access (all reads/writes go through our API).
-- ─────────────────────────────────────────────────────────────
alter table interviews        enable row level security;
alter table interview_events  enable row level security;
alter table candidate_state   enable row level security;
alter table evidence          enable row level security;
alter table contradictions    enable row level security;
alter table assessments       enable row level security;
