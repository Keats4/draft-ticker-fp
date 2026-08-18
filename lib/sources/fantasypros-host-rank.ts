import type { FpHostRankMeta, FpHostRankPlayer } from "@/lib/types";

/**
 * FantasyPros composite host rank: the PRIMARY price series.
 *
 * The price is `rank_ave`, the average of the contributing host boards' ranks
 * for a player. It is an average host rank, not a draft slot. `rank_ecr` in
 * this payload is only the row ordinal and is deliberately not read.
 *
 * `experts=show` adds the per host rank map (`experts`) and the per host
 * publish times (`expert_pub`), which is where `source_count` and the publish
 * window come from.
 */
export const FP_HOST_RANK_URL =
  "https://api.fantasypros.com/public/v2/json/nfl/2026/consensus-rankings?position=ALL&scoring=PPR&type=adp&week=0&experts=show";

/** Hard ceiling on the call so the daily cron can never hang on this source. */
export const FP_HOST_RANK_TIMEOUT_MS = 15_000;

/** Raw row shape as received. Numerics arrive as strings. */
export type RawHostRankRow = {
  player_id: number;
  player_name: string;
  player_position_id: string;
  player_team_id: string;
  player_bye_week: string | number | null;
  rank_ave: string | number;
  rank_min: string | number;
  rank_max: string | number;
  rank_std: string | number;
  pos_rank: string;
  experts?: Record<string, string | number>;
};

type RawPayload = {
  players: RawHostRankRow[];
  expert_pub?: Record<string, string>;
  expert_names?: Record<string, string>;
};

const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Map one raw row to the typed row, or null if it has no usable average host
 *  rank. Rows without a price are dropped rather than stored as NaN. */
export function toHostRankPlayer(raw: RawHostRankRow): FpHostRankPlayer | null {
  const rank_ave = num(raw.rank_ave);
  if (rank_ave === null) return null;
  const experts: Record<string, number> = {};
  for (const [hostId, r] of Object.entries(raw.experts ?? {})) {
    const n = num(r);
    if (n !== null) experts[hostId] = n;
  }
  return {
    player_id: raw.player_id,
    player_name: raw.player_name,
    player_position_id: raw.player_position_id,
    player_team_id: raw.player_team_id,
    player_bye_week: num(raw.player_bye_week),
    rank_ave,
    rank_min: num(raw.rank_min) ?? rank_ave,
    rank_max: num(raw.rank_max) ?? rank_ave,
    rank_std: num(raw.rank_std) ?? 0,
    pos_rank: raw.pos_rank,
    experts,
    source_count: Object.keys(experts).length,
  };
}

/** Typed rows from a raw payload's `players` array. Used by the pages for the
 *  NOT LIVE fixture fallback (fixtures/fp_host_rank.json is the raw payload). */
export function toHostRankPlayers(players: RawHostRankRow[]): FpHostRankPlayer[] {
  return players
    .map(toHostRankPlayer)
    .filter((p): p is FpHostRankPlayer => p !== null);
}

/** Build the board metadata from the payload's own fields only. */
export function toHostRankMeta(raw: RawPayload): FpHostRankMeta {
  const expert_pub = raw.expert_pub ?? {};
  const expert_names = raw.expert_names ?? {};
  const pubs = Object.values(expert_pub).filter((s) => typeof s === "string" && s.length > 0);
  if (pubs.length === 0) {
    throw new Error("FantasyPros host rank unexpected payload: expert_pub missing");
  }
  // "YYYY-MM-DD HH:MM:SS" sorts lexically in time order.
  const sorted = [...pubs].sort();
  return {
    expert_pub,
    expert_names,
    source_count: Object.keys(expert_pub).length,
    earliest_pub_at: sorted[0],
    latest_pub_at: sorted[sorted.length - 1],
  };
}

export async function fetchFpHostRank(): Promise<{
  meta: FpHostRankMeta;
  players: FpHostRankPlayer[];
  /** The payload EXACTLY as received, untouched by the converters. Stored
   *  under adp-fp/<date>.json so the typed series can always be rebuilt from
   *  source (scripts/backfill_host_rank.mjs) if a converter bug or a stall
   *  corrupts it. */
  payload: RawPayload;
}> {
  const key = process.env.FANTASYPROS_API_KEY;
  if (!key) throw new Error("FANTASYPROS_API_KEY is not set");
  const res = await fetch(FP_HOST_RANK_URL, {
    headers: { "x-api-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(FP_HOST_RANK_TIMEOUT_MS),
  });
  if (!res.ok) {
    // 429 happens. Never retried in-loop; the caller reports the failure.
    throw new Error(`FantasyPros host rank responded ${res.status}`);
  }
  const data = (await res.json()) as RawPayload;
  if (!Array.isArray(data.players)) {
    throw new Error("FantasyPros host rank unexpected payload: players missing");
  }
  const meta = toHostRankMeta(data);
  const players = toHostRankPlayers(data.players);
  return { meta, players, payload: data };
}
