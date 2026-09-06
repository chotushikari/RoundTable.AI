'use client';

import { useMemo } from 'react';
import type { InterviewSessionRecord, TurnAnalysisRecord } from '@/types/interview';
import { CompetencyRadar } from './CompetencyRadar';
import { CheckCircle2, AlertTriangle, Info, BrainCircuit, Activity, Target, Workflow, Scale, Zap, Clock, ShieldAlert } from 'lucide-react';

interface JudgePanelProps {
  session: InterviewSessionRecord | null;
  latestAnalysis: TurnAnalysisRecord | null;
}

export function JudgePanel({ session, latestAnalysis }: JudgePanelProps) {
  const challengeVector = session?.challengeVector;
  const contradictions = session?.accumulatedContradictions ?? [];
  const openContradictions = contradictions.filter(c => !c.resolved);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border/40 bg-surface/30 p-8 text-center text-sm text-muted-foreground backdrop-blur-md">
        Waiting for session data...
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-6 overflow-y-auto pr-2 md:grid-cols-12">
      {/* Left Column: Live State & Radar */}
      <div className="flex flex-col gap-6 md:col-span-5 lg:col-span-4">
        <div className="flex flex-col rounded-xl border border-border/40 bg-card p-6 shadow-sm backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <BrainCircuit className="h-4 w-4 text-primary" />
              Candidate State
            </h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20">
              Live
            </span>
          </div>
          
          <div className="flex justify-center pb-8 pt-4">
            <CompetencyRadar competencies={session.competencyState} size={280} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Active Role</span>
              <span className="text-sm font-medium capitalize text-foreground">{session.activeRole.replace('_', ' ')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Modality</span>
              <span className="text-sm font-medium capitalize text-foreground">{session.currentModality}</span>
            </div>
          </div>
        </div>

        {/* Challenge Vector */}
        <div className="flex flex-col rounded-xl border border-border/40 bg-card p-6 shadow-sm backdrop-blur-md">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Challenge Vector
          </h3>
          
          {challengeVector ? (
            <div className="space-y-4">
              <VectorBar label="Technical Depth" value={challengeVector.technicalDepth} icon={<Workflow className="h-3 w-3" />} />
              <VectorBar label="Ambiguity" value={challengeVector.ambiguity} icon={<Info className="h-3 w-3" />} />
              <VectorBar label="Scale" value={challengeVector.scale} icon={<Activity className="h-3 w-3" />} />
              <VectorBar label="Edge Case Complexity" value={challengeVector.edgeCaseComplexity} icon={<ShieldAlert className="h-3 w-3" />} />
              <VectorBar label="Business Complexity" value={challengeVector.businessComplexity} icon={<Scale className="h-3 w-3" />} />
              <VectorBar label="Time Pressure" value={challengeVector.timePressure} icon={<Clock className="h-3 w-3" />} />
              <VectorBar label="Cross-Functional" value={challengeVector.crossFunctionalComplexity} icon={<Zap className="h-3 w-3" />} />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Vector not yet initialized.</div>
          )}
        </div>
      </div>

      {/* Right Column: Reasoning & Events */}
      <div className="flex flex-col gap-6 md:col-span-7 lg:col-span-8">
        
        {/* Orchestrator Reasoning */}
        <div className="flex flex-col rounded-xl border border-border/40 bg-card p-6 shadow-sm backdrop-blur-md">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <Workflow className="h-4 w-4 text-primary" />
            Why this action?
          </h3>
          
          {latestAnalysis ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4 rounded-lg bg-surface/50 p-4 ring-1 ring-border/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
                  <span className="text-xs font-bold uppercase">{session.activeRole[0]}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
                      {latestAnalysis.decision.reasonCode.replace(/_/g, ' ')}
                    </span>
                    {latestAnalysis.decision.roleHandoff && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent ring-1 ring-accent/20">
                        Handoff
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {latestAnalysis.decision.objective}
                  </p>
                  {latestAnalysis.analysis.vague && (
                    <div className="mt-1 flex items-start gap-2 text-xs text-amber-500">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{latestAnalysis.analysis.vagueReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Turn Evidence Highlights */}
              {latestAnalysis.analysis.competencyEvidence.some(e => e.rating) && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Turn Evidence Extracted</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {latestAnalysis.analysis.competencyEvidence.filter(e => e.rating).map((evidence, i) => (
                      <div key={i} className="flex flex-col gap-1.5 rounded-md bg-surface/30 p-3 ring-1 ring-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold capitalize text-foreground">{evidence.competencyId.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] font-bold text-primary">Score: {evidence.rating}/4</span>
                        </div>
                        <p className="text-[11px] italic leading-relaxed text-muted-foreground">"{evidence.quote}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderDots /> Awaiting first candidate turn...
            </div>
          )}
        </div>

        {/* Accumulated Contradictions */}
        <div className="flex flex-col rounded-xl border border-border/40 bg-card p-6 shadow-sm backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Accumulated Contradictions
            </h3>
            {openContradictions.length > 0 && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive ring-1 ring-inset ring-destructive/20">
                {openContradictions.length} Active
              </span>
            )}
          </div>
          
          {contradictions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {contradictions.map((c, i) => (
                <div key={i} className={`flex flex-col gap-2 rounded-lg p-4 ring-1 ${c.resolved ? 'bg-surface/30 ring-border/30' : 'bg-destructive/5 ring-destructive/20'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-destructive">Contradiction Detected</span>
                    {c.resolved ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-500">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        <AlertTriangle className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{c.explanation}</p>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Prior Claim</span>
                      <p className="text-[11px] italic text-muted-foreground">"{c.priorQuote}"</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Current Claim</span>
                      <p className="text-[11px] italic text-foreground">"{c.currentQuote}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              No contradictions detected in this session.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function VectorBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const percentage = (value / 5) * 100;
  
  // Color scale based on difficulty
  const getColor = (val: number) => {
    if (val <= 2) return 'bg-blue-500';
    if (val === 3) return 'bg-primary';
    if (val === 4) return 'bg-amber-500';
    return 'bg-destructive';
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {icon} <span>{label}</span>
        </div>
        <span className="text-[10px] font-bold text-foreground">{value}/5</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div 
          className={`h-full ${getColor(value)} shadow-[0_0_8px_currentColor] transition-all duration-500 ease-out opacity-80`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function LoaderDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '300ms' }} />
    </span>
  );
}
