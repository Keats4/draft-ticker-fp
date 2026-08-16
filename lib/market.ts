import {
  hostRankEcrGap,
  movement,
  signalLabel,
  type FpLite,
  type Signal,
} from "@/lib/math";
import { hostRankInUniverse, ecrComparable, gapReason, isTracked } from "@/lib/universe";
import type { FpHostRankPlayer } from "@/lib/types";

export type MarketRow = {
  /** FantasyPros player_id. The same id keys the ECR series. */
  fpId: number;
  sleeperId: string | null;
  name: string;
  position: string;
  team: string;
  bye: number | null;
  /** Average host rank: mean of the contributing host boards' ranks. The price. */
  hostRank: number;
  /** Our ordinal among tracked players sorted by hostRank (kickers and
   *  defenses excluded before ranking). Derived, not sourced. */
  hostRankOrdinal: number;
  /** Rank within position from the source's own `pos_rank` ("RB24" → 24). */
  posRank: number;
  /** Rank within position by expert rank, over the players we have an ECR for. */
  ecrPosRank: number | null;
  /** Number of host boards ranking the player. The liquidity measure. */
  sourceCount: number;
  ecr: number | null;
  ecrDelta: number | null;
  /** hostRank − ECR, ONLY when the player is in the comparison universe and
   *  ECR is comparable; otherwise null (never a fake giant gap). */
  gap: number | null;
  /** why gap is null, for honest UI copy; null when a gap is shown. */
  gapReason: string | null;
  inUniverse: boolean;
  hostRankDelta: number | null;
  signal: Signal | null;
};

/** FantasyPros player_id → Sleeper id, from data/player_map.json. Needed only
 *  for catalysts, featured and archetypes, which key on sleeper_id. The
 *  price/ECR join itself needs no map: both series share player_id. */
export type SleeperByFpId = Record<number, string>;

/** Player page URL: Sleeper id when mapped, else the FantasyPros id. */
export function playerHref(r: Pick<MarketRow, "sleeperId" | "fpId">): string {
  return `/player/${r.sleeperId ?? `fp-${r.fpId}`}`;
}

/** "RB24" → 24. Null if the label has no trailing number. */
export function parsePosRank(label: string): number | null {
  const m = /(\d+)$/.exec(label ?? "");
  return m ? Number(m[1]) : null;
}

/** Assemble Market rows. Price and ECR are joined on FantasyPros player_id
 *  directly. Gaps are computed ONLY inside the comparison universe (see
 *  lib/universe.ts). Movement/signal inputs stay null when history is
 *  missing. hostRankOrdinal is the array index, so `latest` is sorted
 *  ascending by hostRank here rather than trusting the source's order; the
 *  universe filter keys off that ordinal, so an out-of-order pull would
 *  silently admit or exclude the wrong players. */
export function buildMarketRows(
  latest: FpHostRankPlayer[],
  previous: FpHostRankPlayer[] | null,
  fpPlayers: FpLite[],
  sleeperByFpId: SleeperByFpId | null = null,
  previousEcrByFpId: Record<number, number> | null = null
): MarketRow[] {
  const fpById = new Map<number, FpLite>();
  for (const p of fpPlayers) fpById.set(p.player_id, p);

  // Defensive: copy before sorting so the caller's array is never mutated.
  // Kickers and defenses are dropped BEFORE ranking, so hostRankOrdinal counts
  // only tracked players. hostRank itself is never recomputed: it stays the
  // source's average across boards those positions were part of.
  const ordered: FpHostRankPlayer[] = [...latest]
    .filter((p) => isTracked(p.player_position_id))
    .sort((a, b) => a.rank_ave - b.rank_ave);

  const prevHostRank = new Map<number, number>();
  if (previous) for (const p of previous) prevHostRank.set(p.player_id, p.rank_ave);

  const rows: MarketRow[] = ordered.map((p, i) => {
    const hostRankOrdinal = i + 1;
    // Source positional rank; fall back to our ordinal-within-position only if
    // the label is malformed, so the field is never null.
    const posRank = parsePosRank(p.pos_rank) ?? hostRankOrdinal;
    const fp = fpById.get(p.player_id) ?? null;
    const ecr = fp ? fp.rank_ecr : null;

    const inUniverse = hostRankInUniverse(hostRankOrdinal, p.source_count);
    const comparable = inUniverse && ecrComparable(ecr);
    const gap = comparable ? hostRankEcrGap(p.rank_ave, ecr) : null;
    const reason = gap === null ? gapReason(hostRankOrdinal, p.source_count, ecr) : null;

    const hostRankDelta = movement(p.rank_ave, prevHostRank.get(p.player_id) ?? null);
    const ecrDelta =
      fp && previousEcrByFpId ? movement(ecr, previousEcrByFpId[p.player_id] ?? null) : null;
    // Signals only inside the comparison universe.
    const signal = comparable ? signalLabel({ hostRankDelta, ecrDelta, gap }) : null;

    return {
      fpId: p.player_id,
      sleeperId: sleeperByFpId?.[p.player_id] ?? null,
      name: p.player_name,
      position: p.player_position_id,
      team: p.player_team_id,
      bye: p.player_bye_week,
      hostRank: p.rank_ave,
      hostRankOrdinal,
      posRank,
      ecrPosRank: null,
      sourceCount: p.source_count,
      ecr,
      ecrDelta,
      gap,
      gapReason: reason,
      inUniverse,
      hostRankDelta,
      signal,
    };
  });

  // Positional rank by expert opinion, over the players we hold an ECR for.
  // Second pass because ecr is resolved per row above. Caveat worth knowing:
  // this is OUR positional rank derived from FantasyPros' overall ECR across
  // the tracked players, not FantasyPros' own published positional rank.
  const withEcr = rows
    .filter((r) => r.ecr != null)
    .slice()
    .sort((x, y) => x.ecr! - y.ecr!);
  const ecrSeen: Record<string, number> = {};
  for (const r of withEcr) {
    ecrSeen[r.position] = (ecrSeen[r.position] ?? 0) + 1;
    r.ecrPosRank = ecrSeen[r.position];
  }

  return rows;
}
