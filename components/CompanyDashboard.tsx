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
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full max-w-md animate-fade-up flex-col gap-6 rounded-2xl border border-border/40 bg-card p-8 shadow-2xl glass">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Company Sign In</h1>
            <p className="text-sm font-medium text-muted-foreground">Authenticate to access the RoundTable command center.</p>
          </div>
          <div className="flex flex-col gap-4">
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-border/50 bg-surface p-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="you@company.com" />
            <button onClick={magicLink} className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]">Send Magic Link</button>
          </div>
          {message && <p className="text-center text-xs font-medium text-primary">{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6 lg:p-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Command Center</h1>
        <p className="text-sm font-medium text-muted-foreground">Orchestrate adaptive AI panels and monitor live candidate telemetry.</p>
      </header>

      {message.includes('membership') && (
        <section className="animate-fade-up rounded-2xl border border-border/40 bg-surface/50 p-6 glass">
          <h2 className="text-lg font-semibold text-foreground">Create your organization</h2>
          <div className="mt-4 flex gap-3">
            <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="flex-1 rounded-xl border border-border/50 bg-background p-3 text-sm text-foreground" placeholder="Organization name"/>
            <button onClick={createOrganization} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90">Create</button>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Create Interview */}
        <section className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-card p-6 shadow-xl lg:col-span-5 glass">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">New Mission</h2>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              Define the role, context, and outcomes. The orchestrator will dynamically synthesize an adaptive interview plan.
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role Title</label>
              <input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} className="rounded-xl border border-border/50 bg-surface/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Context / Job Description</label>
              <textarea value={jdText} onChange={(event) => setJdText(event.target.value)} rows={4} className="rounded-xl border border-border/50 bg-surface/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Desired Outcomes (one per line)</label>
              <textarea value={outcomes} onChange={(event) => setOutcomes(event.target.value)} rows={3} className="rounded-xl border border-border/50 bg-surface/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            
            <button onClick={createInterview} className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              Generate Plan
            </button>
          </div>
        </section>

        {/* Right Column: Active Interviews & Telemetry */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {message && !message.includes('membership') && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm font-medium text-primary shadow-sm backdrop-blur-md">
              {message}
            </div>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Active Campaigns</h2>
            <div className="flex flex-col gap-4">
              {interviews.length === 0 ? (
                <div className="rounded-2xl border border-border/40 bg-surface/30 p-8 text-center text-sm font-medium text-muted-foreground">
                  No active campaigns. Create a new mission to begin.
                </div>
              ) : (
                interviews.map((item) => (
                  <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-5 shadow-lg transition-all hover:border-primary/30">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-foreground">{item.title}</h3>
                        <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.status === 'ready' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {item.status}
                        </span>
                      </div>
                      <button disabled={item.status !== 'ready'} onClick={() => publish(item.id)} className="rounded-lg bg-surface/50 px-3 py-1.5 text-xs font-bold text-foreground ring-1 ring-border/50 transition-all hover:bg-primary/20 hover:text-primary hover:ring-primary/30 disabled:opacity-30">
                        Publish Link
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-border/30 pt-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Telemetry</span>
                      {sessions.filter((entry) => entry.interviewId === item.id).length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No candidates yet.</span>
                      ) : (
                        sessions.filter((entry) => entry.interviewId === item.id).map((entry) => (
                          <div key={entry.id} className="group flex items-center justify-between rounded-xl bg-surface/50 px-4 py-3 ring-1 ring-border/50 transition-all hover:bg-surface hover:ring-primary/30">
                            <div className="flex items-center gap-3">
                              <span className="relative flex h-2.5 w-2.5">
                                {entry.status === 'in_progress' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>}
                                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${entry.status === 'completed' ? 'bg-green-500' : entry.status === 'in_progress' ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
                              </span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">{entry.status.replace('_', ' ')}</span>
                                <span className="text-[10px] font-medium text-muted-foreground">Health: {entry.health}</span>
                              </div>
                            </div>
                            <a href={`/company/sessions/${entry.id}`} className="rounded-md px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10">
                              {entry.status === 'completed' ? 'View Report' : 'Live Panel'}
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
