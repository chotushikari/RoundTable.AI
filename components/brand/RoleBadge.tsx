import { roleTheme } from '@/lib/interview/roleTheme';
import type { RoleKind } from '@/lib/interview/types';

/**
 * A small role identity chip — colored dot + interviewer name/label.
 * Used in the Control Room timeline, transcript attribution, and legends.
 */
export function RoleBadge({
  role,
  showName = false,
  size = 'md',
  className = '',
}: {
  role: RoleKind;
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const t = roleTheme(role);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  const dot = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad} ${t.tint} ${t.border} ${t.text} ${className}`}
    >
      <span className={`${dot} rounded-full`} style={{ backgroundColor: t.hex }} />
      {showName ? `${t.name} · ${t.label}` : t.label}
    </span>
  );
}
