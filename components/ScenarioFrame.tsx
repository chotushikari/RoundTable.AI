'use client';

import { Users, AlertTriangle } from 'lucide-react';

interface ScenarioFrameProps {
  objective: string;
  role: string;
  constraints?: string[];
}

export function ScenarioFrame({ objective, role, constraints = [] }: ScenarioFrameProps) {
  return (
    <div className="flex h-full w-full flex-col p-6 animate-fade-up">
      <div className="flex flex-col gap-6 rounded-2xl border border-primary/20 bg-card p-8 shadow-xl relative overflow-hidden">
        {/* Futuristic Background accents */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Interactive Scenario</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground capitalize">
                Roleplay: {role.replace(/_/g, ' ')}
              </h2>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The interviewer has switched to a scenario modality. Please respond as if you are interacting directly with the {role.replace(/_/g, ' ')} in this situation.
          </p>
        </div>

        {/* Current Objective Frame */}
        <div className="relative z-10 flex flex-col gap-3 mt-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Scenario Context</span>
          <p className="text-base font-medium leading-relaxed text-foreground">
            {objective}
          </p>
        </div>

        {/* Dynamic Constraints */}
        {constraints.length > 0 && (
          <div className="relative z-10 mt-2 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" /> Active Constraints
            </span>
            <ul className="flex flex-col gap-2">
              {constraints.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-medium text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
