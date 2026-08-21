/**
 * Pure calculation layer. No I/O. Every threshold is exported so the UI
 * and methodology page render the same numbers the code uses.
 */

/** Thresholds (in rank spots). Rendered verbatim in the UI legend. */
export const THRESHOLDS = {
  /** Minimum average host rank change (spots) to count as a real market
   *  move. PROVISIONAL AND UNFITTED: the value 3 is reasoned rather than
   *  fitted, and an averaged rank's day-to-day noise is its own unit.
   *  Revisit once the host rank series has enough days to measure. */
  HOST_RANK_MOVE: 3,
  /** Minimum ECR change (ranks) to count as a real expert move. */
  ECR_MOVE: 2,
  /** |host rank − ECR| at or above this is a notable market/expert gap. */
  GAP_NOTABLE: 6,
} as const;

/** Average host rank − ECR. Positive: host boards place him later than
 *  experts rank him (potential value). Negative: host boards place him
 *  earlier than the expert rank (paying a premium). Null when either side
 *  is missing. */
export function hostRankEcrGap(
  hostRank: number | null | undefined,
  ecr: number | null | undefined
): number | null {
  if (hostRank == null || ecr == null) return null;
  return round1(hostRank - ecr);
}

/** previous − current, so positive = rising (ranked earlier now).
 *  Null when either day is missing, never a fake zero. */
export function movement(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null) return null;
  return round1(previous - current);
}

export type SignalInput = {
  /** Average host rank movement over the window (positive = rising), or null. */
  hostRankDelta: number | null;
  /** ECR movement over the window (positive = rising), or null. */
  ecrDelta: number | null;
  /** Current host rank − ECR gap, or null. */
  gap: number | null;
};

export type Signal =
  | "Market moving faster"
  | "Experts moving first"
  | "Market catching up to experts"
  | "Market and experts diverging"
  | "Market and experts converging"
  | "Broad agreement";

/**
 * Rule-based signal. Returns null when there is not enough history to
 * say anything (e.g., day one), the UI must render that as "tracking",
 * never as a real label.
 */
export function signalLabel(input: SignalInput): Signal | null {
  const { hostRankDelta, ecrDelta, gap } = input;
  if (hostRankDelta == null || ecrDelta == null) return null;

  const marketMoved = Math.abs(hostRankDelta) >= THRESHOLDS.HOST_RANK_MOVE;
  const ecrMoved = Math.abs(ecrDelta) >= THRESHOLDS.ECR_MOVE;
  const sameDirection = hostRankDelta * ecrDelta > 0;

  if (marketMoved && ecrMoved && sameDirection) {
    return Math.abs(hostRankDelta) >= Math.abs(ecrDelta) * 1.5
      ? "Market moving faster"
      : "Broad agreement";
  }
  // Both sides cleared their threshold but moved in OPPOSITE directions.
  // Direction alone does not say whether they are pulling apart: two lines can
  // move opposite ways and still close the distance between them, depending on
  // which one started ahead. So test DISTANCE as well, using the prior gap
  // reconstructed from BOTH deltas (the market-only branch below can ignore
  // the ECR term because ECR did not clear its threshold there; here it did).
  if (marketMoved && ecrMoved) {
    const priorGap = gap != null ? gap + hostRankDelta - ecrDelta : null;
    const narrowing = priorGap != null && Math.abs(gap!) < Math.abs(priorGap);
    return narrowing
      ? "Market and experts converging"
      : "Market and experts diverging";
  }
  if (marketMoved && !ecrMoved) {
    // Market moved alone. If the move shrank the gap, the market is
    // converging on the expert view; otherwise it is out in front.
    const gapClosing =
      gap != null && Math.abs(gap) < Math.abs(gap + hostRankDelta);
    return gapClosing ? "Market catching up to experts" : "Market moving faster";
  }
  if (!marketMoved && ecrMoved) return "Experts moving first";
  return "Broad agreement";
}

export type FpLite = {
  player_id: number;
  player_name: string;
  player_team_id: string;
  player_position_id: string;
  rank_ecr: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
