'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { InterviewWorkspace } from './InterviewWorkspace';

type QuickstartConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
  activeModality?: 'voice' | 'code' | 'canvas' | 'scenario';
  sessionId?: string;
  timeRemainingSeconds?: number | null;
  activeRole?: string;
  activePhase?: string;
  demoProgress?: { roles: string[]; answeredRoles: string[]; closing: boolean } | null;
};

export function QuickstartConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  visualizer,
  controls,
  onEndConversation,
  activeModality = 'voice',
  sessionId,
  timeRemainingSeconds,
  activeRole = 'technical',
  activePhase = 'introduction',
  demoProgress,
}: QuickstartConversationLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-border/40 bg-surface/50 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)] ring-1 ring-primary/30">
            <Image
              src="/agora-logo-mark.svg"
              alt="Agora"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-foreground">RoundTable Panel</span>
              {statusPanel}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="text-primary">{activeRole.replace('_', ' ')}</span>
              <span>•</span>
              <span>{activePhase.replace('_', ' ')}</span>
              {demoProgress && (
                <>
                  <span>•</span>
                  <span>{demoProgress.closing ? 'Wrap-up' : `${demoProgress.answeredRoles.length}/${demoProgress.roles.length} Roles`}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {timeRemainingSeconds !== null && timeRemainingSeconds !== undefined && (
            <div className="flex items-center gap-2 rounded-lg bg-surface/50 px-3 py-1.5 ring-1 ring-border/50">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              <span className="text-xs font-bold tabular-nums text-foreground">
                {Math.floor(timeRemainingSeconds / 60)}:{String(timeRemainingSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          )}
          
          <Button
            variant="ghost"
            className="h-10 rounded-xl border border-destructive/30 text-xs font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_15px_hsl(var(--destructive)/0.3)] transition-all"
            onClick={onEndConversation}
          >
            End Interview
          </Button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col gap-6 p-6 lg:flex-row">
        {/* Background glow effects */}
        <div className="absolute left-0 top-0 -z-10 h-full w-full opacity-30">
          <div className="absolute top-1/4 -left-1/4 h-[50vh] w-[50vh] animate-float rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute bottom-1/4 -right-1/4 h-[50vh] w-[50vh] animate-float rounded-full bg-accent/20 blur-[100px]" style={{ animationDelay: '-3s' }} />
        </div>

        {/* Transcript Rail */}
        <aside className="flex h-64 min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/40 bg-surface/30 shadow-lg backdrop-blur-md lg:h-full lg:w-[22rem]">
          <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Transcript</span>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            {transcriptPanel}
          </div>
        </aside>

        {/* Main Agent / Workspace Area */}
        <main className={`flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-border/40 bg-surface/30 p-6 shadow-lg backdrop-blur-md ${activeModality === 'code' ? 'lg:w-[22rem] lg:flex-none' : ''}`}>
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center pb-8 pt-4">
            <div className="relative flex items-center justify-center transition-all duration-500 ease-out">
              {visualizer}
            </div>
            
            <div className="mt-8 flex w-full max-w-2xl shrink-0 flex-col items-center gap-4">
              {pipelineMetrics}
              {controls}
            </div>
          </div>
        </main>

        {/* Workspace Modality Frame (Dynamic sizing) */}
        {(activeModality === 'code' || activeModality === 'canvas' || activeModality === 'scenario') && sessionId && (
          <aside className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xl lg:h-full">
            <InterviewWorkspace sessionId={sessionId} activeModality={activeModality} />
          </aside>
        )}
      </div>
    </div>
  );
}
