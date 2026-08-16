import { list, put } from "@vercel/blob";
import type { EcrSnapshot, Snapshot } from "@/lib/types";
import type { FpAdpRaw } from "@/lib/sources/fantasypros-adp";

export type HistoryRow = {
  date: string;
  player_id: number;
  name: string;
  position: string;
  team: string;
  adp: number;
};

const HISTORY_PATH = "history.json";

/** Today's date string (YYYY-MM-DD) in America/Los_Angeles. */
export function laDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(d);
}

async function putJson(path: string, data: unknown): Promise<string> {
  const blob = await put(path, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return blob.url;
}

async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: pathname });
    const hit = blobs.find((b) => b.pathname === pathname);
    if (!hit) return null;
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Save the daily snapshot file AND append the day's rows to history.json.
 *  Idempotent: re-running on the same date replaces that date's entries. */
export async function saveSnapshot(snapshot: Snapshot): Promise<string> {
  const url = await putJson(`snapshots/${snapshot.date}.json`, snapshot);

  const existing = (await readJsonBlob<HistoryRow[]>(HISTORY_PATH)) ?? [];
  const kept = existing.filter((r) => r.date !== snapshot.date);
  const todays: HistoryRow[] = snapshot.rows.map((p) => ({
    date: snapshot.date,
    player_id: p.player_id,
    name: p.name,
    position: p.position,
    team: p.team,
    adp: p.adp,
  }));
  await putJson(HISTORY_PATH, [...kept, ...todays]);

  return url;
}

/** Newest stored snapshot, or null if none / blob unavailable. */
export async function loadLatestSnapshot(): Promise<Snapshot | null> {
  const { latest } = await loadLatestTwoSnapshots();
  return latest;
}

/** Newest and second-newest snapshots (previous is null on day one). */
export async function loadLatestTwoSnapshots(): Promise<{
  latest: Snapshot | null;
  previous: Snapshot | null;
}> {
  try {
    const { blobs } = await list({ prefix: "snapshots/" });
    if (blobs.length === 0) return { latest: null, previous: null };
    const sorted = [...blobs].sort((a, b) =>
      a.pathname < b.pathname ? 1 : -1
    );
    const [latest, previous] = await Promise.all([
      fetchSnapshot(sorted[0]?.url),
      fetchSnapshot(sorted[1]?.url),
    ]);
    return { latest, previous };
  } catch {
    return { latest: null, previous: null };
  }
}

/** OLDEST and NEWEST stored ADP snapshots. The move window spans these two, so
 *  a delta covers all tracked history rather than a single overlapping day.
 *  Returns first === null when only one date is stored (no window yet). */
export async function loadFirstAndLatestSnapshots(): Promise<{
  first: Snapshot | null;
  latest: Snapshot | null;
}> {
  try {
    const { blobs } = await list({ prefix: "snapshots/" });
    if (blobs.length === 0) return { first: null, latest: null };
    const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
    const [first, latest] = await Promise.all([
      fetchSnapshot(sorted[0]?.url),
      fetchSnapshot(sorted[sorted.length - 1]?.url),
    ]);
    if (!first || !latest || first.date === latest.date) {
      return { first: null, latest: latest ?? first };
    }
    return { first, latest };
  } catch {
    return { first: null, latest: null };
  }
}

async function fetchSnapshot(url?: string): Promise<Snapshot | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Snapshot;
  } catch {
    return null;
  }
}

/** Full accumulated history (all dates, all players), or empty array. */
export async function loadHistory(): Promise<HistoryRow[]> {
  return (await readJsonBlob<HistoryRow[]>(HISTORY_PATH)) ?? [];
}

export async function saveEcrSnapshot(snapshot: EcrSnapshot): Promise<string> {
  return putJson(`ecr/${snapshot.date}.json`, snapshot);
}

/**
 * The parallel FantasyPros composite ADP series.
 *
 * Stored under its own prefix, `adp-fp/`, alongside `snapshots/` (FFC) and
 * `ecr/`. Nothing in the product reads it; it exists so a second series
 * accumulates from tonight rather than from whenever we decide we want one.
 *
 * The envelope is deliberately thin. `payload` is the vendor response exactly
 * as received, all players, every field, nothing trimmed or renamed, because
 * what gets stored tonight bounds every decision that can be made later.
 */
export type FpAdpSnapshot = {
  date: string;
  captured_at: string;
  source: string;
  payload: FpAdpRaw;
};

export async function saveFpAdpSnapshot(snapshot: FpAdpSnapshot): Promise<string> {
  return putJson(`adp-fp/${snapshot.date}.json`, snapshot);
}

/** Newest stored FantasyPros ADP snapshot, or null. Read by /adp-sources only. */
export async function loadLatestFpAdpSnapshot(): Promise<FpAdpSnapshot | null> {
  try {
    const { blobs } = await list({ prefix: "adp-fp/" });
    if (blobs.length === 0) return null;
    const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
    return await fetchJson<FpAdpSnapshot>(sorted[0]?.url);
  } catch {
    return null;
  }
}

/** Newest and second-newest ECR snapshots (either may be null). */
export async function loadLatestTwoEcrSnapshots(): Promise<{
  latest: EcrSnapshot | null;
  previous: EcrSnapshot | null;
}> {
  try {
    const { blobs } = await list({ prefix: "ecr/" });
    if (blobs.length === 0) return { latest: null, previous: null };
    const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
    const [latest, previous] = await Promise.all([
      fetchJson<EcrSnapshot>(sorted[0]?.url),
      fetchJson<EcrSnapshot>(sorted[1]?.url),
    ]);
    return { latest, previous };
  } catch {
    return { latest: null, previous: null };
  }
}

/** EVERY stored ECR snapshot, oldest first. The player chart and the homepage
 *  hero build their expert series from this, not from the newest two files, *  otherwise the expert line is capped at two points while the market line
 *  keeps growing with ADP history. */
export async function loadAllEcrSnapshots(): Promise<EcrSnapshot[]> {
  try {
    const { blobs } = await list({ prefix: "ecr/" });
    if (blobs.length === 0) return [];
    const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
    const snaps = await Promise.all(sorted.map((b) => fetchJson<EcrSnapshot>(b.url)));
    return snaps.filter((x): x is EcrSnapshot => x !== null);
  } catch {
    return [];
  }
}

/** date -> rank_ecr for one FantasyPros id, across every stored ECR snapshot.
 *  Missing days are simply absent; nothing is interpolated or carried forward. */
export function ecrSeriesFor(
  snapshots: EcrSnapshot[],
  fpId: number | null | undefined
): Map<string, number> {
  const out = new Map<string, number>();
  if (fpId == null) return out;
  for (const snap of snapshots) {
    const hit = snap.rows.find((r) => r.player_id === fpId);
    if (hit) out.set(snap.date, hit.rank_ecr);
  }
  return out;
}

async function fetchJson<T>(url?: string): Promise<T | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Stable value signature of an ADP snapshot (player_id:adp pairs, sorted).
 *  Two days with the same signature carry identical data, used to detect
 *  a stale/cached source pull. */
export function signatureAdp(rows: { player_id: number; adp: number }[]): string {
  return rows.map((r) => `${r.player_id}:${r.adp}`).sort().join("|");
}

/** Stable value signature of an ECR snapshot (player_id:rank_ecr pairs). */
export function signatureEcr(rows: { player_id: number; rank_ecr: number }[]): string {
  return rows.map((r) => `${r.player_id}:${r.rank_ecr}`).sort().join("|");
}
