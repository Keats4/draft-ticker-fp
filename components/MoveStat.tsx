/**
 * The movement statistic, as one designed object: a line arrow and the
 * magnitude in movement navy, with an intentional label beneath.
 *
 * Display only. Direction lives in the arrow (both directions navy, never
 * green or red); the figure is magnitude; the label names the window. The
 * null/zero states render honestly: a muted dash or zero. Alignment follows
 * the wrapper's text-align, so one component serves left- and right-anchored
 * placements.
 */
export default function MoveStat({
  delta,
  label,
  size = "lg",
  anchored = false,
}: {
  /** Signed movement over the window; null = no data yet. */
  delta: number | null;
  /** Window label, e.g. "Since Aug 16" or "Market move since Aug 16". */
  label: string;
  size?: "lg" | "sm";
  /** Subtle navy surface for stats sitting alone at a card edge. */
  anchored?: boolean;
}) {
  const cls =
    (size === "sm" ? "movestat movestat--sm" : "movestat") +
    (anchored ? " movestat--badge" : "");
  if (delta === null || delta === 0) {
    return (
      <span className={`${cls} movestat--muted`}>
        <span className="movestat-num">{delta === null ? "–" : "0"}</span>
        <span className="movestat-label">{label}</span>
      </span>
    );
  }
  return (
    <span className={cls}>
      <span className="movestat-num">
        <span className="movestat-arrow" aria-hidden>
          {delta > 0 ? "↑" : "↓"}
        </span>
        {Math.abs(delta)}
        <span className="sr-only">{delta > 0 ? "picks gained" : "picks lost"}</span>
      </span>
      <span className="movestat-label">{label}</span>
    </span>
  );
}
