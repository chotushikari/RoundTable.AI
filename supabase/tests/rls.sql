-- Run with a disposable local Supabase database after applying migrations.
begin;

select plan(8);

select has_table('public', 'company_session_status', 'status-only Realtime projection exists');
select policies_are('public', 'interview_sessions', array['sessions_member_select'], 'sessions have an explicit company read policy');
select policies_are('public', 'transcript_turns', array['transcript_member_select'], 'transcripts have an explicit post-completion policy');
select policies_are('public', 'assessments', array['assessments_member_select'], 'assessments have an explicit post-completion policy');
select policies_are('public', 'workspace_artifacts', array['artifacts_member_select'], 'artifacts have an explicit post-completion policy');
select policies_are('public', 'company_session_status', array['status_member_select'], 'status projection is tenant scoped');
select has_trigger('public', 'company_session_status', 'company_session_status_broadcast', 'status projection broadcasts through a private topic');
select is_empty(
  $$select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('transcript_turns','turn_analyses','workspace_artifacts','assessments')$$,
  'sensitive interview content is not configured for Realtime'
);

select * from finish();
rollback;
