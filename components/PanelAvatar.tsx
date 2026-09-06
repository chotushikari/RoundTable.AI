'use client';

type PanelAvatarProps = { role: string; state: string | null };
const PROFILES: Record<string, { label: string; initials: string; tone: string; description: string }> = {
  hiring_manager: { label: 'Hiring Manager', initials: 'HM', tone: 'Professional', description: 'Background and ownership' },
  technical: { label: 'Technical Interviewer', initials: 'TI', tone: 'Precise', description: 'Implementation and trade-offs' },
  product: { label: 'Product Manager', initials: 'PM', tone: 'Outcome focused', description: 'Customer and business impact' },
  customer: { label: 'Customer', initials: 'CU', tone: 'Conversational', description: 'Clarity and real-world value' },
  behavioral: { label: 'Behavioural Interviewer', initials: 'BI', tone: 'Supportive', description: 'Collaboration and learning' },
};

function activityLabel(state: string | null) {
  const value = state?.toLowerCase() ?? '';
  if (/speak|talk/.test(value)) return 'Speaking';
  if (/think|process/.test(value)) return 'Thinking';
  if (/listen/.test(value)) return 'Listening';
  return 'Ready';
}

export function PanelAvatar({ role, state }: PanelAvatarProps) {
  const profile = PROFILES[role] ?? PROFILES.technical;
  const activity = activityLabel(state);
  const animated = activity === 'Speaking';
  return (
    <section className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#2b2b2b] bg-[#151515e8] p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)]" aria-label={`${profile.label} AI avatar, ${activity.toLowerCase()}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3ecf8e] to-transparent" />
      <div className="flex items-center gap-4">
        <div className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[#35614c] bg-[radial-gradient(circle_at_30%_25%,#58dda0,#168653)] font-mono text-lg font-bold text-[#07150f] shadow-[0_12px_35px_rgba(62,207,142,.12)] ${animated ? 'panel-avatar-speaking' : ''}`}><span>{profile.initials}</span><span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-[#151515] bg-[#3ecf8e]" /></div>
        <div className="min-w-0 flex-1"><p className="font-mono text-[9px] font-semibold uppercase tracking-[.18em] text-[#707070]">Current panel perspective</p><h2 className="mt-1 truncate text-xl font-semibold tracking-[-.035em] text-[#f0f0f0]">{profile.label}</h2><p className="mt-1 text-xs text-[#777]">{profile.description}</p></div>
        <span className="hidden items-center gap-2 rounded-full border border-[#303030] bg-[#1a1a1a] px-3 py-1.5 text-[10px] text-[#999] sm:flex"><i className={`h-2 w-2 rounded-full ${animated ? 'bg-[#3ecf8e] panel-avatar-speaking' : 'bg-[#777]'}`} />{activity}</span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[#292929] pt-4 text-[11px]"><span className="text-[#6f6f6f]">Interview style</span><strong className="font-medium text-[#b8b8b8]">{profile.tone}</strong></div>
    </section>
  );
}
