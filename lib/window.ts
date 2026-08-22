/**
 * Canonical movement-window selection.
 *
 * Draft Ticker answers "what changed recently", so the primary movement
 * window must not keep growing from the first-ever capture. Policy:
 *
 * - The desired window is the latest MOVE_WINDOW_DAYS calendar dates:
 *   end date D back through D - (MOVE_WINDOW_DAYS - 1).
 * - While the shared history is shorter than that, the window is all
 *   available shared history ("Since <first shared date>").
 * - Once shared history reaches back to the cutoff or earlier, the window
 *   rolls: start = earliest valid shared date on or after the cutoff
 *   ("Last 7 days"). The oldest dates simply stop driving the primary move.
 *
 * Missing capture dates are never fabricated or interpolated: the start is
 * the earliest date that actually exists inside the desired window. This is
 * a product window choice, not a historically calibrated constant, and it is
 * deliberately separate from CATALYST_LOOKBACK_DAYS (lib/evidence.ts), which
 * extends evidence matching BEFORE whatever window is selected here.
 */
export const MOVE_WINDOW_DAYS = 7;

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type MoveWindow = {
  /** Window start date (YYYY-MM-DD), an actually stored shared date. */
  start: string;
  /** Window end date (YYYY-MM-DD), the newest shared date. */
  end: string;
  /**
   * True once shared history reaches the full MOVE_WINDOW_DAYS span (the
   * first shared date is on or before the cutoff), so consumer copy says
   * "Last 7 days". False while the window is still the whole short history,
   * where copy says "Since <start>".
   */
  rolling: boolean;
};

/**
 * Select the movement window from the sorted-or-unsorted list of dates both
 * series cover. Returns null when fewer than two usable dates exist (no
 * movement window; current values may still render).
 */
export function selectMoveWindow(sharedDates: string[]): MoveWindow | null {
  const shared = [...new Set(sharedDates)].sort();
  if (shared.length < 2) return null;
  const end = shared[shared.length - 1];
  const cutoff = addDays(end, -(MOVE_WINDOW_DAYS - 1));
  const rolling = shared[0] <= cutoff;
  const start = rolling ? shared.find((d) => d >= cutoff)! : shared[0];
  // A rolling window still needs two dates inside it; if captures inside the
  // desired span collapsed to the end date alone, there is no honest window.
  if (start === end) return null;
  return { start, end, rolling };
}
