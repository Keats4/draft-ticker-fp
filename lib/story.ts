import { THRESHOLDS, type Signal } from "@/lib/math";

/**
 * Story ranking: the ONLY thing that decides what the homepage leads with.
 * The hero card and the "This week's stories" row both read from here, so no
 * player is ever hardcoded and the lead changes on its own as the data does.
 *
 * Weight dominates magnitude: what the label SAYS matters more than how far
 * the number moved. "Broad agreement" scores 0 and can never be a story, * agreement is the absence of one, not a weak version of one.
 */
export const SIGNAL_WEIGHT: Record<Signal, number> = {
  "Market and experts diverging": 4,
  "Market and experts converging": 3,
  "Market moving faster": 3,
  "Experts moving first": 3,
  "Market catching up to experts": 2,
  "Broad agreement": 0,
};

export type Rankable = {
  signal: Signal | null;
  adpDelta: number | null;
  ecrDelta: number | null;
  gap: number | null;
  inUniverse: boolean;
  adpRank: number;
};

/**
 * Higher = stronger story; 0 = not a story at all.
 * Movement is measured in threshold-multiples so an ADP move and an ECR move
 * are on one scale, and the gap only ever breaks near-ties.
 */
export function signalStrength(r: Rankable): number {
  if (r.signal === null || !r.inUniverse) return 0;
  const weight = SIGNAL_WEIGHT[r.signal];
  if (weight === 0) return 0;
  const move =
    Math.abs(r.adpDelta ?? 0) / THRESHOLDS.ADP_MOVE +
    Math.abs(r.ecrDelta ?? 0) / THRESHOLDS.ECR_MOVE;
  const gap = Math.abs(r.gap ?? 0) / THRESHOLDS.GAP_NOTABLE;
  return weight * 1000 + move * 10 + gap;
}

/** Strongest first. Ties break toward the costlier player (lower ADP rank). */
export function rankStories<T extends Rankable>(rows: T[]): T[] {
  return rows
    .filter((r) => signalStrength(r) > 0)
    .sort(
      (a, b) => signalStrength(b) - signalStrength(a) || a.adpRank - b.adpRank
    );
}

/**
 * Mirror pairs: the higher-order story type.
 *
 * One event that pushes two prices in opposite directions says more than any
 * single-player reading, so a qualifying pair outranks every single story.
 *
 * Qualifying is data-driven and deliberately NOT strict about symmetry. ADP is
 * an average of real human drafts, so two backfield-mates will not move by
 * equal and opposite amounts, and demanding that would throw away true stories.
 * What is required is that both sides are comparable and that at least one has
 * cleared the ADP movement bar; the
 * score then REWARDS opposition rather than requiring it, and the card states
 * the measured directions rather than asserting a mirror.
 *
 * The pair LIST is curated in data/featured.json; which pair leads, and whether
 * any pair leads at all, is decided here.
 */
export function pairStrength<T extends Rankable>(
  a: T,
  b: T,
  sharedEvent: boolean
): number {
  if (!a.inUniverse || !b.inUniverse) return 0;
  if (a.signal === null || b.signal === null) return 0;
  if (a.adpDelta == null || b.adpDelta == null) return 0;
  // At least one side must clear the published ADP bar. The old test excluded a
  // pair only when BOTH deltas were exactly zero, so a pair could lead the
  // homepage on +2.3 against -0.1, with a large red arrow on a side that had
  // effectively not moved and copy claiming one back's gain was showing up as
  // the other's loss. "Actually moving" now means what the rest of the product
  // means by it.
  const moved =
    Math.abs(a.adpDelta) >= THRESHOLDS.ADP_MOVE ||
    Math.abs(b.adpDelta) >= THRESHOLDS.ADP_MOVE;
  if (!moved) return 0;
  const opposed = a.adpDelta * b.adpDelta < 0;
  const spread =
    (Math.abs(a.adpDelta) + Math.abs(b.adpDelta)) / THRESHOLDS.ADP_MOVE;
  // A shared, documented event is what makes it one story instead of two.
  return (sharedEvent ? 10_000 : 5_000) + (opposed ? 500 : 0) + spread * 10;
}

/** True when the two sides moved in genuinely opposite directions this window. */
export function isOpposed(a: Rankable, b: Rankable): boolean {
  return (
    a.adpDelta != null && b.adpDelta != null && a.adpDelta * b.adpDelta < 0
  );
}

