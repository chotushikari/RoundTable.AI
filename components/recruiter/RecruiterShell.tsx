import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/brand/Wordmark';

/**
 * Shared chrome for the recruiter surface: header with wordmark + a small
 * "Recruiter" marker, and a constrained content column. Kept deliberately quiet
 * — the data is the interface here, not the frame.
 */
export function RecruiterShell({
  children,
  breadcrumb,
}: {
  children: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-[min(96vw,80rem)] items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Wordmark href="/" />
            <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Recruiter
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/recruiter" className="transition-colors hover:text-foreground">
              Interviews
            </Link>
            <Link
              href="/interview"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Run one
            </Link>
          </nav>
        </div>
      </header>

      {breadcrumb && (
        <div className="border-b border-border/70 bg-surface">
          <div className="mx-auto w-[min(96vw,80rem)] px-2 py-2.5 text-sm text-muted-foreground">
            {breadcrumb}
          </div>
        </div>
      )}

      <main className="mx-auto w-[min(96vw,80rem)] px-2 py-8">{children}</main>
    </div>
  );
}
