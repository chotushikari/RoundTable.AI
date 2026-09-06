import type { Metadata } from 'next';
import Link from 'next/link';
import { RecruiterShell } from '@/components/recruiter/RecruiterShell';
import { ControlRoom } from '@/components/recruiter/ControlRoom';

export const metadata: Metadata = {
  title: 'Control Room · RoundTable Recruiter',
  description:
    'Live view of a single interview: competency reads, the decision timeline, and why each question was asked.',
};

export default async function ControlRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RecruiterShell
      breadcrumb={
        <span>
          <Link href="/recruiter" className="hover:text-foreground">
            Interviews
          </Link>{' '}
          <span className="text-border">/</span> {id.slice(0, 8)}
        </span>
      }
    >
      <ControlRoom interviewId={id} />
    </RecruiterShell>
  );
}
