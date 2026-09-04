import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
      <span className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">Powered by Agora Conversational AI</span>
      <h1 className="mt-6 text-5xl font-semibold tracking-tight">One voice. A complete interview panel.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">RoundTable adapts technical, product, customer, behavioural, and hiring-manager questions to the evidence a candidate actually provides.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/company" className="rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground">Company dashboard</Link>
      </div>
      <p className="mt-8 max-w-xl text-sm text-muted-foreground">Candidates enter through a private invitation link. Every candidate is told they are speaking with AI, and every assessment requires human review.</p>
    </main>
  );
}
