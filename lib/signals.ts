import { THRESHOLDS, type Signal } from "@/lib/math";

export const SIGNAL_META: Record<
  Signal,
  { blurb: string; rule: string }
> = {
  "Market moving faster": {
    // Direction-neutral on purpose: this generic definition renders in
    // contexts without a player (chip legend, methodology). whatItMeans()
    // substitutes the direction-aware sentence when it has the delta.
    blurb: "Average host rank is moving faster than expert opinion.",
    rule: `Either (a) average host rank moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} spots, experts moved < ${THRESHOLDS.ECR_MOVE} ranks, and the move did NOT shrink the host rank−ECR gap (no 1.5× test applies on this path) or (b) both moved the same way, each clearing its threshold, with host rank shifting at least 1.5× as far as ECR.`,
  },
  "Experts moving first": {
    blurb: "Experts are re-ranking him before the host boards react.",
    rule: `ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks while average host rank moved < ${THRESHOLDS.HOST_RANK_MOVE} spots.`,
  },
  "Market catching up to experts": {
    blurb: "The market is moving toward where experts already had him.",
    rule: `Average host rank moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} spots on its own and the move shrank the host rank−ECR gap.`,
  },
  "Market and experts converging": {
    blurb:
      "The market and the experts moved in opposite directions and the gap between them got smaller. They are closing on each other from both sides.",
    rule: `Average host rank moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} spots and ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks in OPPOSITE directions, and the absolute host rank−ECR gap SHRANK over the window.`,
  },
  "Market and experts diverging": {
    blurb:
      "The market is moving one way while experts move the other, the two sides disagree about direction, not just size.",
    rule: `Average host rank moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} spots and ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks in OPPOSITE directions, and the absolute host rank−ECR gap GREW over the window.`,
  },
  "Broad agreement": {
    blurb: "Market and experts are moving together, or neither is moving.",
    rule: `Both moved the same direction at similar size, or neither cleared its threshold (host rank ${THRESHOLDS.HOST_RANK_MOVE}, ECR ${THRESHOLDS.ECR_MOVE}).`,
  },
};

/** Deterministic one-liner for the expandable "what it means" row. */
export function whatItMeans(
  signal: Signal | null,
  gap: number | null,
  hostRankDelta: number | null,
  gapReason: string | null = null
): string {
  if (gap === null && gapReason) {
    return `No gap is shown here: ${gapReason}. We only compare inside the sane universe, never a fabricated gap.`;
  }
  if (signal === null) {
    return hostRankDelta === null
      ? "Not enough history yet, movement needs a second daily snapshot before a signal appears."
      : "Movement is below the thresholds that count as a real move.";
  }
  // "Market moving faster" fires on either direction (the branch tests
  // magnitude), so the sentence must follow the sign of the actual move:
  // a player whose rank fell six spots must not be described as rising.
  const base =
    signal === "Market moving faster" && hostRankDelta !== null && hostRankDelta !== 0
      ? `Average host rank is ${hostRankDelta > 0 ? "rising" : "falling"} faster than expert opinion.`
      : SIGNAL_META[signal].blurb;
  if (gap === null) return base;
  const dir =
    gap > 0
      ? "Experts rank him ahead of his average host rank, a possible value."
      : gap < 0
        ? "His average host rank is ahead of the expert rank, you are paying a premium."
        : "Average host rank and expert rank currently agree.";
  return `${base} ${dir}`;
}
