import type { RoleKind } from './types';

/**
 * Presentation metadata for the five interviewer roles — the signature color
 * system shared across the landing page, the interview room, and the recruiter
 * Control Room. Colors match lib/interview/personas.ts and the CSS role tokens.
 */
export interface RoleTheme {
  role: RoleKind;
  label: string;
  /** Interviewer display name (from personas). */
  name: string;
  /** Short description of the lens, for chips/tooltips. */
  blurb: string;
  /** Raw hex (for inline SVG gradients, canvas, charts). */
  hex: string;
  /** Tailwind text color class. */
  text: string;
  /** Tailwind background tint class (subtle). */
  tint: string;
  /** Tailwind border class. */
  border: string;
  /** Tailwind solid background (badges/dots). */
  solid: string;
  /** CSS var reference for gradients: `hsl(var(--role-...))`. */
  cssVar: string;
}

export const ROLE_THEME: Record<RoleKind, RoleTheme> = {
  technical: {
    role: 'technical',
    label: 'Technical',
    name: 'Maya',
    blurb: 'Systems, correctness, and trade-offs under scrutiny.',
    hex: '#3b82f6',
    text: 'text-role-technical',
    tint: 'bg-role-technical/10',
    border: 'border-role-technical/30',
    solid: 'bg-role-technical',
    cssVar: 'hsl(var(--role-technical))',
  },
  product: {
    role: 'product',
    label: 'Product',
    name: 'Devin',
    blurb: 'Customer impact, outcomes, and what to cut.',
    hex: '#8b5cf6',
    text: 'text-role-product',
    tint: 'bg-role-product/10',
    border: 'border-role-product/30',
    solid: 'bg-role-product',
    cssVar: 'hsl(var(--role-product))',
  },
  customer: {
    role: 'customer',
    label: 'Customer',
    name: 'Priya',
    blurb: 'A live scenario: empathy and ownership under pressure.',
    hex: '#f59e0b',
    text: 'text-role-customer',
    tint: 'bg-role-customer/10',
    border: 'border-role-customer/30',
    solid: 'bg-role-customer',
    cssVar: 'hsl(var(--role-customer))',
  },
  manager: {
    role: 'manager',
    label: 'Hiring Manager',
    name: 'Sam',
    blurb: 'Judgment, prioritization, and overall fit.',
    hex: '#14b8a6',
    text: 'text-role-manager',
    tint: 'bg-role-manager/10',
    border: 'border-role-manager/30',
    solid: 'bg-role-manager',
    cssVar: 'hsl(var(--role-manager))',
  },
  behavioral: {
    role: 'behavioral',
    label: 'Behavioural',
    name: 'Jordan',
    blurb: 'Structured, evidence-based probing of real situations.',
    hex: '#f43f5e',
    text: 'text-role-behavioral',
    tint: 'bg-role-behavioral/10',
    border: 'border-role-behavioral/30',
    solid: 'bg-role-behavioral',
    cssVar: 'hsl(var(--role-behavioral))',
  },
};

export const ROLE_ORDER: RoleKind[] = [
  'technical',
  'product',
  'customer',
  'manager',
  'behavioral',
];

export function roleTheme(role: RoleKind): RoleTheme {
  return ROLE_THEME[role] ?? ROLE_THEME.technical;
}
