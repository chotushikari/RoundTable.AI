'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
  interview?: {
    roleTitle: string;
    durationMinutes: number;
    panelRoles: string[];
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
      className="mx-auto flex w-[min(92vw,26.25rem)] animate-fade-up flex-col items-center rounded-[20px] border border-[#2b2b2b] px-10 py-10 text-center shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
      style={{
        backgroundImage:
          'linear-gradient(164.988deg, rgba(54,54,54,0.2) 1.0596%, rgba(0,0,0,0) 96.089%), linear-gradient(90deg, rgb(16,16,16) 0%, rgb(16,16,16) 100%)',
      }}
    >
      <h1 className="text-[28px] font-medium leading-[1.2] text-white">
        {interview ? `${interview.roleTitle} Interview` : 'Try Agora\'s Voice Agent'}
      </h1>
      <p className="mt-[14px] text-sm font-medium leading-6 text-muted-foreground">
        {interview
          ? `${interview.durationMinutes} minutes with ${interview.panelRoles.length} AI panel roles. A human reviews the evidence; the AI never makes a hiring decision.`
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
        className="mt-12 h-10 w-full rounded-lg border border-primary bg-primary text-sm font-medium text-black hover:border-white hover:bg-white hover:text-black disabled:hover:border-primary disabled:hover:bg-primary disabled:hover:text-black"
        aria-label={
          isLoading
            ? 'Starting conversation with AI agent'
            : 'Start conversation with AI agent'
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          interview ? 'Start AI Interview' : 'Start Conversation'
        )}
      </Button>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
