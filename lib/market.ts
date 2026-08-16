import {
  adpEcrGap,
  matchFfcToFp,
  movement,
  signalLabel,
  type FfcLite,
  type FpLite,
  type Signal,
} from "@/lib/math";
import { adpInUniverse, ecrComparable, gapReason, isTracked } from "@/lib/universe";
import type { FfcPlayer } from "@/lib/types";

export type MarketRow = {
  ffcId: number;
  sleeperId: string | null;
  name: string;
  position: string;
  team: string;
  bye: number;
  adp: number;
  adpFormatted: string;
  adpRank: number;
  /** Rank within position by ADP across the tracked universe: the RB24 a
   *  drafter actually thinks in. Derived, not sourced. */
  posRank: number;
  /** Rank within position by expert rank, over the players we have an ECR for. */
  ecrPosRank: number | null;
  timesDrafted: number;
  ecr: number | null;
  ecrDelta: number | null;
  /** ADP − ECR, ONLY when the player is in the comparison universe and
   *  ECR is comparable; otherwise null (never a fake giant gap). */
  gap: number | null;
  /** why gap is null, for honest UI copy; null when a gap is shown. */
  gapReason: string | null;
  inUniverse: boolean;
  adpDelta: number | null;
  signal: Signal | null;
  joinMethod: "map" | "name-fallback" | "none";
};

export type JoinReview = {
  unmatched: string[];
  ambiguous: string[];
  teamMismatch: string[];
  viaMap: number;
  viaFallback: number;
};

export type MapByFfc = Record<number, { sleeper_id: string; fp_id?: number }>;

/** Assemble Market rows. Join order: mapping table first (Sleeper
 *  canonical), name-matching fallback only for rows the map doesn't
 *  cover. Gaps are computed ONLY inside the comparison universe
 *  (see lib/universe.ts). Movement/signal inputs stay null when history
 *  is missing. ADP rank is the array index, so `latest` is sorted
 *  ascending by ADP here rather than trusting the source's order, the
 *  universe filter keys off that rank, so an out-of-order pull would
 *  silently admit or exclude the wrong players. */
export function buildMarketRows(
  latest: FfcPlayer[],
  previous: FfcPlayer[] | null,
  fpPlayers: FpLite[],
  mapByFfc: MapByFfc | null = null,
  previousEcrByFpId: Record<number, number> | null = null
): { rows: MarketRow[]; review: JoinReview } {
  const fpById = new Map<number, FpLite>();
  for (const p of fpPlayers) fpById.set(p.player_id, p);

  // Defensive: copy before sorting so the caller's array is never mutated.
  // Kickers and defenses are dropped BEFORE ranking, so adpRank counts only
  // tracked players. adp itself is never recomputed: it stays the source's
  // average pick from drafts those positions were part of.
  const ordered: FfcPlayer[] = [...latest]
    .filter((p) => isTracked(p.position))
    .sort((a, b) => a.adp - b.adp);

  const residual: FfcLite[] = ordered
    .filter((p) => !(mapByFfc && mapByFfc[p.player_id]?.fp_id != null))
    .map((p) => ({
      player_id: p.player_id,
      name: p.name,
      team: p.team,
      position: p.position,
    }));
  const fallback = matchFfcToFp(residual, fpPlayers);

  const prevAdp = new Map<number, number>();
  if (previous) for (const p of previous) prevAdp.set(p.player_id, p.adp);

  let viaMap = 0;
  let viaFallback = 0;

  // Positional rank by ADP. `ordered` is already sorted by ADP ascending and
  // already excludes kickers and defenses, so a running counter per position is
  // the rank a drafter means by "RB24".
  const posSeen: Record<string, number> = {};
  const posRankByFfc = new Map<number, number>();
  for (const p of ordered) {
    posSeen[p.position] = (posSeen[p.position] ?? 0) + 1;
    posRankByFfc.set(p.player_id, posSeen[p.position]);
  }

  const rows: MarketRow[] = ordered.map((p, i) => {
    const adpRank = i + 1;
    const posRank = posRankByFfc.get(p.player_id)!;
    const mapEntry = mapByFfc?.[p.player_id] ?? null;
    let fp: FpLite | null = null;
    let joinMethod: MarketRow["joinMethod"] = "none";
    if (mapEntry?.fp_id != null && fpById.has(mapEntry.fp_id)) {
      fp = fpById.get(mapEntry.fp_id)!;
      joinMethod = "map";
      viaMap++;
    } else {
      const hit = fallback.matched.get(p.player_id) ?? null;
      if (hit) {
        fp = hit;
        joinMethod = "name-fallback";
        viaFallback++;
      }
    }

    const fpId = fp ? fp.player_id : null;
    const ecr = fp ? fp.rank_ecr : null;

    const inUniverse = adpInUniverse(adpRank, p.times_drafted);
    const comparable = inUniverse && ecrComparable(ecr);
    const gap = comparable ? adpEcrGap(p.adp, ecr) : null;
    const reason = gap === null ? gapReason(adpRank, p.times_drafted, ecr) : null;

    const adpDelta = movement(p.adp, prevAdp.get(p.player_id) ?? null);
    const ecrDelta =
      fpId != null && previousEcrByFpId
        ? movement(ecr, previousEcrByFpId[fpId] ?? null)
        : null;
    // Signals only inside the comparison universe.
    const signal = comparable ? signalLabel({ adpDelta, ecrDelta, gap }) : null;

    return {
      ffcId: p.player_id,
      sleeperId: mapEntry?.sleeper_id ?? null,
      name: p.name,
      position: p.position,
      team: p.team,
      bye: p.bye,
      adp: p.adp,
      adpFormatted: p.adp_formatted,
      adpRank,
      posRank,
      ecrPosRank: null,
      timesDrafted: p.times_drafted,
      ecr,
      ecrDelta,
      gap,
      gapReason: reason,
      inUniverse,
      adpDelta,
      signal,
      joinMethod,
    };
  });

  // Positional rank by expert opinion, over the players we hold an ECR for.
  // Second pass because ecr is resolved per row above. Caveat worth knowing:
  // this is OUR positional rank derived from FantasyPros' overall ECR across
  // the players we matched, not FantasyPros' own published positional rank. A
  // player they rank but we failed to join shifts every rank below him.
  const withEcr = rows
    .filter((r) => r.ecr != null)
    .slice()
    .sort((x, y) => x.ecr! - y.ecr!);
  const ecrSeen: Record<string, number> = {};
  for (const r of withEcr) {
    ecrSeen[r.position] = (ecrSeen[r.position] ?? 0) + 1;
    r.ecrPosRank = ecrSeen[r.position];
  }

  const review: JoinReview = {
    unmatched: fallback.unmatched.map((u) => u.name),
    ambiguous: fallback.ambiguous.map((a) => a.ffc.name),
    teamMismatch: fallback.teamMismatch.map((t) => t.ffc.name),
    viaMap,
    viaFallback,
  };

  // Runtime log. The Methodology page states that cross-source joins are logged
  // for human review; this is that log. Only fires when there is something to
  // report, so a clean join stays silent.
  if (review.unmatched.length || review.ambiguous.length || review.teamMismatch.length) {
    console.warn(
      `[join-review] viaMap=${review.viaMap} viaFallback=${review.viaFallback} ` +
        `unmatched=${review.unmatched.length}[${review.unmatched.join(", ")}] ` +
        `ambiguous=${review.ambiguous.length}[${review.ambiguous.join(", ")}] ` +
        `teamMismatch=${review.teamMismatch.length}[${review.teamMismatch.join(", ")}]`
    );
  }

  return { rows, review };
}
