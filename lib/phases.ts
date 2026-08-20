/**
 * Calendar phase trust, in one place, keyed off the full set of signal_level
 * values that actually exist in data/calendar_phases.json.
 *
 * This file exists because the first version of the trust reading hardcoded
 * three levels (high, med, low) while the data carries four. `preseason` and
 * `stretch-run` are both `vhigh`, and preseason is the phase immediately after
 * training camp, so an unhandled level would have degraded to a generic
 * sentence within days rather than in November. It failed quietly, which is the
 * failure mode this repo keeps cataloguing.
 *
 * Two sides are now enforced, so neither half can drift without something going
 * red:
 *   - a level added to PhaseLevel without a reading is a TypeScript error,
 *     because TRUST_READING is a total Record over the union
 *   - a level added to the JSON that is not in the union fails
 *     lib/phases.test.ts
 */

export const SIGNAL_LEVELS = ["low", "med", "high", "vhigh"] as const;
export type PhaseLevel = (typeof SIGNAL_LEVELS)[number];

export function isPhaseLevel(v: string): v is PhaseLevel {
  return (SIGNAL_LEVELS as readonly string[]).includes(v);
}

/**
 * What the phase's trust level means for a reader looking at a move right now.
 * Total over PhaseLevel on purpose: adding a level to the union without a
 * sentence will not compile.
 */
export const TRUST_READING: Record<PhaseLevel, string> = {
  low: "Movement now usually reverses.",
  med: "Movement now is worth noting rather than acting on.",
  high: "Movement now is worth taking seriously.",
  vhigh: "Movement now is the strongest evidence the offseason calendar offers.",
};

/**
 * Trust level to show WHERE A MOVE IS DISPLAYED (story cards, hero, player
 * page movement line), rendered as the shared PhaseMeter with a short
 * "movement trust" label linking to the calendar. No phrase wording and no
 * phase name on the cards: the meter is the judgment, the calendar is the
 * why.
 *
 * `med` returns null ON PURPOSE: the meter appears only when the level
 * changes how the move should be read.
 *
 * WHICH PHASE GOVERNS: callers derive the level from currentPhase(today),
 * the phase at the move window's NEWEST date. Trust is a statement about
 * what movement observed now is worth, so when a window spans a phase
 * boundary the newer phase governs; the drafter is deciding today, not on
 * the window's first day.
 */
export function moveTrustLevel(level: string): PhaseLevel | null {
  if (isPhaseLevel(level)) return level === "med" ? null : level;
  console.error(
    `[calendar] unhandled signal_level "${level}" in moveTrustLevel. Add it to SIGNAL_LEVELS in lib/phases.ts.`
  );
  return null;
}

/**
 * Loud rather than quiet. An unknown level logs an error and renders text that
 * reads as a defect, not as intentional copy, so it cannot pass for a
 * deliberate hedge on a live page. The build-time guards above are the real
 * enforcement; this is the runtime backstop.
 */
export function trustReading(level: string): string {
  if (isPhaseLevel(level)) return TRUST_READING[level];
  console.error(
    `[calendar] unhandled signal_level "${level}". Add it to SIGNAL_LEVELS and TRUST_READING in lib/phases.ts.`
  );
  return `Unhandled trust level "${level}", this is a bug rather than a reading.`;
}

// ---------------------------------------------------------------------------
// Which phase is current, derived from today rather than a hand set flag.
//
// The `current` boolean is gone from data/calendar_phases.json. It was set by
// hand and never advanced, so on 2026-08-15, with preseason games under way,
// the site still said Training Camp and told every reader that movement was
// worth "high" trust when the calendar's own rating for preseason is "vhigh".
// The one question the product exists to answer was being answered from a
// stale input.
//
// Ranges are contiguous and non-overlapping, so exactly one phase matches any
// covered date. The offseason tail (2027-01-11 to the following draft) is not
// covered by design: rather than invent a phase, currentPhase() returns the
// most recently ended one and sets inGap, so a caller can say so instead of
// pretending.
// ---------------------------------------------------------------------------

export type Phase = {
  key: string;
  title: string;
  window: string;
  start: string;
  end: string;
  /** Narrowed on purpose. lib/phases.test.ts asserts every signal_level in
   *  data/calendar_phases.json is one of these, so the cast at each import site
   *  is backed by a test rather than by hope. */
  signal_level: PhaseLevel;
  card_line: string;
  how_to_read?: string;
  sections?: Record<string, string>;
};

/** Today in America/Los_Angeles as YYYY-MM-DD. The product's day boundary is
 *  PT because the snapshot cron runs at 6:00 AM PT. */
export function todayPT(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type CurrentPhase = {
  phase: Phase | null;
  index: number;
  inGap: boolean;
};

/** ISO date strings compare correctly as strings, so no Date parsing is needed. */
export function currentPhase(phases: Phase[], today: string = todayPT()): CurrentPhase {
  const i = phases.findIndex((p) => p.start <= today && today <= p.end);
  if (i >= 0) return { phase: phases[i], index: i, inGap: false };

  // Outside every range: fall back to the most recently ended phase and say so.
  let best = -1;
  for (let j = 0; j < phases.length; j++) {
    if (phases[j].end < today && (best === -1 || phases[j].end > phases[best].end)) best = j;
  }
  if (best === -1) return { phase: null, index: -1, inGap: true };
  return { phase: phases[best], index: best, inGap: true };
}

/** True when this phase is the current one, replacing the old `current` field. */
export function isCurrentPhase(phases: Phase[], key: string, today: string = todayPT()): boolean {
  const c = currentPhase(phases, today);
  return !c.inGap && c.phase?.key === key;
}
