'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Radio } from 'lucide-react';
import { BeliefBar } from '@/components/brand/BeliefBar';
import { FiveFacesOrb } from '@/components/brand/FiveFacesOrb';
import { roleTheme } from '@/lib/interview/roleTheme';
import type { CandidateState, RoleKind } from '@/lib/interview/types';

type Decision = {
  occurred_at: string | null;
  sequence: number | null;
  role?: RoleKind;
  competency?: string;
  objective?: string;
  reason_code?: string;
  question_type?: string;
  modality?: string;
};

type TranscriptLine = {
  occurred_at: string | null;
  speaker?: string;
  role?: RoleKind;
  text?: string;
};

type ControlRoomData = {
  ok: boolean;
  configured: boolean;
  interview_id: string;
  state: CandidateState | null;
  decisions: Decision[];
  transcript: TranscriptLine[];
  event_count?: number;
};

const COMPETENCY_LABEL: Record<string, string> = {
  technical_reasoning: 'Technical reasoning',
  system_design: 'System design',
  coding_implementation: 'Coding',
  debugging: 'Debugging',
  product_thinking: 'Product thinking',
  customer_orientation: 'Customer orientation',
  communication: 'Communication',
  ownership: 'Ownership',
  behavioral: 'Behavioural',
};

// Which role "owns" a competency — used to color its belief bar.
const COMPETENCY_ROLE: Record<string, RoleKind> = {
  technical_reasoning: 'technical',
  system_design: 'technical',
  coding_implementation: 'technical',
  debugging: 'technical',
  product_thinking: 'product',
  customer_orientation: 'customer',
  communication: 'manager',
  ownership: 'manager',
  behavioral: 'behavioral',
};

const PHASE_LABEL: Record<string, string> = {
  warm: 'Warming up',
  discovery: 'Discovery',
  deepening: 'Deepening',
  cross_functional: 'Cross-functional',
  verification: 'Verification',
  closing: 'Closing',
};

const POLL_MS = 4000;

export function ControlRoom({ interviewId }: { interviewId: string }) {
  const [data, setData] = useState<ControlRoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/recruiter/interviews/${interviewId}`);
      const json = (await res.json()) as ControlRoomData;
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Could not load this interview.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  useEffect(() => {
    if (!live) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(load, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, interviewId]);

  if (!data && !error) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading Control Room…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const state = data!.state;
  const decisions = [...data!.decisions].reverse(); // newest first
  const latestDecision = decisions[0];
  const activeRole: RoleKind = state?.active_role ?? 'technical';
  const signals = state?.competency_signals ?? {};

  return (
    <div className="space-y-6">
      {/* header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <FiveFacesOrb size={64} activeRole={activeRole} spin={live} />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Control Room
            </h1>
            <p className="text-sm text-muted-foreground">
              {interviewId.slice(0, 8)} ·{' '}
              {PHASE_LABEL[state?.phase ?? 'warm'] ?? state?.phase} · v
              {state?.version ?? 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLive((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              live
                ? 'border-role-manager/40 bg-role-manager/10 text-role-manager'
                : 'border-border bg-surface-elevated text-muted-foreground hover:bg-accent'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {live ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {!data!.configured && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Supabase isn&apos;t configured, so there&apos;s no persisted data to
          show. The layout below is the live Control Room shell.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* left: competency reads */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Competency read
              </h2>
              <span className="text-xs text-muted-foreground">
                belief × confidence
              </span>
            </div>
            {Object.keys(signals).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No signals yet — the read builds as the candidate talks.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(signals)
                  .sort((a, b) => (a[1].confidence ?? 0) - (b[1].confidence ?? 0))
                  .map(([comp, sig]) => {
                    const role = COMPETENCY_ROLE[comp] ?? 'technical';
                    return (
                      <BeliefBar
                        key={comp}
                        label={COMPETENCY_LABEL[comp] ?? comp}
                        belief={sig.belief ?? 0}
                        confidence={sig.confidence ?? 0}
                        accentHex={roleTheme(role).hex}
                      />
                    );
                  })}
              </div>
            )}
          </section>

          {/* transcript */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Transcript
            </h2>
            {data!.transcript.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No final transcript lines yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data!.transcript.map((line, i) => {
                  const isCandidate =
                    (line.speaker ?? '').toLowerCase() === 'candidate' ||
                    !line.role;
                  const t = line.role ? roleTheme(line.role) : null;
                  return (
                    <div key={i} className="flex gap-3 text-sm">
                      <span
                        className="mt-0.5 w-16 shrink-0 text-xs font-medium"
                        style={t ? { color: t.hex } : undefined}
                      >
                        {isCandidate ? 'Candidate' : t?.name ?? 'AI'}
                      </span>
                      <p className="min-w-0 flex-1 leading-6 text-foreground">
                        {line.text ?? ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* right: why-this-question + decision timeline */}
        <div className="space-y-6">
          <WhyThisQuestion decision={latestDecision} />

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Decision timeline
            </h2>
            {decisions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No decisions recorded yet.
              </p>
            ) : (
              <ol className="space-y-3">
                {decisions.map((d, i) => {
                  const role = (d.role ?? 'technical') as RoleKind;
                  const t = roleTheme(role);
                  return (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: t.hex }}
                        />
                        {i < decisions.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: t.hex }}
                          >
                            {t.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {t.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                          {d.objective ??
                            (d.competency
                              ? COMPETENCY_LABEL[d.competency] ?? d.competency
                              : d.reason_code ?? 'Decision')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <p className="px-1 text-center text-xs text-muted-foreground">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function WhyThisQuestion({ decision }: { decision: Decision | undefined }) {
  if (!decision) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Why this question
        </h2>
        <p className="mt-3 text-xs text-muted-foreground">
          Waiting for the first decision from the control plane.
        </p>
      </section>
    );
  }
  const role = (decision.role ?? 'technical') as RoleKind;
  const t = roleTheme(role);
  return (
    <section
      className="rounded-2xl border bg-card p-5"
      style={{ borderColor: `${t.hex}55` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: t.hex }}
        />
        <h2 className="text-sm font-semibold text-foreground">
          Why this question
        </h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">
        {decision.objective ?? 'Closing the least-evidenced competency.'}
      </p>
      <dl className="mt-4 space-y-1.5 text-xs">
        <Row label="Interviewer" value={`${t.name} · ${t.label}`} />
        {decision.competency && (
          <Row
            label="Target"
            value={COMPETENCY_LABEL[decision.competency] ?? decision.competency}
          />
        )}
        {decision.question_type && (
          <Row label="Type" value={decision.question_type} />
        )}
        {decision.reason_code && (
          <Row label="Reason" value={decision.reason_code} mono />
        )}
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`text-right text-foreground ${mono ? 'font-mono text-[11px]' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
