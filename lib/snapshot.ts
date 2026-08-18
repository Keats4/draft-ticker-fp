import { list, put } from "@vercel/blob";
import type { EcrSnapshot, Snapshot } from "@/lib/types";

/**
 * Blob layout.
 *
 *   host-rank/<date>.json      primary price series (FantasyPros average host rank)
 *   host-rank-history.json     flat per player per day rows of the primary series
 *   ecr/<date>.json            expert consensus rank series (untouched)
 *
 * `snapshots/`, `history.json` and `adp-fp/` hold the retired FFC series and the
 * old raw capture. They are left in place and are neither read nor written.
 */
const HOST_RANK_PREFIX = "host-rank/";
const HOST_RANK_HISTORY_PATH = "host-rank-history.json";

/** One player on one day in the primary series. */
export type HostRankHistoryRow = {
  date: string;
  player_id: number;
  player_name: string;
  player_position_id: string;
  player_team_id: string;
  /** Average host rank for that day. */
  rank_ave: number;
  /** Number of hosts ranking the player that day. */
  source_count: number;
  /** Per host rank map for the day (host id -> that host's rank). Present on
   *  rows written after 2026-08-17; older rows carry only the average and are
   *  NOT backfilled. Stored so longer windows can compute shared-host deltas
   *  (lib/market.ts sharedHostDelta) instead of differencing averages taken
   *  over different board sets. */
  experts?: Record<string, number>;
};

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

/** Save the daily primary snapshot AND append the day's rows to
 *  host-rank-history.json. Idempotent: re-running on the same date replaces
 *  that date's entries. */
export async function saveSnapshot(snapshot: Snapshot): Promise<string> {
  const url = await putJson(`${HOST_RANK_PREFIX}${snapshot.date}.json`, snapshot);

  const existing = (await readJsonBlob<HostRankHistoryRow[]>(HOST_RANK_HISTORY_PATH)) ?? [];
  const kept = existing.filter((r) => r.date !== snapshot.date);
  const todays: HostRankHistoryRow[] = snapshot.rows.map((p) => ({
    date: snapshot.date,
    player_id: p.player_id,
    player_name: p.player_name,
    player_position_id: p.player_position_id,
    player_team_id: p.player_team_id,
    rank_ave: p.rank_ave,
    source_count: p.source_count,
    experts: p.experts,
  }));
  await putJson(HOST_RANK_HISTORY_PATH, [...kept, ...todays]);

  return url;
}

/** Store the day's UNTOUCHED raw FantasyPros payload under adp-fp/<date>.json
 *  as { date, captured_at, source, payload }, the shape the retired build
 *  wrote. The raw file is the recovery path: when the typed series stalls or
 *  a converter bug lands, scripts/backfill_host_rank.mjs rebuilds every typed
 *  day from these. No page reads it. */
export async function saveRawHostRank(raw: {
  date: string;
  captured_at: string;
  source: string;
  payload: unknown;
}): Promise<string> {
  return putJson(`adp-fp/${raw.date}.json`, raw);
}

/** Newest stored primary snapshot, or null if none / blob unavailable. */
export async function loadLatestSnapshot(): Promise<Snapshot | null> {
  const { latest } = await loadLatestTwoSnapshots();
  return latest;
}

