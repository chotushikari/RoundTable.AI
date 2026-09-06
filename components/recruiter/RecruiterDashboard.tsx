'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Inbox, Loader2 } from 'lucide-react';
import { roleTheme } from '@/lib/interview/roleTheme';
import type { RoleKind } from '@/lib/interview/types';

type InterviewSummary = {
  id: string;
  created_at: string | null;
  phase: string;
  active_role: RoleKind;
  version: number;
  event_count: number;
  avg_belief: number | null;
  avg_confidence: number | null;
};

const PHASE_LABEL: Record<string, string> = {
  warm: 'Warming up',
  discovery: 'Discovery',
  deepening: 'Deepening',
  cross_functional: 'Cross-functional',
  verification: 'Verification',
  closing: 'Closing',
};

export function RecruiterDashboard() {
  const [interviews, setInterviews] = useState<InterviewSummary[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/recruiter/interviews');
        const data = await res.json();
        if (cancelled) return;
        setConfigured(data.configured !== false);
        setInterviews(data.interviews ?? []);
      } catch {
        if (!cancelled) setError('Could not load interviews.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Interviews
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every session, with a live read of how it&apos;s going.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!interviews && !error && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading interviews…
        </div>
      )}

      {interviews && interviews.length === 0 && (
        <EmptyState configured={configured} />
      )}

      {interviews && interviews.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Interview</th>
                <th className="px-5 py-3 font-medium">Phase</th>
                <th className="px-5 py-3 font-medium">Active lens</th>
                <th className="px-5 py-3 font-medium">Overall read</th>
                <th className="px-5 py-3 font-medium">Events</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => {
                const t = roleTheme(iv.active_role);
                return (
                  <tr
                    key={iv.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/recruiter/${iv.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {iv.id.slice(0, 8)}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {iv.created_at
                          ? new Date(iv.created_at).toLocaleString()
                          : '—'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {PHASE_LABEL[iv.phase] ?? iv.phase}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${t.tint} ${t.border} ${t.text}`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: t.hex }}
                        />
                        {t.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {iv.avg_belief != null ? (
                        <MiniRead
                          belief={iv.avg_belief}
                          confidence={iv.avg_confidence ?? 0}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-muted-foreground">
                      {iv.event_count}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/recruiter/${iv.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniRead({ belief, confidence }: { belief: number; confidence: number }) {
  const pct = Math.round(belief * 100);
  const opacity = 0.35 + confidence * 0.65;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground"
          style={{ width: `${pct}%`, opacity }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

function EmptyState({ configured }: { configured: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No interviews yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {configured
            ? 'Run a live interview and it will show up here in real time.'
            : 'Connect Supabase to persist and list interviews.'}
        </p>
      </div>
      <Link
        href="/interview"
        className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Start an interview
      </Link>
    </div>
  );
}
