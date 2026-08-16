import Link from "next/link";
import { loadAllEcrSnapshots, loadFirstAndLatestSnapshots } from "@/lib/snapshot";
import { buildMarketRows, type MapByFfc, type MarketRow } from "@/lib/market";
import { THRESHOLDS, type FpLite } from "@/lib/math";
import { whatItMeans } from "@/lib/signals";
import SignalChip from "@/components/SignalChip";
import ffcFixture from "@/fixtures/ffc_adp.json";
import fpEcr from "@/fixtures/fp_ecr.json";
import playerMap from "@/data/player_map.json";
import featured from "@/data/featured.json";
import type { FfcPlayer } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Featured · Draft Ticker" };

function moveStr(d: number | null) {
  return d === null ? ", " : `${d > 0 ? "+" : ""}${d}`;
}
function moveColor(d: number | null) {
  return d === null || d === 0 ? "var(--ink-3)" : d > 0 ? "var(--pos)" : "var(--neg)";
}
function gapColor(g: number | null) {
  return g === null || g === 0 ? "var(--ink-2)" : g > 0 ? "var(--pos)" : "var(--neg)";
}

function PlayerMini({ r, moveLabel }: { r: MarketRow; moveLabel: string }) {
  const href = `/player/${r.sleeperId ?? `ffc-${r.ffcId}`}`;
  return (
    <div className="flex-1 rounded-lg border border-[var(--border)] p-3">
      <Link href={href} className="font-semibold hover:underline">{r.name}</Link>
      <p className="text-xs text-[var(--ink-3)]">{r.position} · {r.team}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-[var(--ink-3)]">ADP</dt>
        <dd className="text-right tabular-nums">{r.adp}</dd>
        <dt className="text-[var(--ink-3)]">{moveLabel}</dt>
        <dd className="text-right tabular-nums" style={{ color: moveColor(r.adpDelta) }}>{moveStr(r.adpDelta)}</dd>
        <dt className="text-[var(--ink-3)]">ECR</dt>
        <dd className="text-right tabular-nums">{r.ecr ?? ", "}</dd>
        <dt className="text-[var(--ink-3)]">Gap</dt>
        <dd className="text-right tabular-nums" style={{ color: gapColor(r.gap) }}>
          {r.gap === null ? ", " : `${r.gap > 0 ? "+" : ""}${r.gap}`}
        </dd>
      </dl>
      <div className="mt-2"><SignalChip signal={r.signal} /></div>
    </div>
  );
}

