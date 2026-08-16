import Link from "next/link";
import { loadLatestTwoSnapshots, loadLatestFpAdpSnapshot } from "@/lib/snapshot";
import { UNIVERSE, isTracked } from "@/lib/universe";
import playerMap from "@/data/player_map.json";

export const dynamic = "force-dynamic";

/**
 * A working comparison of two independent ADP sources. NOT a product surface:
 * reachable from Methodology only, deliberately absent from the nav. Nothing
 * here feeds a signal, a threshold, a chart, a story card or an evidence tier,
 * and the FantasyPros series is shown nowhere else on the site.
 *
 * Display caps at each source's OWN top 200. Without that, sorting by absolute
 * difference surfaces list-depth artifacts rather than disagreement: FFC's
 * board stops around 260 players and FantasyPros' runs to 644, so a player FFC
 * prices at 121 and FantasyPros ranks 316th produces a 194-pick "difference"
 * that is really two boards of different lengths. The cap is on DISPLAY only;
 * adp-fp/ stores all 644 players and every field, because storage decisions
 * are irreversible and display decisions are not.
 */
type MapEntry = { sleeper_id: string; name: string; pos: string; ffc_id?: number; fp_id?: number };
type FpPlayer = {
  player_id: number;
  rank_ecr: number;
  rank_ave: string | number;
  rank_std: string | number;
};

const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const pretty = (iso: string | null) =>
  iso
    ? new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "not captured yet";

