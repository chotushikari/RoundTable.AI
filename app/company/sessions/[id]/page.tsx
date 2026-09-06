import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { interviewStore } from '@/lib/interview-store';
import { JudgePanel } from '@/components/JudgePanel';
import { AssessmentReport } from '@/components/AssessmentReport';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SessionDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await interviewStore.getSession(params.id);
  
  if (!session) {
    return notFound();
  }

  const interview = await interviewStore.getInterview(session.interviewId);
  const analyses = await interviewStore.listAnalyses(session.id);
  const latestAnalysis = analyses.length > 0 ? analyses[analyses.length - 1] : null;
  const assessmentRecord = await (getSupabaseAdmin() ? getSupabaseAdmin()!.from('assessments').select('*').eq('session_id', session.id).maybeSingle().then(res => res.data) : null);
  
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header Navigation */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-surface/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/company" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/5 transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Session Detail
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {interview?.roleTitle} • {session.id}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
            session.status === 'completed' ? 'bg-green-500/10 text-green-500 ring-green-500/20' : 
            session.status === 'in_progress' ? 'bg-primary/10 text-primary ring-primary/20' : 
            'bg-muted/50 text-muted-foreground ring-border'
          }`}>
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
              session.status === 'completed' ? 'bg-green-500' : 
              session.status === 'in_progress' ? 'bg-primary animate-pulse' : 
              'bg-muted-foreground'
            }`} />
            {session.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl h-full">
          {session.status === 'completed' && assessmentRecord ? (
            <div className="animate-fade-up">
              <AssessmentReport assessment={assessmentRecord.assessment} />
            </div>
          ) : (
            <div className="h-[calc(100vh-8rem)] animate-fade-up">
              <JudgePanel session={session} latestAnalysis={latestAnalysis} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
