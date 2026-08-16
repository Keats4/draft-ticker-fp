import Link from "next/link";
import { loadLatestSnapshot } from "@/lib/snapshot";
import ffcFixture from "@/fixtures/ffc_adp.json";
import playerMap from "@/data/player_map.json";
import type { FfcPlayer } from "@/lib/types";
import { isTracked } from "@/lib/universe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Players · Draft Ticker" };

export default async function Players() {
  const snap = await loadLatestSnapshot();
  const live = snap !== null;
  // Same defensive sort as buildMarketRows: this list renders i + 1 as the
  // rank and says "by ADP", so it must not trust the source's order either.
  const rows: FfcPlayer[] = [
    ...(live ? snap.rows : (ffcFixture.players as FfcPlayer[])),
  ]
    .filter((p) => isTracked(p.position))
    .sort((a, b) => a.adp - b.adp);
  const byFfc = new Map<number, string>();
  for (const e of Object.values(
    playerMap as Record<string, { sleeper_id: string; ffc_id?: number }>
  )) {
    if (e.ffc_id != null) byFfc.set(e.ffc_id, e.sleeper_id);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Players</h1>
      <p className="mt-1 text-[var(--ink-2)]">
        Every player currently in the tracked draft pool ({rows.length}), by ADP.
      </p>
      {!live && (
        <p className="mt-2 inline-block rounded border border-[var(--gold-border)] bg-[var(--gold-bg)] px-2 py-1 text-xs">
          FIXTURE DATA: not live.
        </p>
      )}
      <ul className="mt-5 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {rows.map((p, i) => (
          <li key={p.player_id}>
            <Link
              href={`/player/${byFfc.get(p.player_id) ?? `ffc-${p.player_id}`}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--background)]"
            >
              <span className="w-6 tabular-nums text-[var(--ink-3)]">{i + 1}</span>
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="text-[var(--ink-3)]">{p.position} · {p.team}</span>
              <span className="w-16 text-right tabular-nums">ADP {p.adp}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
