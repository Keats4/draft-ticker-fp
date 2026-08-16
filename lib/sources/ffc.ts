import type { FfcMeta, FfcPlayer } from "@/lib/types";

export const FFC_URL =
  "https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026";

export async function fetchFfcAdp(): Promise<{
  meta: FfcMeta;
  players: FfcPlayer[];
}> {
  const res = await fetch(FFC_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FFC responded ${res.status}`);
  }
  const data = await res.json();
  if (data.status !== "Success" || !Array.isArray(data.players)) {
    throw new Error(`FFC unexpected payload: status=${data.status}`);
  }
  return { meta: data.meta as FfcMeta, players: data.players as FfcPlayer[] };
}
