'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { FiveFacesOrb } from '@/components/brand/FiveFacesOrb';
import { Wordmark } from '@/components/brand/Wordmark';
import { BeliefBar } from '@/components/brand/BeliefBar';
import { ROLE_ORDER, roleTheme } from '@/lib/interview/roleTheme';

/**
 * Marketing landing (route: /). The signature idea — "five perspectives, one
 * shared brain" — carries the whole page. The hero is the orb, not a stat
 * block. The differentiator (belief × confidence) gets a live demo, not a
 * bullet. Everything else stays quiet so those two moments land.
 */
export function MarketingLanding() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <SharedBrain />
      <SignatureMoment />
      <BeliefConfidence />
      <HowItWorks />
      <ClosingCta />
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────── header ─────────────────────────── */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-[min(94vw,72rem)] items-center justify-between">
        <Wordmark href="/" />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#shared-brain" className="transition-colors hover:text-foreground">
            The panel
          </a>
          <a href="#belief" className="transition-colors hover:text-foreground">
            How we score
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
        </nav>
        <Link
          href="/interview"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start interview
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

/* ──────────────────────────── hero ──────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft role-tinted glow behind the orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
        style={{
          background:
            'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #f59e0b, #14b8a6, #f43f5e, #3b82f6)',
        }}
      />
      <div className="relative mx-auto flex w-[min(94vw,72rem)] flex-col items-center gap-10 px-4 pb-20 pt-20 text-center md:pt-28">
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-role-manager opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-role-manager" />
          </span>
          Live, adaptive voice interviews
        </span>

        <FiveFacesOrb size={260} className="animate-fade-up animate-fade-up-d1" />

        <h1 className="animate-fade-up animate-fade-up-d2 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Five perspectives.
          <br />
          One shared brain.
        </h1>

        <p className="animate-fade-up animate-fade-up-d3 max-w-xl text-lg leading-8 text-muted-foreground">
          RoundTable runs one continuous voice interview where the interviewer&apos;s
          perspective shifts as you go — technical depth, product sense, a tough
          customer, the hiring manager, your track record. One conversation.
          One honest read.
        </p>

        <div className="animate-fade-up animate-fade-up-d4 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/interview"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Try a live interview
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/recruiter"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-surface-elevated px-7 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            See the recruiter view
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── the panel / shared brain ───────────────────── */