/** Newest and second-newest primary snapshots (previous is null on day one). */
export async function loadLatestTwoSnapshots(): Promise<{
  latest: Snapshot | null;
  previous: Snapshot | null;
}> {
  try {
    const { blobs } = await list({ prefix: HOST_RANK_PREFIX });
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

/** OLDEST and NEWEST stored primary snapshots. The move window spans these
 *  two, so a delta covers all tracked history rather than a single overlapping
 *  day. Returns first === null when only one date is stored (no window yet). */
export async function loadFirstAndLatestSnapshots(): Promise<{
  first: Snapshot | null;
  latest: Snapshot | null;
}> {
  try {
    const { blobs } = await list({ prefix: HOST_RANK_PREFIX });
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

/**
 * Both series clamped to the window they SHARE: the earliest date present in
 * both the host rank series and the ECR series, through the latest date
 * present in both. Every movement comparison (host rank delta, ECR delta,
 * every "since <date>" sentence, every "who moved first" signal) must be
 * measured over the same span; first-and-latest of each series taken
 * independently silently compares, say, one day of price movement against a
 * week of expert movement whenever the two series start on different days.
 *
 * - fewer than two shared dates: no movement window exists. `first` and
 *   `ecrPrev` come back null (so no deltas render anywhere), while `latest`
 *   and `ecrLatest` are the newest of each series so current values still
 *   show.
 * - two or more shared dates: `first`/`ecrPrev` sit on the window start,
 *   `latest`/`ecrLatest` on the window end. When one series has run ahead of
 *   the other, the newest unshared day is deliberately NOT used: a true
 *   sentence about a shorter window beats a longer window only one series
 *   covers.
 *
 * `ecrSnaps` is the full stored ECR series for the charts, untouched by the
 * clamp; the chart may honestly draw dates the movement window excludes.
 */
export async function loadSharedWindow(): Promise<{
  first: Snapshot | null;
  latest: Snapshot | null;
  ecrPrev: EcrSnapshot | null;
  ecrLatest: EcrSnapshot | null;
  ecrSnaps: EcrSnapshot[];
}> {
  const [hostBlobs, ecrSnaps] = await Promise.all([
    (async () => {
      try {
        const { blobs } = await list({ prefix: HOST_RANK_PREFIX });
        return blobs;
      } catch {
        return [];
      }
    })(),
    loadAllEcrSnapshots(),
  ]);
  const hostByDate = new Map(
    hostBlobs.map((b) => [
      b.pathname.slice(HOST_RANK_PREFIX.length).replace(/\.json$/, ""),
      b.url,
    ])
  );
  const ecrByDate = new Map(ecrSnaps.map((s) => [s.date, s]));
  const shared = [...hostByDate.keys()].filter((d) => ecrByDate.has(d)).sort();
  const start = shared[0] ?? null;
  const end = shared.length > 1 ? shared[shared.length - 1] : null;

  if (!start || !end) {
    const newestHost = [...hostByDate.keys()].sort().pop();
    const latest = newestHost
      ? await fetchSnapshot(hostByDate.get(newestHost))
      : null;
    return {
      first: null,
      latest,
      ecrPrev: null,
      ecrLatest: ecrSnaps[ecrSnaps.length - 1] ?? null,
      ecrSnaps,
    };
  }

  const [first, latest] = await Promise.all([
    fetchSnapshot(hostByDate.get(start)),
    fetchSnapshot(hostByDate.get(end)),
  ]);
  // A failed fetch of either endpoint degrades to "no window" rather than a
  // window with one honest end.
  if (!first || !latest) {
    return {
      first: null,
      latest: latest ?? first,
      ecrPrev: null,
      ecrLatest: ecrSnaps[ecrSnaps.length - 1] ?? null,
      ecrSnaps,
    };
  }
  return {
    first,
    latest,
    ecrPrev: ecrByDate.get(start) ?? null,
    ecrLatest: ecrByDate.get(end) ?? null,
    ecrSnaps,
  };
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

/** Full accumulated primary series history (all dates, all players), or
 *  empty array. */
export async function loadHostRankHistory(): Promise<HostRankHistoryRow[]> {
  return (await readJsonBlob<HostRankHistoryRow[]>(HOST_RANK_HISTORY_PATH)) ?? [];
}

export async function saveEcrSnapshot(snapshot: EcrSnapshot): Promise<string> {
  return putJson(`ecr/${snapshot.date}.json`, snapshot);
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

/** Stable value signature of a primary snapshot (player_id:rank_ave pairs,
 *  sorted). Two days with the same signature carry identical data. */
export function signatureHostRank(rows: { player_id: number; rank_ave: number }[]): string {
  return rows.map((r) => `${r.player_id}:${r.rank_ave}`).sort().join("|");
}

/**
 * Staleness of a fresh primary pull against the prior stored day, keyed off
 * the LATEST host publish time rather than our own captured-at. A pull is
 * stale when no host has published since the prior day's latest publish, or
 * when the values are identical anyway (a source serving cached data with a
 * bumped timestamp still shows up).
 */
export function hostRankStaleness(
  fresh: Pick<Snapshot, "meta" | "rows">,
  prior: Pick<Snapshot, "date" | "meta" | "rows"> | null
): { stale: boolean; reason: string | null } {
  if (!prior) return { stale: false, reason: null };
  if (fresh.meta.latest_pub_at <= prior.meta.latest_pub_at) {
    return {
      stale: true,
      reason: `latest host publish ${fresh.meta.latest_pub_at} is not after ${prior.date}'s ${prior.meta.latest_pub_at}`,
    };
  }
  if (signatureHostRank(fresh.rows) === signatureHostRank(prior.rows)) {
    return { stale: true, reason: `values identical to ${prior.date} despite a newer publish time` };
  }
  return { stale: false, reason: null };
}

/** Stable value signature of an ECR snapshot (player_id:rank_ecr pairs). */
export function signatureEcr(rows: { player_id: number; rank_ecr: number }[]): string {
  return rows.map((r) => `${r.player_id}:${r.rank_ecr}`).sort().join("|");
}
