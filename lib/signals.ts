import { THRESHOLDS, type Signal } from "@/lib/math";

export const SIGNAL_META: Record<
  Signal,
  { blurb: string; rule: string }
> = {
  "Market moving faster": {
    blurb: "Draft cost is rising faster than expert opinion.",
    rule: `Either (a) ADP moved ≥ ${THRESHOLDS.ADP_MOVE} picks, experts moved < ${THRESHOLDS.ECR_MOVE} ranks, and the move did NOT shrink the ADP−ECR gap (no 1.5× test applies on this path) or (b) both moved the same way, each clearing its threshold, with ADP shifting at least 1.5× as far as ECR.`,
  },
  "Experts moving first": {
    blurb: "Experts are re-ranking him before the draft market reacts.",
    rule: `ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks while ADP moved < ${THRESHOLDS.ADP_MOVE} picks.`,
  },
  "Market catching up to experts": {
    blurb: "The market is moving toward where experts already had him.",
    rule: `ADP moved ≥ ${THRESHOLDS.ADP_MOVE} picks on its own and the move shrank the ADP−ECR gap.`,
  },
  "Market and experts converging": {
    blurb:
      "The market and the experts moved in opposite directions and the gap between them got smaller. They are closing on each other from both sides.",
    rule: `ADP moved ≥ ${THRESHOLDS.ADP_MOVE} picks and ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks in OPPOSITE directions, and the absolute ADP−ECR gap SHRANK over the window.`,
  },
  "Market and experts diverging": {
    blurb:
      "The market is moving one way while experts move the other, the two sides disagree about direction, not just size.",
    rule: `ADP moved ≥ ${THRESHOLDS.ADP_MOVE} picks and ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks in OPPOSITE directions, and the absolute ADP−ECR gap GREW over the window.`,
  },
  "Broad agreement": {
    blurb: "Market and experts are moving together, or neither is moving.",
    rule: `Both moved the same direction at similar size, or neither cleared its threshold (ADP ${THRESHOLDS.ADP_MOVE}, ECR ${THRESHOLDS.ECR_MOVE}).`,
  },
};

/** Deterministic one-liner for the expandable "what it means" row. */
export function whatItMeans(
  signal: Signal | null,
  gap: number | null,
  adpDelta: number | null,
  gapReason: string | null = null
): string {
  if (gap === null && gapReason) {
    return `No gap is shown here: ${gapReason}. We only compare inside the sane universe, never a fabricated gap.`;
  }
  if (signal === null) {
    return adpDelta === null
      ? "Not enough history yet, movement needs a second daily snapshot before a signal appears."
      : "Movement is below the thresholds that count as a real move.";
  }
  const base = SIGNAL_META[signal].blurb;
  if (gap === null) return base;
  const dir =
    gap > 0
      ? "Experts rank him ahead of his draft cost, a possible value."
      : gap < 0
        ? "His draft cost is ahead of the expert rank, you are paying a premium."
        : "Draft cost and expert rank currently agree.";
  return `${base} ${dir}`;
}