export default async function Featured() {
  const [{ first, latest }, ecrSnaps] = await Promise.all([
    loadFirstAndLatestSnapshots(),
    loadAllEcrSnapshots(),
  ]);
  const previous = first;
  const ecrLatest = ecrSnaps[ecrSnaps.length - 1] ?? null;
  const ecrPrev =
    ecrSnaps.length > 1 && ecrSnaps[0].date !== ecrLatest?.date ? ecrSnaps[0] : null;
  const live = latest !== null;
  const adpRows: FfcPlayer[] = live ? latest.rows : (ffcFixture.players as FfcPlayer[]);
  const prevDate = previous
    ? new Date(previous.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : null;
  const moveLabel = prevDate ? `Move (since ${prevDate})` : "Move";

  const mapByFfc: MapByFfc = {};
  const bySleeper = new Map<string, number>();
  for (const e of Object.values(
    playerMap as Record<string, { sleeper_id: string; ffc_id?: number; fp_id?: number }>
  )) {
    if (e.ffc_id != null) {
      mapByFfc[e.ffc_id] = { sleeper_id: e.sleeper_id, fp_id: e.fp_id };
      bySleeper.set(e.sleeper_id, e.ffc_id);
    }
  }
  const { rows } = buildMarketRows(
    adpRows,
    previous?.rows ?? null,
    ecrLatest ? ecrLatest.rows : (fpEcr as { players: FpLite[] }).players,
    mapByFfc,
    ecrPrev ? Object.fromEntries(ecrPrev.rows.map((r) => [r.player_id, r.rank_ecr])) : null
  );
  const bySleeperRow = new Map(rows.filter((r) => r.sleeperId).map((r) => [r.sleeperId!, r]));

  const pairs = (featured.mirror_pairs as {
    id: string; title: string; players: string[]; event: string; note: string;
  }[]).map((p) => ({ ...p, rows: p.players.map((sid) => bySleeperRow.get(sid)).filter(Boolean) as MarketRow[] }))
    .filter((p) => p.rows.length === 2);

  // genuine movers today: real ADP move over threshold, biggest first
  const movers = rows
    .filter((r) => r.inUniverse && r.adpDelta !== null && Math.abs(r.adpDelta) >= THRESHOLDS.ADP_MOVE)
    .sort((a, b) => Math.abs(b.adpDelta!) - Math.abs(a.adpDelta!))
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Featured</h1>
      <p className="mt-1 text-[var(--ink-2)]">
        Hand-picked situations and the real movers from the latest snapshot.
        {!previous && " Movement appears once a second snapshot exists."}
      </p>
      {!live && (
        <p className="mt-2 inline-block rounded border border-[var(--gold-border)] bg-[var(--gold-bg)] px-2 py-1 text-xs">
          FIXTURE DATA: not live.
        </p>
      )}


      {pairs.map((p) => {
        const [a, b] = p.rows;
        const opposite = a.adpDelta != null && b.adpDelta != null && a.adpDelta * b.adpDelta < 0;
        return (
          <section key={p.id} className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }}>
                Mirror pair
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Two players in one backfield: the same event tends to push their
              draft prices in opposite directions.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <PlayerMini r={a} moveLabel={moveLabel} />
              <PlayerMini r={b} moveLabel={moveLabel} />
            </div>
            <div className="mt-3 rounded-lg border p-3 text-sm" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide">The event</p>
              {p.event ? (
                <p className="mt-1">{p.event}{p.note ? ` ${p.note}` : ""}</p>
              ) : (
                <p className="mt-1 italic text-[var(--ink-3)]">
                  Catalyst pending: the verified event note lands with the next
                  catalysts JSON. Until then only the measured prices are shown, not a story.
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--ink-3)]">
                Today’s measured moves: {a.name} {moveStr(a.adpDelta)}, {b.name} {moveStr(b.adpDelta)}
                {a.adpDelta != null && b.adpDelta != null
                  ? opposite
                    ? ", opposite directions, though both small this window."
                    : ", same direction this window."
                  : ", not enough history yet."}
              </p>
            </div>
          </section>
        );
      })}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Genuine movers today</h2>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Players whose ADP moved at least {THRESHOLDS.ADP_MOVE} picks since {prevDate ?? "the last snapshot"}, among players drafted in most leagues, real moves, auto-detected.
        </p>
        {movers.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--ink-3)]">
            No player has cleared the {THRESHOLDS.ADP_MOVE}-pick move threshold yet in the stored window.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {movers.map((r) => (
              <div key={r.ffcId} className="rounded-lg border border-[var(--border)] p-3">
                <Link href={`/player/${r.sleeperId ?? `ffc-${r.ffcId}`}`} className="font-semibold hover:underline">{r.name}</Link>
                <p className="text-xs text-[var(--ink-3)]">{r.position} · {r.team}</p>
                <p className="mt-2 text-sm">
                  <span className="tabular-nums font-medium" style={{ color: moveColor(r.adpDelta) }}>{moveStr(r.adpDelta)} picks</span>{" "}
                  <span className="text-[var(--ink-3)]">· ADP {r.adp}</span>
                </p>
                <div className="mt-2"><SignalChip signal={r.signal} /></div>
                <p className="mt-2 text-xs text-[var(--ink-2)]">{whatItMeans(r.signal, r.gap, r.adpDelta, r.gapReason)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 text-xs text-[var(--ink-3)]">
        Pairs are curated in data/featured.json; movers are computed across the
        full stored window{prevDate ? ` (since ${prevDate})` : ""}. ADP:{" "}
        {live ? "Fantasy Football Calculator (PPR, 12-team)" : "FFC fixture (static)"}.
        ECR:{" "}
        {ecrLatest ? `FantasyPros API (${ecrLatest.date})` : "FantasyPros capture Aug 10 (static)"}.{" "}
        <Link href="/methodology" className="underline">Methodology</Link>
      </footer>
    </main>
  );
}
