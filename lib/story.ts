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
  hostRankDelta: number | null;
  ecrDelta: number | null;
  gap: number | null;
  inUniverse: boolean;
  hostRankOrdinal: number;
};

/**
 * Higher = stronger story; 0 = not a story at all.
 * Movement is measured in threshold-multiples so a host rank move and an ECR move
 * are on one scale, and the gap only ever breaks near-ties.
 */
export function signalStrength(r: Rankable): number {
  if (r.signal === null || !r.inUniverse) return 0;
  const weight = SIGNAL_WEIGHT[r.signal];
  if (weight === 0) return 0;
  const move =
    Math.abs(r.hostRankDelta ?? 0) / THRESHOLDS.HOST_RANK_MOVE +
    Math.abs(r.ecrDelta ?? 0) / THRESHOLDS.ECR_MOVE;
  const gap = Math.abs(r.gap ?? 0) / THRESHOLDS.GAP_NOTABLE;
  return weight * 1000 + move * 10 + gap;
}

/** Strongest first. Ties break toward the costlier player (lower host rank ordinal). */
export function rankStories<T extends Rankable>(rows: T[]): T[] {
  return rows
    .filter((r) => signalStrength(r) > 0)
    .sort(
      (a, b) => signalStrength(b) - signalStrength(a) || a.hostRankOrdinal - b.hostRankOrdinal
    );
}

/**
 * Mirror pairs: the higher-order story type.
 *
 * One event that pushes two prices in opposite directions says more than any
 * single-player reading, so a qualifying pair outranks every single story.
 *
 * Qualifying is data-driven and deliberately NOT strict about symmetry. The
 * average host rank is a mean across host boards, so two backfield-mates will
 * not move by equal and opposite amounts, and demanding that would throw away
 * true stories. What is required is that both sides are comparable and that
 * at least one has cleared the host rank movement bar; the
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
  if (a.hostRankDelta == null || b.hostRankDelta == null) return 0;
  // At least one side must clear the published host rank bar. The old test excluded a
  // pair only when BOTH deltas were exactly zero, so a pair could lead the
  // homepage on +2.3 against -0.1, with a large red arrow on a side that had
  // effectively not moved and copy claiming one back's gain was showing up as
  // the other's loss. "Actually moving" now means what the rest of the product
  // means by it.
  const moved =
    Math.abs(a.hostRankDelta) >= THRESHOLDS.HOST_RANK_MOVE ||
    Math.abs(b.hostRankDelta) >= THRESHOLDS.HOST_RANK_MOVE;
  if (!moved) return 0;
  const opposed = a.hostRankDelta * b.hostRankDelta < 0;
  const spread =
    (Math.abs(a.hostRankDelta) + Math.abs(b.hostRankDelta)) / THRESHOLDS.HOST_RANK_MOVE;
  // A shared, documented event is what makes it one story instead of two.
  return (sharedEvent ? 10_000 : 5_000) + (opposed ? 500 : 0) + spread * 10;
}

/** True when the two sides moved in genuinely opposite directions this window. */
export function isOpposed(a: Rankable, b: Rankable): boolean {
  return (
    a.hostRankDelta != null && b.hostRankDelta != null && a.hostRankDelta * b.hostRankDelta < 0
  );
}

/**
 * ---- The single colour semantic ----
 *
 * Green means a discount: the market prices him below the expert rank.
 * Red means a premium: you pay ahead of it. It applies to the VALUE READ
 * only, which is the gap and the rounds figure derived from it.
 *
 * Movement is deliberately excluded. A falling host rank is a falling price, so
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
  return gap > 0 ? "discount" : "premium";
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
 * it reads THRESHOLDS.HOST_RANK_MOVE for what counts as a move and nothing else.
 *
 * It is now split in two. The story card leads with the MOVE, because the move
 * is the news on this site, and carries the value read underneath as the
 * price it implies. The wording of each half is unchanged from the single
 * sentence it replaces; only the order and the packaging changed.
 */
export type StoryRow = {
  name: string;
  hostRankDelta: number | null;
  ecrDelta: number | null;
  gap: number | null;
};

export type MoveRead = {
  /** Direction of the CHANGE. Arrows belong to movement and nothing else. */
  arrow: "▲" | "▼" | null;
  /** Plain language, neutral by rule: "Up 3.4 spots since Aug 10". */
  headline: string;
  /** What the experts did over the same window, or null when unknown. */
  expert: string | null;
};

export type ValueRead = {
  /** "About half a round of discount on his expert rank". */
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
  const move = r.hostRankDelta;

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
        ? `${size} of premium on his expert rank`
        : `${size} of discount on his expert rank`,
    tone: valueTone(r.gap),
  };
}

/**
 * ---- The plain English lead ----
 *
 * The first thing on the homepage, written for a reader who knows none of
 * the site's vocabulary: no ADP, ECR, gap, signal or trust. It answers
 * "what changed since my last mock draft" in the shape "he is going N picks
 * earlier than three days ago", with what the experts did over the same
 * window as a second clause. Every fact is one already computed elsewhere
 * on the page; nothing here introduces a new threshold or measurement, and
 * the expert clause reads the same published bars the signals do.
 */

/** "three" for 3; digits past ten so the copy never says "seventeen days". */
const NUM_WORDS = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten",
] as const;
export function smallNumberWord(n: number): string {
  return n >= 0 && n <= 10 ? NUM_WORDS[n] : String(n);
}

export type LeadRead = {
  /** "Jonathon Brooks is going about 5 picks earlier than three days ago". */
  main: string;
  /** What the experts did over the same window, or null when unknown. */
  expert: string | null;
};

export function leadLine(
  r: Pick<StoryRow, "name" | "hostRankDelta" | "ecrDelta">,
  daysAgo: string
): LeadRead | null {
  const move = r.hostRankDelta;
  if (move == null || move === 0) return null;
  const size = Math.abs(move);
  // The price is an average rank, so deltas are usually fractional. A drafter
  // thinks in whole picks: "about 5 picks", never "5.2 picks". An exact
  // integer drops the "about" because rounding did not touch it.
  const whole = Math.round(size);
  const picksPhrase = `${Number.isInteger(size) ? size : `about ${whole}`} pick${whole === 1 ? "" : "s"}`;
  const main = `${r.name} is going ${picksPhrase} ${move > 0 ? "earlier" : "later"} than ${daysAgo}`;

  let expert: string | null = null;
  const e = r.ecrDelta;
  if (e != null) {
    if (Math.abs(e) < THRESHOLDS.ECR_MOVE) {
      expert = "The experts have not moved him.";
    } else if (e * move < 0) {
      expert = "The experts moved him the other way.";
    } else {
      const ratio = Math.abs(e) / size;
      expert =
        ratio >= 2 / 3 && ratio <= 1.5
          ? "The experts moved him almost exactly the same amount."
          : ratio < 1
            ? "The experts moved him the same way, but not as far."
            : "The experts moved him the same way, and even further.";
    }
  }
  return { main, expert };
}

/** The old one-sentence form, value read first. Kept for non-card callers. */
export function storyLine(r: StoryRow, moveWindow: string): string {
  const m = moveLine(r, moveWindow);
  return `${valueLine(r).text}. ${m.headline}.${m.expert ? ` ${m.expert}` : ""}`;
}
