'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import { Activity, ArrowLeft, BriefcaseBusiness, CheckCircle2, Clipboard, FileCheck2, FileText, LogOut, Plus, Radio, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { DEMO_DURATION_MINUTES, DEMO_ROLES } from '@/lib/interview-demo';
import { CompanyInterviewReportView } from '@/components/CompanyInterviewReportView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyInterviewReport } from '@/types/interview';
import styles from './CompanyDashboard.module.css';

type Interview = { id: string; title: string; roleTitle: string; status: string; createdAt: string };
type SessionSummary = { id: string; status: string; health: string; startedAt: string; completedAt: string | null; interviewId: string };
const roleNames: Record<string, string> = { hiring_manager: 'Hiring Manager', technical: 'Technical', product: 'Product Manager', customer: 'Customer', behavioral: 'Behavioural' };

function isReport(value: unknown): value is CompanyInterviewReport {
  return Boolean(value && typeof value === 'object' && 'candidate' in value && 'competencies' in value && 'transcript' in value && 'workspace' in value);
}

export function CompanyDashboard() {
  const companyAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_COMPANY_AUTH === 'true';
  const supabase = useMemo(() => {
    if (companyAuthDisabled || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, [companyAuthDisabled]);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedResult, setSelectedResult] = useState<Record<string, unknown> | null>(null);
  const [roleTitle, setRoleTitle] = useState('Software Engineer Intern (0 years experience)');
  const [jdText, setJdText] = useState('Entry-level internship with no professional experience required. Use Python, JavaScript, or TypeScript. Assess basic problem solving, simple functions, a small to-do app design, communication, and willingness to learn. Accept class assignments and personal projects. Keep questions beginner-friendly; do not require distributed systems or production experience.');
  const [outcomes, setOutcomes] = useState('Write a simple function and explain an edge case\nDraw a simple app with a client, server, and database\nExplain how the app helps a user\nCommunicate clearly and learn from feedback');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resumeTexts, setResumeTexts] = useState<Record<string, string>>({});
  const [resumeNames, setResumeNames] = useState<Record<string, string>>({});
  const accessToken = session?.access_token;
  const authHeaders: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const load = useCallback(async () => {
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const response = await fetch('/api/interviews', { headers });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Could not load interviews'); return; }
    setInterviews(data.interviews);
    setOrganizationId(data.organizationId);
    const lists = await Promise.all((data.interviews as Interview[]).map(async (item) => {
      const result = await fetch(`/api/interviews/${item.id}/sessions`, { headers });
      const body = await result.json();
      return result.ok ? (body.sessions as Omit<SessionSummary, 'interviewId'>[]).map((entry) => ({ ...entry, interviewId: item.id })) : [];
    }));
    setSessions(lists.flat());
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
    const channel = supabase.channel(`organization:${organizationId}:status`, { config: { private: true } }).on('broadcast', { event: '*' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, organizationId, session, supabase]);

  const stats = useMemo(() => ({
    active: sessions.filter((item) => ['starting', 'active'].includes(item.status)).length,
    completed: sessions.filter((item) => item.status === 'completed').length,
  }), [sessions]);

  async function magicLink() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/company` } });
    setMessage(error ? error.message : 'Check your email for the secure sign-in link.');
  }
  async function createOrganization() {
    const response = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ name: organizationName }) });
    const data = await response.json();
    setMessage(response.ok ? 'Organization created.' : data.error);
    if (response.ok) await load();
  }
  async function createInterview() {
    setIsCreating(true);
    setMessage('Creating your adaptive interview plan...');
    try {
      const response = await fetch('/api/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ roleTitle, jdText, desiredOutcomes: outcomes.split('\n').map((item) => item.trim()).filter(Boolean), panelRoles: DEMO_ROLES, mustAskQuestions: [], durationMinutes: DEMO_DURATION_MINUTES, demoMode: true }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error); return; }
      const plan = await fetch(`/api/interviews/${data.interview.id}/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: '{}' });
      const planData = await plan.json();
      setMessage(plan.ok ? 'Interview plan is ready. Publish it when you are ready to invite a candidate.' : planData.error);
      await load();
    } finally { setIsCreating(false); }
  }
  async function publish(id: string) {
    const response = await fetch(`/api/interviews/${id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ resumeText: resumeTexts[id] || undefined }) });
    const data = await response.json();
    setMessage(response.ok ? 'Invitation copied. Share it with your candidate.' : data.error);
    if (response.ok) { await navigator.clipboard?.writeText(data.invitationUrl); setCopiedId(id); window.setTimeout(() => setCopiedId(null), 2400); await load(); }
  }
  async function viewResult(id: string) {
    const response = await fetch(`/api/sessions/${id}/report`, { headers: authHeaders });
    const data = await response.json();
    setSelectedResult(response.ok ? (data.report ?? data) : { error: data.error });
  }
  async function releaseFeedback() {
    const selectedSession = selectedResult?.session as { id?: unknown } | undefined;
    if (typeof selectedSession?.id !== 'string') return;
    const response = await fetch(`/api/sessions/${selectedSession.id}/release`, { method: 'POST', headers: authHeaders });
    const data = await response.json();
    setMessage(response.ok ? 'Candidate summary released.' : data.error);
    if (response.ok) await viewResult(selectedSession.id);
  }

  if (supabase && !session) return (
    <main className={styles.authPage}>
      <Link href="/" className={styles.backLink}><ArrowLeft size={15} /> Back to RoundTable</Link>
      <Card className={styles.authCard}><CardHeader><span className={styles.brand}><i /> RoundTable AI</span><CardTitle className={styles.authTitle}>Company sign in</CardTitle><p className={styles.muted}>We will send a secure sign-in link to your work email.</p></CardHeader><CardContent><label className={styles.field}><span>Work email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label><Button onClick={magicLink} className={styles.fullButton}>Send secure link</Button>{message && <p className={styles.authMessage}>{message}</p>}</CardContent></Card>
    </main>
  );

  return <div className={styles.page}>
    <header className={styles.topbar}><Link href="/" className={styles.brand}><i /> RoundTable AI</Link><div className={styles.topActions}><span className={styles.secure}><ShieldCheck size={14} /> Evidence-first assessment</span>{supabase && <Button variant="outline" size="sm" onClick={() => void supabase.auth.signOut()}><LogOut size={14} /> Sign out</Button>}</div></header>
    <main className={styles.shell}>
      <section className={styles.hero}><div><span className={styles.eyebrow}>COMPANY WORKSPACE</span><h1>Interview command center</h1><p>Create a five-perspective voice interview, share one link, and review grounded evidence when it ends.</p></div><div className={styles.livePill}><span /> Systems ready</div></section>
      <section className={styles.metrics} aria-label="Interview statistics">
        <Card className={styles.metricCard}><BriefcaseBusiness /><div><strong>{interviews.length}</strong><span>Interviews</span></div></Card>
        <Card className={styles.metricCard}><Radio /><div><strong>{stats.active}</strong><span>Live now</span></div></Card>
        <Card className={styles.metricCard}><FileCheck2 /><div><strong>{stats.completed}</strong><span>Completed</span></div></Card>
        <Card className={styles.metricCard}><Users /><div><strong>5</strong><span>Panel perspectives</span></div></Card>
      </section>
      {message.includes('membership') && <Card className={styles.organizationCard}><div><strong>Create your organization</strong><span>Set up the private workspace before creating interviews.</span></div><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Organization name" /><Button onClick={createOrganization}>Create workspace</Button></Card>}
      {message && !message.includes('membership') && <div className={styles.notice} role="status"><Sparkles size={16} /><span>{message}</span></div>}
      <section className={styles.dashboardGrid}>
        <Card className={styles.panel}><CardHeader className={styles.cardHeading}><div><span className={styles.sectionLabel}>NEW INTERVIEW</span><CardTitle>Create an adaptive panel</CardTitle></div><span className={styles.duration}>{DEMO_DURATION_MINUTES} min</span></CardHeader><CardContent className={styles.form}>
          <label className={styles.field}><span>Role</span><input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} /></label>
          <label className={styles.field}><span>What should the panel understand?</span><textarea value={jdText} onChange={(event) => setJdText(event.target.value)} rows={6} /></label>
          <label className={styles.field}><span>Desired outcomes <small>one per line</small></span><textarea value={outcomes} onChange={(event) => setOutcomes(event.target.value)} rows={5} /></label>
          <div className={styles.panelBlock}><span>Automatic panel sequence</span><div className={styles.roleChips}>{DEMO_ROLES.map((role, index) => <span key={role}><b>{index + 1}</b>{roleNames[role] ?? role}</span>)}</div></div>
          <Button onClick={createInterview} disabled={isCreating || !roleTitle.trim() || !jdText.trim()} className={styles.createButton}>{isCreating ? <><Activity className={styles.spin} size={17} /> Generating plan</> : <><Plus size={17} /> Create interview</>}</Button>
        </CardContent></Card>
        <Card className={styles.panel}><CardHeader className={styles.cardHeading}><div><span className={styles.sectionLabel}>PIPELINE</span><CardTitle>Your interviews</CardTitle></div><span className={styles.duration}>{interviews.length}</span></CardHeader><CardContent className={styles.interviewList}>
          {interviews.length === 0 && <div className={styles.emptyState}><BriefcaseBusiness /><strong>No interviews yet</strong><span>Your first interview will appear here.</span></div>}
          {interviews.map((item) => { const itemSessions = sessions.filter((entry) => entry.interviewId === item.id); return <article key={item.id} className={styles.interviewItem}><div className={styles.interviewTitleRow}><div><strong>{item.title}</strong><span>{new Date(item.createdAt).toLocaleDateString()}</span></div><span className={`${styles.status} ${styles[`status_${item.status}`] ?? ''}`}>{item.status}</span></div><p>{item.roleTitle}</p>{item.status === 'ready' && <label className={styles.resumeUpload}><FileText size={15}/><span><strong>{resumeNames[item.id] || 'Attach candidate resume'}</strong><small>Optional TXT or Markdown, added before publishing</small></span><input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 120_000) { setMessage('Resume file is too large. Use a TXT or Markdown file under 120 KB.'); return; } void file.text().then((text) => { setResumeTexts((current) => ({ ...current, [item.id]: text.slice(0, 30_000) })); setResumeNames((current) => ({ ...current, [item.id]: file.name })); }); }}/></label>}<Button variant="outline" size="sm" disabled={item.status !== 'ready'} onClick={() => publish(item.id)}>{copiedId === item.id ? <><CheckCircle2 size={14} /> Copied</> : <><Clipboard size={14} /> Publish invitation</>}</Button>{itemSessions.length > 0 && <div className={styles.sessionList}>{itemSessions.map((entry) => <div key={entry.id} className={styles.sessionRow}><span><i className={entry.health === 'healthy' ? styles.healthy : styles.warning} />{entry.status} · {entry.health}</span>{entry.status === 'completed' && <button onClick={() => viewResult(entry.id)}>View report</button>}</div>)}</div>}</article>; })}
        </CardContent></Card>
      </section>
      {selectedResult && <section className={styles.report}>{isReport(selectedResult) ? <CompanyInterviewReportView report={selectedResult} onRelease={releaseFeedback} /> : <Card className={styles.errorCard}><CardTitle>Completed interview report</CardTitle><pre>{JSON.stringify(selectedResult, null, 2)}</pre></Card>}</section>}
    </main>
  </div>;
}
