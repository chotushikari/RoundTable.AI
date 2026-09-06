'use client';

import { useState } from 'react';
import { Loader2, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FiveFacesOrb } from '@/components/brand/FiveFacesOrb';
import { Wordmark } from '@/components/brand/Wordmark';
import { ROLE_ORDER, roleTheme } from '@/lib/interview/roleTheme';

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

/**
 * Candidate entry: a calm welcome + explicit AI disclosure the candidate must
 * acknowledge before the live voice interview begins. Keeps the original
 * onStartConversation contract so the Agora bootstrap is unchanged.
 */
export function QuickstartPreCallCard({
  isLoading,
  error,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="mx-auto flex w-[min(94vw,60rem)] animate-fade-up flex-col items-center gap-8 px-4 py-10 text-center">
      <header className="flex w-full items-center justify-between">
        <Wordmark />
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Adaptive voice interview
        </span>
      </header>

      <FiveFacesOrb size={200} className="mt-2" />

      <div className="max-w-xl space-y-3">
        <h1 className="font-display text-4xl font-semibold leading-[1.1] text-foreground sm:text-5xl">
          Welcome. Let&apos;s have a real conversation.
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          This is a live voice interview. You&apos;ll speak with one interviewer
          whose perspective shifts as you go — from the technical bar to product
          sense to how you handle a tough customer. Answer naturally. You can
          interrupt, think out loud, and take your time.
        </p>
      </div>

      {/* what to expect */}
      <div className="grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
        <ExpectCard
          icon={<Mic className="h-4 w-4" />}
          title="Voice-first"
          body="Just talk. A workspace opens only when there's something to build."
        />
        <ExpectCard
          icon={<Sparkles className="h-4 w-4" />}
          title="Adaptive"
          body="Questions follow your answers and the gaps worth closing."
        />
        <ExpectCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Transparent"
          body="You're talking to an AI interviewer. Nothing is hidden from you."
        />
      </div>

      {/* the five perspectives, named */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ROLE_ORDER.map((role) => {
          const t = roleTheme(role);
          return (
            <span
              key={role}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${t.tint} ${t.border} ${t.text}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.hex }} />
              {t.label}
            </span>
          );
        })}
      </div>

      {/* AI disclosure gate */}
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface-elevated p-5 text-left shadow-sm">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-foreground"
          />
          <span>
            I understand this interview is conducted by an AI, and my responses
            will be recorded and assessed.
          </span>
        </label>

        <Button
          onClick={onStartConversation}
          disabled={isLoading || !acknowledged}
          className="h-11 w-full rounded-xl text-sm font-medium"
          aria-label={
            isLoading ? 'Starting your interview' : 'Start your interview'
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </>
          ) : (
            'Start interview'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Works best with a headset in a quiet room. We&apos;ll ask for your
          microphone next.
        </p>
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function ExpectCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}
