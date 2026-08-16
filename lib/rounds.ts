/**
 * Picks to rounds, and the plain sentence a drafter actually wants.
 *
 * A drafter does not think in picks, they think in rounds. The gap is already
 * computed in picks (ADP minus ECR); this is the only conversion, and it is
 * division by the league size the ADP is drawn from. No new data, no new
 * thresholds, no new signal.
 *
 * Sign convention, unchanged from the rest of the product:
 *   gap < 0  the market drafts him EARLIER than experts rank him, you pay early
 *   gap > 0  the market drafts him LATER than experts rank him, he is cheaper
 */

/**
 * Fantasy Football Calculator's PPR ADP is a 12 team format, so a round is 12
 * picks. This is the league size the source is drawn from, not a preference.
 */
export const LEAGUE_SIZE = 12;

export function picksToRounds(picks: number): number {
  return picks / LEAGUE_SIZE;
}

/**
 * How much of a round, in words. Buckets rather than a decimal, because
 * "0.73 rounds" is not how anyone talks about a draft.
 */
export function roundsPhrase(rounds: number): string {
  const r = Math.abs(rounds);
  if (r < 0.25) return "less than a quarter of a round";
  if (r < 0.4) return "about a quarter of a round";
  if (r < 0.65) return "about half a round";
  if (r < 0.85) return "about three quarters of a round";
  if (r < 1.25) return "about a round";
  if (r < 1.75) return "about a round and a half";
  const half = Math.round(r * 2) / 2;
  return `about ${half % 1 === 0 ? half : half.toFixed(1)} rounds`;
}

/**
 * The one line answer at the top of a player page. Derived entirely from the
 * current gap; where there is no gap it says why rather than guessing.
 */
export function oneLineAnswer(
  gap: number | null,
  gapReason: string | null
): string {
  if (gap == null) {
    return gapReason
      ? `No comparable price for him: ${gapReason}.`
      : "No comparable price for him yet.";
  }
  const rounds = picksToRounds(gap);
  if (Math.abs(rounds) < 0.25) {
    return "His draft cost and the expert rank are level, within a quarter of a round.";
  }
  const phrase = roundsPhrase(rounds);
  return gap < 0
    ? `You are paying ${phrase} early on him.`
    : `He is going ${phrase} later than the experts rank him.`;
}

/** Axis and stat formatting, always signed, always in rounds. */
export function fmtRounds(picks: number): string {
  const r = Math.round(picksToRounds(picks) * 100) / 100;
  const shown = Math.abs(r) >= 1 ? r.toFixed(1) : r.toFixed(2);
  return `${r > 0 ? "+" : ""}${shown}`;
}