function SharedBrain() {
  return (
    <section id="shared-brain" className="border-t border-border/70 bg-surface">
      <div className="mx-auto w-[min(94vw,72rem)] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            A panel that never contradicts itself
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Five separate interviewers each form their own impression, compare
            notes late, and argue in a debrief. RoundTable&apos;s five interviewers
            are one mind. Every perspective writes to the same evolving read of
            you, so the follow-up you get is the one that actually matters next.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ROLE_ORDER.map((role, i) => {
            const t = roleTheme(role);
            return (
              <div
                key={role}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-shadow hover:shadow-sm"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5"
                  style={{ backgroundColor: t.hex }}
                />
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: t.hex }}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {t.label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {t.name}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {t.blurb}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── signature demo moment ─────────────────── */

function SignatureMoment() {
  return (
    <section className="border-t border-border/70">
      <div className="mx-auto w-[min(94vw,72rem)] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Correct isn&apos;t the end of the question
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Watch the hand-off that a single-lens interview can&apos;t do: the
            technical bar accepts a working answer, and the product lens picks it
            up mid-breath.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl space-y-4">
          <TurnBubble
            role="technical"
            text="That LRU cache is right — O(1) get and put, eviction handled. Clean."
            verdict="Accepted"
          />
          <TurnBubble
            role="product"
            text="Sure, it's correct. But the users complaining about stale prices don't care about O(1). What would you actually cache, and what breaks when it's wrong?"
            verdict="Challenging"
          />
        </div>

        <p className="mx-auto mt-8 max-w-md text-center text-sm text-muted-foreground">
          Same brain. Same context. The perspective moved the moment the answer
          was good enough to move on.
        </p>
      </div>
    </section>
  );
}

function TurnBubble({
  role,
  text,
  verdict,
}: {
  role: Parameters<typeof roleTheme>[0];
  text: string;
  verdict: string;
}) {
  const t = roleTheme(role);
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col items-center gap-2 pt-0.5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: t.hex }}
        >
          {t.name.charAt(0)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{t.name}</span>
          <span className="text-xs text-muted-foreground">· {t.label}</span>
          <span
            className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-medium ${t.tint} ${t.border} ${t.text}`}
          >
            {verdict}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-6 text-foreground">{text}</p>
      </div>
    </div>
  );
}

/* ──────────────── belief × confidence differentiator ──────────────── */

function BeliefConfidence() {
  return (
    <section id="belief" className="border-t border-border/70 bg-surface">
      <div className="mx-auto grid w-[min(94vw,72rem)] items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            We separate how strong you are from how sure we are
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Most tools give you a score and hide the uncertainty behind it.
            RoundTable tracks two things for every competency: <strong className="font-medium text-foreground">belief</strong>{' '}
            — how strong we think you are — and <strong className="font-medium text-foreground">confidence</strong> — how
            much evidence justifies that read. A strong belief on thin evidence
            looks appropriately tentative, and the interview spends its time
            closing exactly those gaps.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              'No confident scores built on a single answer',
              'Adaptive questions target the least-evidenced areas',
              'Every judgment is traceable to what you actually said',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-role-manager" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">
              Live competency read
            </span>
            <span className="text-xs text-muted-foreground">mid-interview</span>
          </div>
          <div className="space-y-4">
            <BeliefBar
              label="Technical reasoning"
              belief={0.82}
              confidence={0.74}
              accentHex={roleTheme('technical').hex}
            />
            <BeliefBar
              label="Product thinking"
              belief={0.68}
              confidence={0.31}
              accentHex={roleTheme('product').hex}
            />
            <BeliefBar
              label="Customer orientation"
              belief={0.55}
              confidence={0.18}
              accentHex={roleTheme('customer').hex}
            />
            <BeliefBar
              label="Ownership"
              belief={0.71}
              confidence={0.52}
              accentHex={roleTheme('manager').hex}
            />
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Product thinking reads strong but the evidence is thin — so the next
            question comes from Devin, not another technical probe.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── how it works ─────────────────────── */

function HowItWorks() {
  const steps = [
    {
      title: 'You talk',
      body: 'A live voice conversation, fully interruptible. No forms, no waiting for the next question to load.',
    },
    {
      title: 'The panel adapts',
      body: 'One shared read updates every turn and picks who speaks next — the lens that closes the biggest gap.',
    },
    {
      title: 'A workspace appears',
      body: "When it's time to build something concrete, a code workspace opens mid-conversation. Then it closes again.",
    },
    {
      title: 'An honest report',
      body: 'Belief and confidence per competency, every judgment traceable to a moment in the transcript.',
    },
  ];
  return (
    <section id="how" className="border-t border-border/70">
      <div className="mx-auto w-[min(94vw,72rem)] px-4 py-20 md:py-28">
        <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          One conversation, start to finish
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="bg-card p-6">
              <span className="font-display text-2xl font-semibold text-muted-foreground/50">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── closing CTA ─────────────────────── */

function ClosingCta() {
  return (
    <section className="border-t border-border/70 bg-surface">
      <div className="mx-auto flex w-[min(94vw,72rem)] flex-col items-center gap-8 px-4 py-24 text-center">
        <FiveFacesOrb size={140} spin={false} />
        <h2 className="max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Have the interview that actually reads you
        </h2>
        <p className="max-w-md text-base leading-7 text-muted-foreground">
          Ten minutes, one conversation, five perspectives. See what a panel
          that shares one brain notices.
        </p>
        <Link
          href="/interview"
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start your interview
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-[min(94vw,72rem)] flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row">
        <Wordmark href="/" />
        <p className="text-xs text-muted-foreground">
          RoundTable · adaptive multi-perspective interviews
        </p>
      </div>
    </footer>
  );
}
