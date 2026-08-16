/**
 * Evidence tier: the honesty layer on top of a signal. A signal is a
 * reading, not a prediction; the evidence tier says whether that reading is
 * backed by a documented event or is still unexplained. It never upgrades a
 * reading into "act", "unexplained" explicitly means watch, don't act.
 *
 * catalyst-confirmed: a verified (non-sample) catalyst exists inside the
 *   lookback that can plausibly have moved the price. See below, that lookback
 *   is NOT the gap between the two snapshots.
 * unexplained: no verified catalyst yet, the move is real but the "why" is
 *   not documented, so the fallback copy applies.
 */
export type Evidence = { confirmed: boolean; label: string; note: string };

/**
 * How many days before the OLDER snapshot a catalyst may sit and still count
 * as inside the move window.
 *
 * ASSUMPTION, NOT DERIVED. The price is an average host rank across five host
 * boards. None of the hosts publishes how its board is aggregated or over what
 * window, so this number cannot be read off a spec. It is a judgment call,
 * stated as one, for these reasons:
 *
 *   1. Drafters are spread across days. Someone drafting Thursday has heard
 *      Tuesday's news; someone who drafted Tuesday morning had not. A reaction
 *      keeps entering the price for days after the event, so an event older
 *      than the snapshot gap can still be the cause of the move.
 *   2. The five hosts publish at different times, up to a day or more apart
 *      (25.6h spread observed on 2026-08-16), so a board that has not refreshed
 *      lags the news by at least that.
 *   3. Each host almost certainly aggregates over some window of its own,
 *      length unknown, which stretches the tail further.
 *
 * Seven is a prior for the sum of those. The one empirical hook is the news
 * lookback timing test (RESEARCH_LOG.md finding 13): mover news fell a median
 * 3 days, mean 4.6, before the window end, directional only.
 *
 * TO BE MEASURED once enough history exists: for every verified catalyst with
 * a confirmed date, track rank_ave day by day after the event and record how
 * many days pass before the move stops. The median of that replaces this
 * constant. Until then, copy that mentions the window must say "assumed", not
 * "derived".
 *
 * (Before 2026-08-16 the price was a published seven day trailing mean and
 * this constant was derived from that spec, with catalysts further classified
 * as entering, overlap or leaving the mean. That classification depended on
 * knowing the window edges and was removed with the source.)
 */
export const CATALYST_LOOKBACK_DAYS = 7;

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Earliest catalyst date that can have contributed to a previous -> latest
 * move: CATALYST_LOOKBACK_DAYS - 1 days before the older snapshot. Filtering
 * catalysts to "on or after the previous snapshot" would discard events whose
 * reaction was still working through the price when the window opened.
 */
export function catalystLookbackStart(previousDate: string): string {
  return addDays(previousDate, -(CATALYST_LOOKBACK_DAYS - 1));
}

/** True when a catalyst date can have contributed to the previous -> latest move. */
export function inMoveWindow(
  catalystDate: string,
  previousDate: string,
  latestDate: string
): boolean {
  return catalystDate >= catalystLookbackStart(previousDate) && catalystDate <= latestDate;
}

export function evidenceFor(verifiedCatalystInWindow: boolean): Evidence {
  return verifiedCatalystInWindow
    ? {
        confirmed: true,
        label: "Catalyst-confirmed",
        note: "backed by a verified catalyst inside the lookback window of the move",
      }
    : {
        confirmed: false,
        label: "Unexplained, no verified catalyst yet",
        note: "the move is real but undocumented; watch, don't act",
      };
}
