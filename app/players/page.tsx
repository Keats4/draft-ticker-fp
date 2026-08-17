import Link from "next/link";
import { loadLatestSnapshot } from "@/lib/snapshot";
import fpHostRankFixture from "@/fixtures/fp_host_rank.json";
import playerMap from "@/data/player_map.json";
import type { FpHostRankPlayer } from "@/lib/types";
import { isTracked } from "@/lib/universe";
import { playerHref, parsePosRank } from "@/lib/market";
import {
  toHostRankPlayers,
  type RawHostRankRow,
} from "@/lib/sources/fantasypros-host-rank";

export const dynamic = "force-dynamic";
export const metadata = { title: "Players · Draft Ticker" };

export default async function Players() {
  const snap = await loadLatestSnapshot();
  const live = snap !== null;
  // Same defensive sort as buildMarketRows: this list renders i + 1 as the
  // rank and says "by average host rank", so it must not trust the source's
  // order either.
  const rows: FpHostRankPlayer[] = [
    ...(live
      ? snap.rows
      : toHostRankPlayers(fpHostRankFixture.players as RawHostRankRow[])),
  ]
    .filter((p) => isTracked(p.player_position_id))
    .sort((a, b) => a.rank_ave - b.rank_ave);
  const sleeperByFp = new Map<number, string>();
  for (const e of Object.values(
    playerMap as Record<string, { sleeper_id: string; fp_id?: number }>
  )) {
    if (e.fp_id != null) sleeperByFp.set(e.fp_id, e.sleeper_id);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Players</h1>
      <p className="mt-1 text-[var(--ink-2)]">
        Every player currently in the tracked pool ({rows.length}), by average
        host rank.
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
              href={playerHref({
                sleeperId: sleeperByFp.get(p.player_id) ?? null,
                fpId: p.player_id,
              })}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--background)]"
            >
              <span className="w-6 tabular-nums text-[var(--ink-3)]">{i + 1}</span>
              <span className="flex-1 font-medium">{p.player_name}</span>
              <span className="text-[var(--ink-3)]">
                {p.player_position_id}
                {parsePosRank(p.pos_rank) ?? ""} · {p.player_team_id}
              </span>
              <span className="w-24 text-right tabular-nums">Rank {p.rank_ave}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
