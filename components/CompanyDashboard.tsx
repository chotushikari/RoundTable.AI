'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import { DEMO_DURATION_MINUTES, DEMO_ROLES } from '@/lib/interview-demo';

type Interview = { id: string; title: string; roleTitle: string; status: string; createdAt: string };
type SessionSummary = { id: string; status: string; health: string; startedAt: string; completedAt: string | null; interviewId: string };

export function CompanyDashboard() {
  const supabase = useMemo(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedResult, setSelectedResult] = useState<Record<string, unknown> | null>(null);
  const [roleTitle, setRoleTitle] = useState('Senior Backend Engineer');
  const [jdText, setJdText] = useState('Own the design and delivery of reliable TypeScript services, collaborate with product, improve customer outcomes, and operate systems at scale.');
  const [outcomes, setOutcomes] = useState('Design reliable services\nExplain customer impact\nDemonstrate ownership');
  const [message, setMessage] = useState('');
  const accessToken = session?.access_token;
  const authHeaders: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const load = useCallback(async () => {
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const response = await fetch('/api/interviews', { headers });
    const data = await response.json();
    if (response.ok) {
      setInterviews(data.interviews);
      setOrganizationId(data.organizationId);
      const sessionLists = await Promise.all((data.interviews as Interview[]).map(async (item) => {
        const sessionResponse = await fetch(`/api/interviews/${item.id}/sessions`, { headers });
        const sessionData = await sessionResponse.json();
        return sessionResponse.ok
          ? (sessionData.sessions as Omit<SessionSummary, 'interviewId'>[]).map((entry) => ({ ...entry, interviewId: item.id }))
          : [];
      }));
      setSessions(sessionLists.flat());
    }
    else setMessage(data.error ?? 'Could not load interviews');
  }, [accessToken]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => { if (session || !supabase) void load(); }, [load, session, supabase]);

  useEffect(() => {
    if (!supabase || !session || !organizationId) return;
    // The private topic is authorized by realtime.messages RLS. The status
    // payload contains no transcript, score, answer, code, or canvas data.
    const channel = supabase
      .channel(`organization:${organizationId}:status`, { config: { private: true } })
      .on('broadcast', { event: '*' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, organizationId, session, supabase]);

  const magicLink = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/company` } });
    setMessage(error ? error.message : 'Check your email for the secure sign-in link.');
  };

  const createOrganization = async () => {
    const response = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ name: organizationName }) });
    const data = await response.json();
    setMessage(response.ok ? 'Organization created.' : data.error);
    if (response.ok) await load();
  };

  const createInterview = async () => {
    setMessage('Creating adaptive plan…');
    const response = await fetch('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        roleTitle,
        jdText,
        desiredOutcomes: outcomes.split('\n').filter(Boolean),
        panelRoles: DEMO_ROLES,
        mustAskQuestions: [],
        durationMinutes: DEMO_DURATION_MINUTES,
        demoMode: true,
      }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    const plan = await fetch(`/api/interviews/${data.interview.id}/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: '{}' });
    const planData = await plan.json();
    setMessage(plan.ok ? `Plan ready (${planData.generation.model}). Review and publish when ready.` : planData.error);
    await load();
  };

  const publish = async (id: string) => {
    const response = await fetch(`/api/interviews/${id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: '{}' });
    const data = await response.json();
    setMessage(response.ok ? `Invitation: ${data.invitationUrl}` : data.error);
    if (response.ok) await navigator.clipboard?.writeText(data.invitationUrl);
  };

  const viewResult = async (id: string) => {
    const response = await fetch(`/api/sessions/${id}`, { headers: authHeaders });
    const data = await response.json();
    setSelectedResult(response.ok ? data : { error: data.error });
  };

  const releaseFeedback = async () => {
    const selectedSession = selectedResult?.session as { id?: unknown } | undefined;
    if (typeof selectedSession?.id !== 'string') return;
    const response = await fetch(`/api/sessions/${selectedSession.id}/release`, { method: 'POST', headers: authHeaders });
    const data = await response.json();
    setMessage(response.ok ? `Candidate feedback released at ${data.releasedAt}` : data.error);
    if (response.ok) await viewResult(selectedSession.id);
  };

  if (supabase && !session) {
    return <main className="mx-auto max-w-md p-8"><h1 className="text-2xl font-semibold">Company sign in</h1><p className="mt-2 text-sm text-muted-foreground">Receive a Supabase magic link.</p><input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-6 w-full rounded border p-2 text-black" placeholder="you@company.com"/><button onClick={magicLink} className="mt-3 rounded bg-primary px-4 py-2 text-primary-foreground">Send magic link</button><p className="mt-3 text-sm">{message}</p></main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header><h1 className="text-3xl font-semibold">RoundTable company dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Create adaptive interviews. Live sessions expose status and health only.</p></header>
      {message.includes('membership') && <section className="rounded border p-4"><h2 className="font-semibold">Create your organization</h2><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="mt-3 rounded border p-2 text-black" placeholder="Organization name"/><button onClick={createOrganization} className="ml-2 rounded bg-primary px-3 py-2 text-primary-foreground">Create</button></section>}
      <section className="grid gap-3 rounded border p-5">
        <div>
          <h2 className="text-xl font-semibold">New interview</h2>
          <p className="mt-1 text-xs text-muted-foreground">Panel demo: one project, five roles. Aim for about 3 minutes with brief answers; up to 5 minutes for pauses.</p>
          <p className="mt-1 text-xs text-muted-foreground">Hiring Manager → Technical → Product Manager → Customer → Behavioural. Ends after all five answers.</p>
        </div>
        <input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} className="rounded border p-2 text-black"/>
        <textarea value={jdText} onChange={(event) => setJdText(event.target.value)} rows={5} className="rounded border p-2 text-black"/>
        <textarea value={outcomes} onChange={(event) => setOutcomes(event.target.value)} rows={3} className="rounded border p-2 text-black"/>
        <button onClick={createInterview} className="w-fit rounded bg-primary px-4 py-2 text-primary-foreground">Create and generate plan</button>
      </section>
      <p className="break-all rounded bg-muted p-3 text-sm">{message}</p>
      <section><h2 className="text-xl font-semibold">Interviews</h2><div className="mt-3 grid gap-3">{interviews.map((item) => <article key={item.id} className="rounded border p-4"><div className="flex items-center justify-between"><div><div className="font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.status}</div></div><button disabled={item.status !== 'ready'} onClick={() => publish(item.id)} className="rounded border px-3 py-2 text-sm disabled:opacity-40">Publish invitation</button></div><div className="mt-3 space-y-2">{sessions.filter((entry) => entry.interviewId === item.id).map((entry) => <div key={entry.id} className="flex items-center justify-between rounded bg-muted px-3 py-2 text-xs"><span>{entry.status} · {entry.health}</span>{entry.status === 'completed' && <button onClick={() => viewResult(entry.id)} className="underline">View evidence report</button>}</div>)}</div></article>)}</div></section>
      {selectedResult && <section className="rounded border p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Completed interview evidence</h2><button onClick={releaseFeedback} className="rounded border px-3 py-2 text-xs">Release candidate summary</button></div><pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(selectedResult, null, 2)}</pre></section>}
    </main>
  );
}
