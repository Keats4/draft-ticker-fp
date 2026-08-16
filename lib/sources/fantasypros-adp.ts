/**
 * FantasyPros composite ADP: a SECOND, parallel ADP series.
 *
 * Stored only. Nothing in the product reads it: not a signal, not a
 * threshold, not a chart, not a story card, not an evidence tier. FFC remains
 * the one ADP the site speaks with. This exists so that in a month there is a
 * second series to compare against, which is a decision that cannot be made
 * retroactively because nobody publishes ADP history.
 *
 * IMPORTANT, the pick number is `rank_ave`, NOT `rank_ecr`.
 * In an ADP payload `rank_ecr` is only the ordinal (1, 2, 3...). `rank_ave` is
 * the average draft slot across the contributing sources, which is the number
 * comparable to FFC's `adp`. Reading `rank_ecr` as a price would silently
 * compare a rank against a pick number.
 *
 * `experts=show` is on. It adds a per-source rank map (`experts`) and
 * `rank_points`, so a future reader can tell a five-source consensus from a
 * single-source entry. That distinction is not recoverable later if it is not
 * captured now.
 */
export const FP_ADP_URL =
  "https://api.fantasypros.com/public/v2/json/nfl/2026/consensus-rankings?position=ALL&scoring=PPR&type=adp&week=0&experts=show";

/** Hard ceiling on the call. The daily cron has run unattended for six
 *  mornings; this series must never be the reason it hangs. */
export const FP_ADP_TIMEOUT_MS = 15_000;

/** Minimal shape we assert on. Everything else is stored untouched. */
export type FpAdpRaw = {
  players: Array<Record<string, unknown>>;
  count?: number;
  total_experts?: number;
  last_updated?: string;
  last_updated_ts?: number;
  [k: string]: unknown;
};

/**
 * Fetch the composite ADP payload and return it RAW.
 *
 * Deliberately not mapped to a narrow row type. Storage decisions are
 * irreversible and display decisions are not, so the full response is what
 * gets written and the trimming happens at read time.
 */
export async function fetchFpAdp(): Promise<FpAdpRaw> {
  const key = process.env.FANTASYPROS_API_KEY;
  if (!key) throw new Error("FANTASYPROS_API_KEY is not set");
  const res = await fetch(FP_ADP_URL, {
    headers: { "x-api-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(FP_ADP_TIMEOUT_MS),
  });
  if (!res.ok) {
    // 429 happens. It is logged and dropped by the caller, never retried
    // in-loop, because a retry storm is a worse failure than a missing day.
    throw new Error(`FantasyPros ADP responded ${res.status}`);
  }
  const data = (await res.json()) as FpAdpRaw;
  if (!Array.isArray(data.players)) {
    throw new Error("FantasyPros ADP unexpected payload: players missing");
  }
  return data;
}
