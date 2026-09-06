/**
 * BeliefBar — the product's core visual: how strong we think a candidate is
 * (belief) shown alongside how much evidence justifies it (confidence).
 *
 * Belief drives the fill length. Confidence drives the band label (Low/Med/High)
 * and the fill's opacity — a strong belief on thin evidence looks appropriately
 * tentative (faded), and firms up as evidence accrues.
 */
export function BeliefBar({
  label,
  belief,
  confidence,
  accentHex = 'hsl(230 25% 11%)',
}: {
  label: string;
  belief: number; // 0..1
  confidence: number; // 0..1
  accentHex?: string;
}) {
  const pct = Math.round(clamp01(belief) * 100);
  const conf = clamp01(confidence);
  const band = conf < 0.4 ? 'Low' : conf < 0.7 ? 'Medium' : 'High';
  // Thin evidence → faded fill; strong evidence → solid.
  const fillOpacity = 0.35 + conf * 0.65;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pct}%
          <span className="mx-1.5 text-border">·</span>
          <span title="How much evidence justifies this read">{band} evidence</span>
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        {/* belief fill, opacity keyed to confidence */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width,opacity] duration-500"
          style={{ width: `${pct}%`, backgroundColor: accentHex, opacity: fillOpacity }}
        />
        {/* confidence marker: a hairline at the point evidence "runs out" */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/40"
          style={{ left: `${Math.round(conf * 100)}%` }}
          title={`Evidence coverage: ${Math.round(conf * 100)}%`}
        />
      </div>
    </div>
  );
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
