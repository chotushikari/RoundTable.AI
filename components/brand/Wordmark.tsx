import Link from 'next/link';
import { ROLE_ORDER, roleTheme } from '@/lib/interview/roleTheme';

/**
 * RoundTable wordmark: five role-colored dots (the panel) preceding the name
 * set in the display serif. The dots are the compact form of the signature orb.
 */
export function Wordmark({
  href = '/',
  className = '',
}: {
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex items-center gap-1" aria-hidden>
        {ROLE_ORDER.map((role) => (
          <span
            key={role}
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: roleTheme(role).hex }}
          />
        ))}
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        RoundTable
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} aria-label="RoundTable home" className="shrink-0">
      {inner}
    </Link>
  );
}
