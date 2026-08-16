import type { FpLite } from "@/lib/math";

export const FP_URL =
  "https://api.fantasypros.com/public/v2/json/nfl/2026/consensus-rankings?position=ALL&scoring=PPR&type=draft&week=0";

export type FpEcrPayload = {
  rows: FpLite[];
  total_experts: number;
  public_api_limited: boolean;
  last_updated: string;
};

/** Official FantasyPros API, key from env only. Called once per day by
 *  the cron (respecting their limits), never per pageview. */
export async function fetchFpEcr(): Promise<FpEcrPayload> {
  const key = process.env.FANTASYPROS_API_KEY;
  if (!key) throw new Error("FANTASYPROS_API_KEY is not set");
  const res = await fetch(FP_URL, {
    headers: { "x-api-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FantasyPros responded ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.players)) {
    throw new Error("FantasyPros unexpected payload: players missing");
  }
  type FpRaw = FpLite & Record<string, unknown>;
  return {
    rows: (data.players as FpRaw[]).map((p) => ({
      player_id: p.player_id,
      player_name: p.player_name,
      player_team_id: p.player_team_id,
      player_position_id: p.player_position_id,
      rank_ecr: p.rank_ecr,
    })),
    total_experts: data.total_experts ?? 0,
    public_api_limited: Boolean(data.public_api_limited),
    last_updated: String(data.last_updated ?? ""),
  };
}
