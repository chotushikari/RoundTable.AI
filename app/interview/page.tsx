import type { Metadata } from 'next';
import InterviewExperience from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Your interview · RoundTable',
  description:
    'A live, adaptive voice interview. One conversation, five perspectives, one shared read of your work.',
};

export default function InterviewPage() {
  return <InterviewExperience />;
}
