/**
 * Primary price series: the FantasyPros composite host rank board.
 *
 * Source: /public/v2/json/nfl/2026/consensus-rankings?position=ALL&scoring=PPR
 *         &type=adp&week=0&experts=show
 *
 * The price is `rank_ave`: the AVERAGE of each contributing host board's rank
 * for the player (five hosts at time of writing). It is a rank averaged across
 * hosts, not a draft slot and not a pick number, and it is named as an average
 * host rank everywhere in this codebase.
 *
 * `rank_ecr` in the same payload is only the ordinal position of the row in
 * the list (1, 2, 3...). It is NOT carried into this type so that it can never
 * be read as a price.
 */
export type FpHostRankPlayer = {
  player_id: number;
  player_name: string;
  player_position_id: string;
  player_team_id: string;
  /** Null when the payload has no bye (free agents). */
  player_bye_week: number | null;
  /** Average host rank: mean of the ranks on the contributing host boards. */
  rank_ave: number;
  /** Lowest (best) rank across contributing host boards. */
  rank_min: number;
  /** Highest (worst) rank across contributing host boards. */
  rank_max: number;
  /** Standard deviation of the host ranks. */
  rank_std: number;
  /** Positional rank label from the source, e.g. "RB1". */
  pos_rank: string;
  /** Host id -> that host's rank for this player. Only contributing hosts appear. */
  experts: Record<string, number>;
  /** Derived: number of entries in `experts`, the count of hosts that rank the
   *  player. The coverage measure behind the liquidity bar. */
  source_count: number;
};

/**
 * Board level metadata carried exactly as the payload provides it. The payload
 * has no draft count, no sample size and no date window, and none is
 * synthesised here.
 */
export type FpHostRankMeta = {
  /** Host id -> publish timestamp string as sent by the source
   *  ("YYYY-MM-DD HH:MM:SS", timezone not stated by the source). */
  expert_pub: Record<string, string>;
  /** Host id -> host display name as sent by the source. */
  expert_names: Record<string, string>;
  /** Number of contributing hosts (entries in `expert_pub`). */
  source_count: number;
  /** Earliest of the per host publish times. */
  earliest_pub_at: string;
  /** Latest of the per host publish times. Hosts can publish more than 24 hours
   *  apart, so both ends are stored. Staleness keys off this field. */
  latest_pub_at: string;
};

export type Snapshot = {
  date: string; // YYYY-MM-DD, America/Los_Angeles
  captured_at: string; // ISO timestamp
  source: string;
  format: string;
  meta: FpHostRankMeta;
  rows: FpHostRankPlayer[];
};

export type EcrSnapshot = {
  date: string; // YYYY-MM-DD, America/Los_Angeles
  captured_at: string;
  source: string;
  total_experts: number;
  public_api_limited: boolean;
  rows: import("@/lib/math").FpLite[];
};
