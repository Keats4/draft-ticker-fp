/**
 * Comparison universe: the data-quality guardrail for host rank − ECR gaps.
 *
 * A gap is only meaningful when BOTH sources genuinely cover the player
 * inside the same comparable band. Outside it, the average host rank is
 * thin (few host boards rank him) or ECR is in the noisy tail (experts
 * effectively don't rank him), and subtracting the two produces giant fake
 * gaps (e.g. host rank 137 vs ECR 494).
 *
 * Rule:
 *   - Price side: player is in the top TOP_N by average host rank AND is
 *     ranked by at least MIN_SOURCE_COUNT host boards (liquidity bar).
 *   - ECR side: expert rank is within TOP_N. An ECR beyond TOP_N is treated
 *     as "unranked in the comparable range", no gap is computed.
 * Only when both hold do we compute and show a gap.
 */
export const UNIVERSE = {
  TOP_N: 200,
  /** Minimum number of host boards that must rank a player. Five hosts
   *  contribute today; at 4 the top 200 keeps 183 players, at 5 it keeps 165. */
  MIN_SOURCE_COUNT: 4,
} as const;

/**
 * Positions the product tracks. Kickers and defenses are excluded from the
 * pipeline entirely: no rank, no gap, no signal, no page, no story.
 *
 * They are excluded BEFORE ranking, so hostRankOrdinal is a rank among
 * tracked players. The `hostRank` value itself is untouched, it stays the
 * source's average host rank across boards on which kickers and defenses
 * were present. The two numbers therefore differ on purpose: hostRank is an
 * average across host boards, hostRankOrdinal is our ordinal among the
 * players this product covers.
 *
 * FantasyPros position codes: kicker is "K", team defense is "DST".
 */
export const TRACKED_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

export function isTracked(position: string): boolean {
  return TRACKED_POSITIONS.has(position);
}

export function hostRankInUniverse(hostRankOrdinal: number, sourceCount: number): boolean {
  return hostRankOrdinal <= UNIVERSE.TOP_N && sourceCount >= UNIVERSE.MIN_SOURCE_COUNT;
}

export function ecrComparable(ecr: number | null): boolean {
  return ecr != null && ecr <= UNIVERSE.TOP_N;
}

/** Human-readable reason a gap is not shown, or null when it is comparable. */
export function gapReason(
  hostRankOrdinal: number,
  sourceCount: number,
  ecr: number | null
): string | null {
  if (ecr == null) return "no expert rank for this player";
  if (hostRankOrdinal > UNIVERSE.TOP_N)
    return `outside the top ${UNIVERSE.TOP_N} by ADP`;
  if (sourceCount < UNIVERSE.MIN_SOURCE_COUNT)
    return `below the liquidity bar (ranked by fewer than ${UNIVERSE.MIN_SOURCE_COUNT} host boards)`;
  if (ecr > UNIVERSE.TOP_N)
    return `experts rank him outside the top ${UNIVERSE.TOP_N} (unranked in the comparable range)`;
  return null;
}
