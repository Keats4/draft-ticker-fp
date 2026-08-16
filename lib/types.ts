export type FfcPlayer = {
  player_id: number;
  name: string;
  position: string;
  team: string;
  adp: number;
  adp_formatted: string;
  times_drafted: number;
  high: number;
  low: number;
  stdev: number;
  bye: number;
};

export type FfcMeta = {
  type: string;
  teams: number;
  rounds: number;
  total_drafts: number;
  start_date: string;
  end_date: string;
};

export type Snapshot = {
  date: string; // YYYY-MM-DD, America/Los_Angeles
  captured_at: string; // ISO timestamp
  source: string;
  format: string;
  meta: FfcMeta;
  rows: FfcPlayer[];
};

export type EcrSnapshot = {
  date: string; // YYYY-MM-DD, America/Los_Angeles
  captured_at: string;
  source: string;
  total_experts: number;
  public_api_limited: boolean;
  rows: import("@/lib/math").FpLite[];
};
