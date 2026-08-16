/**
 * Pure calculation layer. No I/O. Every threshold is exported so the UI
 * and methodology page render the same numbers the code uses.
 */

/** Thresholds (in picks / ranks). Rendered verbatim in the UI legend. */
export const THRESHOLDS = {
  /** Minimum ADP change (picks) to count as a real market move. */
  ADP_MOVE: 3,
  /** Minimum ECR change (ranks) to count as a real expert move. */
  ECR_MOVE: 2,
  /** |ADP − ECR| at or above this is a notable market/expert gap. */
  GAP_NOTABLE: 6,
} as const;

/** ADP − ECR. Positive: market drafts him later than experts rank him
 *  (potential value). Negative: market pays up earlier than the expert
 *  rank (paying a premium). Null when either side is missing. */
export function adpEcrGap(
  adp: number | null | undefined,
  ecr: number | null | undefined
): number | null {
  if (adp == null || ecr == null) return null;
  return round1(adp - ecr);
}

/** previous − current, so positive = rising (drafted earlier now).
 *  Null when either day is missing, never a fake zero. */
export function movement(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null) return null;
  return round1(previous - current);
}

export type SignalInput = {
  /** ADP movement over the window (positive = rising), or null. */
  adpDelta: number | null;
  /** ECR movement over the window (positive = rising), or null. */
  ecrDelta: number | null;
  /** Current ADP − ECR gap, or null. */
  gap: number | null;
};

export type Signal =
  | "Market moving faster"
  | "Experts moving first"
  | "Market catching up to experts"
  | "Market and experts diverging"
  | "Market and experts converging"
  | "Broad agreement";

/**
 * Rule-based signal. Returns null when there is not enough history to
 * say anything (e.g., day one), the UI must render that as "tracking",
 * never as a real label.
 */
export function signalLabel(input: SignalInput): Signal | null {
  const { adpDelta, ecrDelta, gap } = input;
  if (adpDelta == null || ecrDelta == null) return null;

  const adpMoved = Math.abs(adpDelta) >= THRESHOLDS.ADP_MOVE;
  const ecrMoved = Math.abs(ecrDelta) >= THRESHOLDS.ECR_MOVE;
  const sameDirection = adpDelta * ecrDelta > 0;

  if (adpMoved && ecrMoved && sameDirection) {
    return Math.abs(adpDelta) >= Math.abs(ecrDelta) * 1.5
      ? "Market moving faster"
      : "Broad agreement";
  }
  // Both sides cleared their threshold but moved in OPPOSITE directions.
  // Direction alone does not say whether they are pulling apart: two lines can
  // move opposite ways and still close the distance between them, depending on
  // which one started ahead. So test DISTANCE as well, using the prior gap
  // reconstructed from BOTH deltas (the ADP-only branch below can ignore the
  // ECR term because ECR did not clear its threshold there; here it did).
  if (adpMoved && ecrMoved) {
    const priorGap = gap != null ? gap + adpDelta - ecrDelta : null;
    const narrowing = priorGap != null && Math.abs(gap!) < Math.abs(priorGap);
    return narrowing
      ? "Market and experts converging"
      : "Market and experts diverging";
  }
  if (adpMoved && !ecrMoved) {
    // Market moved alone. If the move shrank the gap, the market is
    // converging on the expert view; otherwise it is out in front.
    const gapClosing =
      gap != null && Math.abs(gap) < Math.abs(gap + adpDelta);
    return gapClosing ? "Market catching up to experts" : "Market moving faster";
  }
  if (!adpMoved && ecrMoved) return "Experts moving first";
  return "Broad agreement";
}

/** Lowercased, punctuation-free, suffix-free form used for cross-source
 *  name joins. "Ja'Marr Chase" → "jamarr chase"; "D.J. Moore Jr." →
 *  "dj moore". */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'’\-]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type FpLite = {
  player_id: number;
  player_name: string;
  player_team_id: string;
  player_position_id: string;
  rank_ecr: number;
};

export type FfcLite = {
  player_id: number;
  name: string;
  team: string;
  position: string;
};

export type MatchResult = {
  /** ffc player_id → FP entry */
  matched: Map<number, FpLite>;
  /** matched on name+position but team disagreed (trade lag etc.) */
  teamMismatch: { ffc: FfcLite; fp: FpLite }[];
  /** no FP candidate at all, ECR must render as missing */
  unmatched: FfcLite[];
  /** more than one FP candidate, never auto-picked */
  ambiguous: { ffc: FfcLite; candidates: FpLite[] }[];
};

/**
 * Join FFC rows to FP rows. Key priority:
 *   1. normalized name + team + position (exact)
 *   2. normalized name + position (team tolerated, logged)
 * Anything else lands in unmatched or ambiguous. Nothing fails silently.
 */
export function matchFfcToFp(ffc: FfcLite[], fp: FpLite[]): MatchResult {
  const byNameTeamPos = new Map<string, FpLite[]>();
  const byNamePos = new Map<string, FpLite[]>();
  for (const p of fp) {
    const n = normalizeName(p.player_name);
    push(byNameTeamPos, `${n}|${p.player_team_id}|${p.player_position_id}`, p);
    push(byNamePos, `${n}|${p.player_position_id}`, p);
  }

  const result: MatchResult = {
    matched: new Map(),
    teamMismatch: [],
    unmatched: [],
    ambiguous: [],
  };

  for (const f of ffc) {
    const n = normalizeName(f.name);
    const exact = byNameTeamPos.get(`${n}|${f.team}|${f.position}`) ?? [];
    if (exact.length === 1) {
      result.matched.set(f.player_id, exact[0]);
      continue;
    }
    if (exact.length > 1) {
      result.ambiguous.push({ ffc: f, candidates: exact });
      continue;
    }
    const loose = byNamePos.get(`${n}|${f.position}`) ?? [];
    if (loose.length === 1) {
      result.matched.set(f.player_id, loose[0]);
      result.teamMismatch.push({ ffc: f, fp: loose[0] });
      continue;
    }
    if (loose.length > 1) {
      result.ambiguous.push({ ffc: f, candidates: loose });
      continue;
    }
    result.unmatched.push(f);
  }
  return result;
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
