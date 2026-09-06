'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
  interview?: {
    roleTitle: string;
    companyName?: string;
    durationMinutes: number;
    panelRoles: string[];
    demoMode?: boolean;
  } | null;
  requiresConsent?: boolean;
  consent?: boolean;
  onConsentChange?: (consent: boolean) => void;
  onResumeTextChange?: (resumeText: string) => void;
};

export function QuickstartPreCallCard({
  isLoading,
  error,
  onStartConversation,
  interview,
  requiresConsent = false,
  consent = false,
  onConsentChange,
  onResumeTextChange,
}: QuickstartPreCallCardProps) {
  return (
    <div
      className="relative mx-auto flex w-[min(92vw,28rem)] animate-fade-up flex-col items-center rounded-3xl p-1 shadow-2xl overflow-hidden glass"
    >
      {/* Animated gradient border */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/50 via-background to-accent/50 opacity-20" />
      <div className="absolute -left-1/2 top-0 h-[200%] w-[200%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0_340deg,hsl(var(--primary))_360deg)] opacity-20" style={{ animationDuration: '8s' }} />
      
      <div className="relative z-10 flex w-full flex-col items-center rounded-[22px] bg-card/90 px-10 py-10 text-center backdrop-blur-xl">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-[0_0_30px_hsl(var(--primary)/0.3)] ring-1 ring-primary/30">
          <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {interview ? `${interview.roleTitle}` : 'Try Agora\'s Voice Agent'}
        </h1>
        {interview && (
          <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-primary">
            {interview.companyName ?? 'The Hiring Company'}
          </div>
        )}
        
        <p className="mt-5 text-sm font-medium leading-relaxed text-muted-foreground">
          {interview
            ? `${interview.demoMode ? `One short answer per role; aim for 15–20 seconds each. Finishes after the panel, up to ${interview.durationMinutes} minutes` : `${interview.durationMinutes} minutes`} with ${interview.panelRoles.length} AI panel roles. A human reviews the evidence; the AI never makes a hiring decision.`
            : `Built on Agora's flagship Conversational AI engine, for effortless agentic conversations.`}
        </p>

      {requiresConsent && (
        <>
        <label className="mt-6 flex items-start gap-3 text-left text-xs leading-5 text-muted-foreground">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => onConsentChange?.(event.target.checked)}
            className="mt-1"
          />
          <span>I understand that I am speaking with an AI interview panel, the transcript and workspace evidence are retained for 30 days, raw audio/video is not recorded, and a human review is required.</span>
        </label>
        <label className="mt-4 w-full text-left text-xs text-muted-foreground">
          Optional resume (.txt or .md)
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="mt-2 block w-full text-xs"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void file.text().then((text) => onResumeTextChange?.(text));
            }}
          />
        </label>
        </>
      )}

        <Button
          onClick={onStartConversation}
          disabled={isLoading || (requiresConsent && !consent)}
          className="group relative mt-10 h-12 w-full overflow-hidden rounded-xl border border-primary/50 bg-primary/10 text-sm font-bold text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary disabled:hover:shadow-none"
          aria-label={isLoading ? 'Starting conversation' : 'Start conversation'}
        >
          <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
            <div className="relative h-full w-8 bg-white/20" />
          </div>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Starting...
            </span>
          ) : (
            interview ? 'Start AI Interview' : 'Start Conversation'
          )}
        </Button>
        {error && <p className="mt-4 text-xs font-semibold text-destructive">{error}</p>}
      </div>
    </div>
  );
}
