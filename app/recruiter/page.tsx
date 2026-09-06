import type { Metadata } from 'next';
import { RecruiterShell } from '@/components/recruiter/RecruiterShell';
import { RecruiterDashboard } from '@/components/recruiter/RecruiterDashboard';

export const metadata: Metadata = {
  title: 'Interviews · RoundTable Recruiter',
  description:
    'Every RoundTable interview with a live read of belief and confidence across competencies.',
};

export default function RecruiterPage() {
  return (
    <RecruiterShell>
      <RecruiterDashboard />
    </RecruiterShell>
  );
}
