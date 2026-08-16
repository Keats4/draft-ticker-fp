/**
 * Evidence tier: the honesty layer on top of a signal. A signal is a
 * reading, not a prediction; the evidence tier says whether that reading is
 * backed by a documented event or is still unexplained. It never upgrades a
 * reading into "act", "unexplained" explicitly means watch, don't act.
 *
 * catalyst-confirmed: a verified (non-sample) catalyst exists inside the
 *   lookback that can actually have moved the price. See below, that lookback
 *   is NOT the gap between the two snapshots.
 * unexplained: no verified catalyst yet, the move is real but the "why" is
 *   not documented, so the fallback copy applies.
 */
export type Evidence = { confirmed: boolean; label: string; note: string };

/**
 * FFC ADP is a trailing mean over roughly this many days of drafts, not a
 * spot price. Everything below follows from that one fact.
 */
export const ADP_MEAN_DAYS = 7;

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The move between two daily snapshots is a difference of two overlapping
 * trailing means. With a 7 day mean and snapshots on Aug 10 and Aug 12:
 *
 *   Aug 10 ADP averages drafts from Aug 04 to Aug 10
 *   Aug 12 ADP averages drafts from Aug 06 to Aug 12
 *
 * so the delta is driven only by the drafts ENTERING the newer mean (Aug 11
 * to Aug 12) and the drafts LEAVING the older one (Aug 04 to Aug 05). Days in
 * the overlap (Aug 06 to Aug 10) sit in both means and largely cancel.
 *
 * The causally relevant lookback for a previous -> latest move is therefore
 * the OLDER mean's own window start, not the previous snapshot date. Filtering
 * catalysts to "on or after the previous snapshot" silently discards the
 * entire leaving edge, which is the half with the counterintuitive sign.
 */
export function catalystLookbackStart(previousDate: string): string {
  return addDays(previousDate, -(ADP_MEAN_DAYS - 1));
}

export type WindowEdge = "entering" | "overlap" | "leaving";

/**
 * Which part of the rolling window a catalyst sits in. Display only: it does
 * not gate the evidence tier, it explains the direction a reader should
 * expect.
 *
 * entering: inside the newer mean only. Pushes the move in the direction of
 *   the news.
 * leaving: inside the older mean only. Pushes the move AGAINST the direction
 *   of the news, because the reaction is ageing out of the trailing average.
 * overlap: inside both means. Largely cancels, so it carries the least
 *   explanatory weight even though it is the most recent-looking.
 */
export function windowEdge(
  catalystDate: string,
  previousDate: string,
  latestDate: string
): WindowEdge | null {
  const latestStart = catalystLookbackStart(latestDate);
  const prevStart = catalystLookbackStart(previousDate);
  if (catalystDate > previousDate && catalystDate <= latestDate) return "entering";
  if (catalystDate >= prevStart && catalystDate < latestStart) return "leaving";
  if (catalystDate >= latestStart && catalystDate <= previousDate) return "overlap";
  return null;
}

/** True when a catalyst date can have contributed to the previous -> latest move. */
export function inMoveWindow(
  catalystDate: string,
  previousDate: string,
  latestDate: string
): boolean {
  return windowEdge(catalystDate, previousDate, latestDate) !== null;
}

export function evidenceFor(verifiedCatalystInWindow: boolean): Evidence {
  return verifiedCatalystInWindow
    ? {
        confirmed: true,
        label: "Catalyst-confirmed",
        note: "backed by a verified catalyst inside the rolling window of the move",
      }
    : {
        confirmed: false,
        label: "Unexplained, no verified catalyst yet",
        note: "the move is real but undocumented; watch, don't act",
      };
}