/**
 * ---- The single colour semantic ----
 *
 * Green means good for the drafter: cheaper than the experts rank him.
 * Red means you are paying up. It applies to the VALUE READ only, which is
 * the gap and the rounds figure derived from it.
 *
 * Movement is deliberately excluded. A falling ADP is a falling price, so
 * painting it red would contradict the rule above on the same card.
 * Movement gets a direction arrow and neutral text instead.
 *
 * Colour never carries the meaning alone: every coloured figure ships with
 * the word from valueWord(), so the read survives a screenshot and a
 * colourblind reader. Arrows are reserved for movement (a change); the gap
 * is a level and takes a word, so one glyph never means two things.
 */
export function valueTone(gap: number | null): string {
  if (gap === null || gap === 0) return "var(--ink-2)";
  return gap > 0 ? "var(--pos)" : "var(--neg)";
}

/** The word that carries the meaning when colour cannot. */
export function valueWord(gap: number | null): string | null {
  if (gap === null || gap === 0) return null;
  return gap > 0 ? "cheaper" : "paying up";
}

/**
 * A sentence specific to one player's own numbers.
 *
 * The three story cards previously all rendered `whatItMeans(signal, ...)`,
 * which is keyed on the label, so three cards carrying the same label printed
 * three identical sentences side by side. This uses the magnitude, the
 * direction and the size of the gap, so no two cards on one screen read the
 * same unless the underlying numbers really are the same.
 *
 * Rounds lead, because that is what a drafter thinks in. No new thresholds:
 * it reads THRESHOLDS.ADP_MOVE for what counts as a move and nothing else.
 *
 * It is now split in two. The story card leads with the MOVE, because the move
 * is the news on this site, and carries the value read underneath as the
 * price it implies. The wording of each half is unchanged from the single
 * sentence it replaces; only the order and the packaging changed.
 */
export type StoryRow = {
  name: string;
  adpDelta: number | null;
  ecrDelta: number | null;
  gap: number | null;
};

export type MoveRead = {
  /** Direction of the CHANGE. Arrows belong to movement and nothing else. */
  arrow: "▲" | "▼" | null;
  /** Plain language, neutral by rule: "Up 3.4 picks since Aug 10". */
  headline: string;
  /** What the experts did over the same window, or null when unknown. */
  expert: string | null;
};

export type ValueRead = {
  /** "About half a round cheaper than the experts rank him". */
  text: string;
  /** var(--pos) / var(--neg) / var(--ink-2). Meaning is also in the text. */
  tone: string;
};

/**
 * The move, in plain language. Neutral: no colour, direction lives in `arrow`.
 *
 * `moveWindow` is the real snapshot window, e.g. "since Aug 10". Passed in
 * rather than assumed: the window is 5 days, not a week, and the card must
 * not say something the footer contradicts.
 */
export function moveLine(r: StoryRow, moveWindow: string): MoveRead {
  const first = r.name.split(" ")[0];
  const move = r.adpDelta;

  let arrow: "▲" | "▼" | null = null;
  let headline: string;
  if (move == null) {
    headline = "No movement stored yet";
  } else if (move === 0) {
    headline = `${first} is unmoved ${moveWindow}`;
  } else {
    arrow = move > 0 ? "▲" : "▼";
    headline = `${first} is ${move > 0 ? "up" : "down"} ${Math.abs(move).toFixed(1)} picks ${moveWindow}`;
  }

  let expert: string | null = null;
  if (r.ecrDelta != null && Math.abs(r.ecrDelta) >= THRESHOLDS.ECR_MOVE) {
    expert = `Experts moved him ${r.ecrDelta > 0 ? "up" : "down"} ${Math.abs(r.ecrDelta)}.`;
  } else if (r.ecrDelta != null) {
    expert = "Experts have not moved him.";
  }

  return { arrow, headline, expert };
}

/**
 * The value read: the ONLY thing on the card that carries colour, and it
 * carries its own word too, so colour is never the sole signal.
 *
 * The closing clause is deliberately NOT forced to vary: two players
 * genuinely rounding to half a round is the data being honest, and
 * manufacturing a difference would invert the point.
 */
export function valueLine(r: StoryRow): ValueRead {
  if (r.gap == null) {
    return { text: "No comparable price for him", tone: "var(--ink-2)" };
  }
  const rounds = Math.abs(r.gap) / 12;
  const size =
    rounds < 0.4
      ? "Under half a round"
      : rounds < 0.9
        ? "About half a round"
        : `About ${Math.round(rounds * 2) / 2} rounds`;
  return {
    text:
      r.gap < 0
        ? `${size} ahead of where the experts rank him`
        : `${size} cheaper than the experts rank him`,
    tone: valueTone(r.gap),
  };
}

/** The old one-sentence form, value read first. Kept for non-card callers. */
export function storyLine(r: StoryRow, moveWindow: string): string {
  const m = moveLine(r, moveWindow);
  return `${valueLine(r).text}. ${m.headline}.${m.expert ? ` ${m.expert}` : ""}`;
}
