import LandingPage from '@/components/LandingPage';

export default async function CandidateInterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <LandingPage invitationToken={token} />;
}