export default async function AdpSources() {
  const [{ latest: ffc }, fpSnap] = await Promise.all([
    loadLatestTwoSnapshots(),
    loadLatestFpAdpSnapshot(),
  ]);

  const entries = Object.values(playerMap as Record<string, MapEntry>);
  const byFfcId = new Map<number, MapEntry>();
  for (const e of entries) if (e.ffc_id != null) byFfcId.set(e.ffc_id, e);

  const fpPlayers = (fpSnap?.payload.players ?? []) as unknown as FpPlayer[];
  const fpById = new Map<number, FpPlayer>();
  for (const p of fpPlayers) fpById.set(p.player_id, p);

  // FFC's own top 200: ranked by ADP across tracked positions, the same
  // convention lib/universe.ts uses, so this page and the site agree on what
  // "top 200" means.
  const ffcRanked = (ffc?.rows ?? [])
    .filter((r) => isTracked(r.position))
    .sort((a, b) => a.adp - b.adp)
    .slice(0, UNIVERSE.TOP_N);

  type Row = {
    name: string;
    position: string;
    team: string;
    ffcAdp: number;
    fpAdp: number;
    diff: number;
    std: number | null;
  };

  const rows: Row[] = [];
  let failedJoin = 0;
  let outsideFpTop200 = 0;

  for (const r of ffcRanked) {
    const m = byFfcId.get(r.player_id);
    const hit = m?.fp_id != null ? fpById.get(m.fp_id) : null;
    if (!hit) {
      failedJoin++;
      continue;
    }
    // FantasyPros' own top 200, by their overall ADP ordinal.
    if (hit.rank_ecr > UNIVERSE.TOP_N) {
      outsideFpTop200++;
      continue;
    }
    const fpAdp = num(hit.rank_ave);
    if (fpAdp === null) {
      failedJoin++;
      continue;
    }
    rows.push({
      name: r.name,
      position: r.position,
      team: r.team,
      ffcAdp: r.adp,
      fpAdp,
      diff: Math.round((r.adp - fpAdp) * 100) / 100,
      std: num(hit.rank_std),
    });
  }

  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const abs = rows.map((r) => Math.abs(r.diff)).sort((a, b) => a - b);
  const median =
    abs.length === 0
      ? null
      : abs.length % 2
        ? abs[(abs.length - 1) / 2]
        : (abs[abs.length / 2 - 1] + abs[abs.length / 2]) / 2;
  const max = abs.length ? abs[abs.length - 1] : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Two ADP sources, side by side</h1>

      <div className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-2)]">
        <p>
          This page compares two independent ADP sources and is a working
          comparison rather than a product surface. FFC is mock drafts on their
          own site, PPR twelve team, seven day rolling mean. FantasyPros is a
          composite of five league host sites, league size agnostic. Neither is
          more correct and the difference between them is the point.
        </p>
        <p className="text-[var(--ink-3)]">
          Nothing on this page feeds a signal, a threshold, a chart, a story
          card or an evidence tier. The FantasyPros series is stored in parallel
          and read nowhere else on the site.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <dt className="text-xs uppercase tracking-wide text-[var(--ink-3)]">FFC captured</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{pretty(ffc?.date ?? null)}</dd>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <dt className="text-xs uppercase tracking-wide text-[var(--ink-3)]">FantasyPros captured</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{pretty(fpSnap?.date ?? null)}</dd>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <dt className="text-xs uppercase tracking-wide text-[var(--ink-3)]">Median difference</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">
            {median === null ? "—" : `${median.toFixed(2)} picks`}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <dt className="text-xs uppercase tracking-wide text-[var(--ink-3)]">Largest difference</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">
            {max === null ? "—" : `${max.toFixed(2)} picks`}
          </dd>
        </div>
      </dl>

      {ffc && fpSnap && ffc.date !== fpSnap.date && (
        <p className="mt-3 rounded-md border border-[var(--gold-border)] bg-[var(--gold-bg)] px-3 py-2 text-xs">
          The two captures are from different days. FFC last captured{" "}
          {pretty(ffc.date)}, FantasyPros {pretty(fpSnap.date)}. Some of the
          difference below is that gap, not source disagreement.
        </p>
      )}

      <p className="mt-3 text-sm text-[var(--ink-2)]">
        <span className="font-medium">{rows.length} players</span> are inside both
        sources&rsquo; own top {UNIVERSE.TOP_N} and appear in both series.{" "}
        {outsideFpTop200} of FFC&rsquo;s top {UNIVERSE.TOP_N} sit outside
        FantasyPros&rsquo; top {UNIVERSE.TOP_N} and are excluded, and{" "}
        {failedJoin} failed to join across the two sources at all. Both caps are
        on display only: the stored file keeps all{" "}
        {fpSnap?.payload.players.length ?? 0} FantasyPros players and every field.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)] text-left text-xs uppercase tracking-wide text-[var(--ink-3)]">
              <th className="px-3 py-2.5">Player</th>
              <th className="px-3 py-2.5">Pos</th>
              <th className="px-3 py-2.5 text-right">FFC ADP</th>
              <th className="px-3 py-2.5 text-right">FantasyPros ADP</th>
              <th className="px-3 py-2.5 text-right">Difference</th>
              <th className="px-3 py-2.5 text-right">FP spread (SD)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.name}-${r.position}`} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2 font-medium">
                  {r.name} <span className="text-xs text-[var(--ink-3)]">{r.team}</span>
                </td>
                <td className="px-3 py-2">{r.position}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.ffcAdp.toFixed(1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.fpAdp.toFixed(2)}</td>
                {/* Neutral by rule. This is a source disagreement, not a value
                    read, so it carries no green or red: the site's colour
                    semantic is reserved for cheaper-vs-experts. */}
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {r.diff > 0 ? "+" : ""}
                  {r.diff.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--ink-3)]">
                  {r.std === null ? "—" : r.std.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="mt-3 rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--ink-3)]">
          No comparison yet. This needs one stored FFC snapshot and one stored
          FantasyPros ADP snapshot.
        </p>
      )}

      <p className="mt-4 text-xs text-[var(--ink-3)]">
        Difference is FFC ADP minus FantasyPros ADP, in picks. A positive number
        means FFC drafters take him later than the FantasyPros composite does.
        FP spread is <code>rank_std</code>, the standard deviation across the
        five contributing host sites: a high number means the sources disagree
        with each other, not just with FFC. The FantasyPros pick number is{" "}
        <code>rank_ave</code>; <code>rank_ecr</code> in that payload is only an
        ordinal.
      </p>

      <p className="mt-4 text-sm">
        <Link href="/methodology" className="font-medium underline">
          ← Back to Methodology
        </Link>
      </p>
    </main>
  );
}
