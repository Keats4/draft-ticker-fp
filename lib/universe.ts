/**
 * Comparison universe: the data-quality guardrail for ADP−ECR gaps.
 *
 * A gap is only meaningful when BOTH sources genuinely cover the player
 * inside the same comparable band. Outside it, ADP is thin (few drafts)
 * or ECR is in the noisy tail (experts effectively don't rank him), and
 * subtracting the two produces giant fake gaps (e.g. ADP 137 vs ECR 494).
 *
 * Rule:
 *   - ADP side: player is in the top TOP_N by ADP AND drafted in at least
 *     MIN_TIMES_DRAFTED mocks (liquidity bar).
 *   - ECR side: expert rank is within TOP_N. An ECR beyond TOP_N is treated
 *     as "unranked in the comparable range", no gap is computed.
 * Only when both hold do we compute and show a gap.
 */
export const UNIVERSE = {
  TOP_N: 200,
  MIN_TIMES_DRAFTED: 30,
} as const;

/**
 * Positions the product tracks. Kickers and defenses are excluded from the
 * pipeline entirely: no rank, no gap, no signal, no page, no story.
 *
 * They are excluded BEFORE ranking, so adpRank is a rank among tracked
 * players. The `adp` value itself is untouched, it stays FFC\'s average pick
 * from real drafts in which kickers and defenses were on the board. The two
 * numbers therefore differ on purpose: adp is a draft-pick average, adpRank
 * is our ordinal among the players this product covers.
 *
 * FFC position codes: kicker is "PK", team defense is "DEF".
 */
export const TRACKED_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

export function isTracked(position: string): boolean {
  return TRACKED_POSITIONS.has(position);
}

export function adpInUniverse(adpRank: number, timesDrafted: number): boolean {
  return adpRank <= UNIVERSE.TOP_N && timesDrafted >= UNIVERSE.MIN_TIMES_DRAFTED;
}

export function ecrComparable(ecr: number | null): boolean {
  return ecr != null && ecr <= UNIVERSE.TOP_N;
}

/** Human-readable reason a gap is not shown, or null when it is comparable. */
export function gapReason(
  adpRank: number,
  timesDrafted: number,
  ecr: number | null
): string | null {
  if (ecr == null) return "no confident expert match";
  if (adpRank > UNIVERSE.TOP_N)
    return `outside the top ${UNIVERSE.TOP_N} by draft cost`;
  if (timesDrafted < UNIVERSE.MIN_TIMES_DRAFTED)
    return `below the liquidity bar (< ${UNIVERSE.MIN_TIMES_DRAFTED} drafts)`;
  if (ecr > UNIVERSE.TOP_N)
    return `experts rank him outside the top ${UNIVERSE.TOP_N} (unranked in the comparable range)`;
  return null;
}
