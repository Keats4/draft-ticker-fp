import { THRESHOLDS, type Signal } from "@/lib/math";

export const SIGNAL_META: Record<
  Signal,
  { blurb: string; rule: string }
> = {
  "Market moving faster": {
    // Direction-neutral on purpose: this generic definition renders in
    // contexts without a player (chip legend, methodology). whatItMeans()
    // substitutes the direction-aware sentence when it has the delta.
    blurb: "Draft rooms are moving him quicker than the experts.",
    rule: `Either (a) ADP moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} picks, experts moved < ${THRESHOLDS.ECR_MOVE} ranks, and the move did NOT shrink the ADP−ECR gap (no 1.5× test applies on this path) or (b) both moved the same way, each clearing its threshold, with ADP shifting at least 1.5× as far as ECR.`,
  },
  "Experts moving first": {
    blurb: "Rankings moved first. ADP has not followed.",
    rule: `ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks while ADP moved < ${THRESHOLDS.HOST_RANK_MOVE} picks.`,
  },
  "Market catching up to experts": {
    blurb: "ADP is closing on where experts had him.",
    rule: `ADP moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} picks on its own and the move shrank the ADP−ECR gap.`,
  },
  "Market and experts converging": {
    blurb: "The disagreement is shrinking.",
    rule: `ADP moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} picks and ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks in OPPOSITE directions, and the absolute ADP−ECR gap SHRANK over the window.`,
  },
  "Market and experts diverging": {
    blurb: "The disagreement is growing.",
    rule: `ADP moved ≥ ${THRESHOLDS.HOST_RANK_MOVE} picks and ECR moved ≥ ${THRESHOLDS.ECR_MOVE} ranks in OPPOSITE directions, and the absolute ADP−ECR gap GREW over the window.`,
  },
  "Broad agreement": {
    // Generic form for contexts without deltas (chip legend, methodology).
    // whatItMeans() substitutes a magnitude-aware sentence when it has both
    // deltas: this label fires on two very different branches (both sides
    // cleared their bars moving together, or neither cleared) and the copy
    // must not describe the first as nothing moving.
    blurb: "The market and the experts are not disagreeing.",
    rule: `Both moved the same direction at similar size, or neither cleared its threshold (ADP ${THRESHOLDS.HOST_RANK_MOVE}, ECR ${THRESHOLDS.ECR_MOVE}).`,
  },
};

/** Deterministic one-liner for the expandable "what it means" row. The gap
 *  is shown as a number and in rounds beside the reading, so the reading
 *  carries no trailing gap clause. */
export function whatItMeans(
  signal: Signal | null,
  gap: number | null,
  hostRankDelta: number | null,
  ecrDelta: number | null = null,
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
  // a player whose ADP fell must not be described as rising.
  if (signal === "Market moving faster" && hostRankDelta !== null && hostRankDelta !== 0) {
    return `Draft rooms are moving him ${hostRankDelta > 0 ? "up" : "down"} quicker than the experts.`;
  }
  // "Broad agreement" fires on two branches that deserve opposite copy: both
  // sides cleared their bars moving the same way at similar size (something
  // meaningful moved, together), or neither cleared (nothing much moved).
  // Same pattern as the direction branch above: the label's generic blurb is
  // replaced when the deltas are in hand. The branch logic itself is
  // untouched; this only reads the same thresholds the label was born from.
  if (signal === "Broad agreement" && hostRankDelta !== null && ecrDelta !== null) {
    const bothCleared =
      Math.abs(hostRankDelta) >= THRESHOLDS.HOST_RANK_MOVE &&
      Math.abs(ecrDelta) >= THRESHOLDS.ECR_MOVE;
    return bothCleared
      ? `The market and the experts repriced him together, both moving him ${hostRankDelta > 0 ? "up" : "down"}.`
      : "Neither side has moved much.";
  }
  return SIGNAL_META[signal].blurb;
}
