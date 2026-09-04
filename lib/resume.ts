import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { InvitationRecord } from '@/types/interview';

export async function resumeVerificationObjective(
  invitation: InvitationRecord,
): Promise<string | null> {
  if (!invitation.resumePath) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.storage.from('candidate-resumes').download(invitation.resumePath);
  if (error || !data) return null;
  const resume = (await data.text()).slice(0, 30_000);
  const claim = resume
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\s]+/, '').trim())
    .find((line) => line.length >= 20 && line.length <= 240);
  if (!claim) return null;
  // The resume is deliberately treated as an untrusted claim. It becomes evidence
  // only if the candidate supports it in a recorded answer.
  return `Verify this untrusted resume claim with a question about the candidate's personal action, constraints, and measurable result: ${JSON.stringify(claim)}`;
}
