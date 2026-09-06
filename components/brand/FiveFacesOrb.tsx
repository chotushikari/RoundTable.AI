'use client';

import { ROLE_ORDER, roleTheme } from '@/lib/interview/roleTheme';
import type { RoleKind } from '@/lib/interview/types';

/**
 * The signature mark: five interviewer role-nodes arranged around a single
 * core — "five faces, one brain." An active role brightens and connects to the
 * core with a lit spoke. Pure SVG + CSS; respects reduced motion.
 */
export function FiveFacesOrb({
  activeRole,
  size = 320,
  spin = true,
  className = '',
}: {
  activeRole?: RoleKind | null;
  size?: number;
  spin?: boolean;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const orbit = size * 0.36;
  const nodeR = size * 0.062;
  const coreR = size * 0.11;

  // Start at top (-90°) and step clockwise.
  const nodes = ROLE_ORDER.map((role, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / ROLE_ORDER.length;
    return {
      role,
      x: cx + orbit * Math.cos(angle),
      y: cy + orbit * Math.sin(angle),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Five interviewer perspectives connected to one shared brain"
    >
      <defs>
        <radialGradient id="ff-core" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="hsl(230 25% 22%)" />
          <stop offset="100%" stopColor="hsl(230 30% 9%)" />
        </radialGradient>
        {ROLE_ORDER.map((role) => (
          <radialGradient
            key={role}
            id={`ff-node-${role}`}
            cx="38%"
            cy="34%"
            r="70%"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.85" />
            <stop offset="55%" stopColor={roleTheme(role).hex} />
            <stop offset="100%" stopColor={roleTheme(role).hex} stopOpacity="0.9" />
          </radialGradient>
        ))}
      </defs>

      {/* rotating group holds spokes + nodes; core stays fixed */}
      <g
        style={
          spin
            ? {
                transformOrigin: `${cx}px ${cy}px`,
                animation: 'ff-orbit 48s linear infinite',
              }
            : undefined
        }
      >
        {/* spokes */}
        {nodes.map(({ role, x, y }) => {
          const active = activeRole === role;
          return (
            <line
              key={`spoke-${role}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={active ? roleTheme(role).hex : 'hsl(230 16% 82%)'}
              strokeWidth={active ? 2.25 : 1}
              strokeDasharray={active ? undefined : '3 5'}
              strokeLinecap="round"
              opacity={active ? 0.9 : 0.55}
            />
          );
        })}

        {/* nodes (counter-rotate so labels/highlights stay upright) */}
        {nodes.map(({ role, x, y }) => {
          const active = !activeRole || activeRole === role;
          return (
            <g
              key={`node-${role}`}
              style={{
                transformOrigin: `${x}px ${y}px`,
                animation: spin ? 'ff-orbit-reverse 48s linear infinite' : undefined,
              }}
            >
              {active && (
                <circle
                  cx={x}
                  cy={y}
                  r={nodeR * 1.7}
                  fill={roleTheme(role).hex}
                  opacity={activeRole === role ? 0.22 : 0.12}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={nodeR}
                fill={`url(#ff-node-${role})`}
                opacity={active ? 1 : 0.38}
              />
            </g>
          );
        })}
      </g>

      {/* the one shared brain */}
      <circle cx={cx} cy={cy} r={coreR + 3} fill="none" stroke="hsl(230 16% 88%)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={coreR} fill="url(#ff-core)" />
      <circle cx={cx} cy={cy} r={coreR} fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
    </svg>
  );
}
