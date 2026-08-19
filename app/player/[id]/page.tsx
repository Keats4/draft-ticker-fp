import Link from "next/link";
import {
  loadHostRankHistory,
  ecrSeriesFor,
  loadSharedWindow,
} from "@/lib/snapshot";
import { buildMarketRows, type SleeperByFpId } from "@/lib/market";
import { type FpLite } from "@/lib/math";
import { whatItMeans } from "@/lib/signals";
import { evidenceFor, inMoveWindow } from "@/lib/evidence";
import { buildArchetypes, archetypePlain } from "@/lib/archetype";
import type { FpHostRankPlayer } from "@/lib/types";
import PlayerChart, {
  type ChartMarker,
  type ChartPoint,
} from "@/components/PlayerChart";
import { LEAGUE_SIZE, fmtRounds, oneLineAnswer } from "@/lib/rounds";
import { currentPhase, trustReading, type Phase as LibPhase } from "@/lib/phases";
import GapChart from "@/components/GapChart";
import SignalChip from "@/components/SignalChip";
import AiTrace from "@/components/AiTrace";
import fpHostRankFixture from "@/fixtures/fp_host_rank.json";
import { toHostRankPlayers, type RawHostRankRow } from "@/lib/sources/fantasypros-host-rank";
import fpEcr from "@/fixtures/fp_ecr.json";
import playerMap from "@/data/player_map.json";
import catalystsFile from "@/data/catalysts.json";
import phasesFile from "@/data/calendar_phases.json";

export const dynamic = "force-dynamic";

/** The trace must not name an input it does not supply, so the phase is
 *  resolved from data/calendar_phases.json rather than printed as a
 *  placeholder. Same two fields the eval payloads carry: calendar_phase and
 *  phase_trust. */
const PHASES = (phasesFile as { phases: LibPhase[] }).phases;
const CURRENT_PHASE = currentPhase(PHASES).phase ?? {
  title: "unknown",
  signal_level: "unknown",
  card_line: "",
};

/** "Aug 16, 2026" from a stored YYYY-MM-DD date. */
const fmtLongDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

type MapEntry = {
  sleeper_id: string;
  name: string;
  team: string | null;
  pos: string;
  fp_id?: number;
  years_exp?: number | null;
  age?: number | null;
  injury_status?: string | null;
};

type Catalyst = {
  id: string;
  player: { sleeper_id: string; name: string };
  date: string;
  category: string;
  summary: string;
  source_url: string;
  verified: boolean;
  sample: boolean;
};

function Step({ n, kicker, title }: { n: number; kicker: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--background)] text-xs font-semibold text-[var(--ink-2)]">
        {n}
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--ink-3)]">{kicker}</p>
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
      </div>
    </div>
  );
}

function NotTracked({ id }: { id: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Player not tracked</h1>
      <p className="mt-3 text-sm text-[var(--ink-2)]">
        No market data is stored for “{id}”. Draft Ticker tracks the players
        on the FantasyPros PPR ADP board; players outside that pool have
        no honest numbers to show, so nothing is shown.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm underline">
        ← Back to the Market
      </Link>
    </main>
  );
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ first, latest, ecrPrev, ecrLatest, ecrSnaps }, history] =
    await Promise.all([loadSharedWindow(), loadHostRankHistory()]);
  // Movement/signal compare over the window BOTH series cover (lib/snapshot.ts
  // loadSharedWindow); the CHART still uses the full ECR series.
  const previous = first;
  const live = latest !== null;
  const priceRows: FpHostRankPlayer[] = live
    ? latest.rows
    : toHostRankPlayers(fpHostRankFixture.players as RawHostRankRow[]);

  const entries = Object.values(playerMap as Record<string, MapEntry>);
  const sleeperByFpId: SleeperByFpId = {};
  for (const e of entries) {
    if (e.fp_id != null) sleeperByFpId[e.fp_id] = e.sleeper_id;
  }

  const rows = buildMarketRows(
    priceRows,
    previous?.rows ?? null,
    ecrLatest ? ecrLatest.rows : (fpEcr as { players: FpLite[] }).players,
    sleeperByFpId,
    ecrPrev ? Object.fromEntries(ecrPrev.rows.map((r) => [r.player_id, r.rank_ecr])) : null
  );

  const prevDateLabel = previous
    ? new Date(previous.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : null;
  const moveWindow = prevDateLabel ? `since ${prevDateLabel}` : "since tracking began";

  // "Tracking since" is the earliest STORED host rank date, never a
  // hardcoded date: the retired series began Aug 10 but this one did not.
  const firstHostDate =
    history.length > 0
      ? history.reduce((min, r) => (r.date < min ? r.date : min), history[0].date)
      : (latest?.date ?? null);
  const trackingSince = firstHostDate ? fmtLongDate(firstHostDate) : "day one";

  // playerHref() emits the Sleeper id when mapped, else `fp-<player_id>`.
  const row = id.startsWith("fp-")
    ? rows.find((r) => r.fpId === Number(id.slice(3)))
    : rows.find((r) => r.sleeperId === id);
  if (!row) return <NotTracked id={id} />;

  // Role archetypes need the whole room, so the full row set is classified
  // once and this player's label looked up. Display only, never a signal
  // input.
  const entryBySleeper = new Map(entries.map((e) => [e.sleeper_id, e]));
  const archMap = buildArchetypes(
    rows.map((r) => {
      const e = r.sleeperId ? entryBySleeper.get(r.sleeperId) : undefined;
      return {
        id: r.fpId,
        sleeperId: r.sleeperId,
        position: r.position,
        team: r.team,
        adp: r.hostRank,
        years_exp: e?.years_exp ?? null,
        injury_status: e?.injury_status ?? null,
      };
    })
  );
  const arch = archMap.get(row.fpId) ?? null;

  // chart points
  // Both series key on the FantasyPros player_id, so the row's own id is used
  // for the ECR series too; entry.fp_id would be the same number when mapped.
  const ecrByDate = ecrSeriesFor(ecrSnaps, row.fpId);
  const playerHistory = history.filter((h) => h.player_id === row.fpId);
  const dates = [...new Set(playerHistory.map((h) => h.date))].sort();
  const points: ChartPoint[] = dates.map((d) => ({
    date: d,
    hostRank: playerHistory.find((h) => h.date === d)?.rank_ave ?? null,
    ecr: ecrByDate.get(d) ?? null,
  }));

  const catalysts = (catalystsFile.entries as Catalyst[]).filter(
    (c) => c.player.sleeper_id === row.sleeperId
  );
  const markers: ChartMarker[] = catalysts.map((c) => ({
    date: c.date,
    label: c.summary,
    sample: c.sample,
  }));
  const verifiedCatalysts = catalysts.filter((c) => c.verified && !c.sample);
  // The lookback reaches CATALYST_LOOKBACK_DAYS before the older snapshot,
  // not just the gap between snapshots. See lib/evidence.ts. The homepage
  // uses the SAME predicate, so the two surfaces cannot disagree.
  const verifiedInWindow =
    previous && latest
      ? verifiedCatalysts.some((c) => inMoveWindow(c.date, previous.date, latest.date))
      : verifiedCatalysts.length > 0;
  const evidence = row.signal ? evidenceFor(verifiedInWindow) : null;

  const gapCls =
    row.gap == null
      ? "text-[var(--ink-3)]"
      : row.gap > 0
        ? "text-[var(--pos)]"
        : row.gap < 0
          ? "text-[var(--neg)]"
          : "text-[var(--ink-2)]";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-3 text-xs text-[var(--ink-3)]">
        <Link href="/" className="hover:underline">Market</Link> ›{" "}
        <Link href="/players" className="hover:underline">Players</Link> › {row.name}
      </nav>

      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{row.name}</h1>
        <span className="text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--foreground)]">
            {`${row.position}${row.posRank}`}
          </span>{" "}
          · {row.team} · Bye {row.bye}
        </span>
        {arch ? (
          <span
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
            title={`Archetype rule: ${arch.reason}`}
          >
            {arch.tag}
          </span>
        ) : (
          <span
            className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--ink-3)]"
            title="No role label. Quarterbacks and tight ends carry none by design; deep players and unclear rooms stay unlabelled rather than guessed."
          >
            No role label
          </span>
        )}
      </header>

      {/* The definition was a title attribute: invisible on touch and
          undiscoverable on desktop. Same text, on the page. */}
      {arch ? (
        <p className="mt-1 text-xs text-[var(--ink-3)]">
          <span className="font-medium text-[var(--ink-2)]">{arch.tag}.</span>{" "}
          {archetypePlain(arch.tag).definition}{" "}
          <span className="font-medium text-[var(--ink-2)]">{archetypePlain(arch.tag).moves}</span>
          {archetypePlain(arch.tag).caveat ? ` ${archetypePlain(arch.tag).caveat}` : ""}
        </p>
      ) : (
        <p className="mt-1 text-xs text-[var(--ink-3)]">
          No role label. Quarterbacks and tight ends carry none by design;
          deep players and unclear rooms stay unlabelled rather than guessed.
        </p>
      )}

      {/* 1. the answer, in rounds, before anything else */}
      <section className="mt-6">
        <p className="text-xl font-semibold leading-snug md:text-2xl">
          {oneLineAnswer(row.gap, row.gapReason)}
        </p>
      </section>

      {/* 2. value over time, the primary chart. Value is what a drafter thinks in. */}
      <section className="mt-8">
        <Step n={1} kicker="What he costs" title="Value over time" />
        <GapChart points={points} markers={markers} trackingSince={trackingSince} />
      </section>

      {/* 3. how much to believe it: the phase's own trust reading, then the
             catalyst, or the honest admission that there is none */}
      <section className="mt-8">
        <Step n={2} kicker="How much to believe it" title="What is behind this move" />
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--ink-2)]">
            <span className="font-semibold text-[var(--foreground)]">{CURRENT_PHASE.title}.</span>{" "}
            {CURRENT_PHASE.card_line}{" "}
            {trustReading(CURRENT_PHASE.signal_level)}{" "}
            <Link href="/calendar" className="underline">
              How much a move is worth right now
            </Link>
          </p>
        </div>
        <div className="mt-3">
          {verifiedCatalysts.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm font-medium">
                No documented event behind this move. Watch it, do not act on
                it.
              </p>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                {whatItMeans(row.signal, row.gap, row.hostRankDelta, row.gapReason)} Catalysts are
                hand-curated with a source and a verified flag, never scraped,
                never guessed.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {verifiedCatalysts.map((c) => (
                <li key={c.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular-nums text-[var(--ink-3)]">{c.date}</span>
                    <span className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs">{c.category}</span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-800">verified</span>
                  </div>
                  <p className="mt-1">{c.summary}</p>
                  <a href={c.source_url} className="mt-1 inline-block text-xs underline text-[var(--ink-3)]" rel="noreferrer">source</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. the working: everything the answer above is computed from, demoted
             rather than deleted */}
      <section className="mt-8">
        <Step n={3} kicker="The working" title="The numbers behind it" />
        <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <summary className="cursor-pointer text-sm font-medium text-[var(--ink-2)]">
            Both series, the numbers and the thresholds
          </summary>

          <div className="mt-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-3)]">Where he is going</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {`${row.position}${row.posRank}`}
            </p>
            <p className="text-xs text-[var(--ink-3)]">
              round {Math.ceil(row.hostRank / LEAGUE_SIZE)} · ADP {row.hostRank}
            </p>
            <p className="text-xs text-[var(--ink-3)]">
              {row.hostRankDelta == null
                ? `tracking since ${trackingSince}`
                : `${row.hostRankDelta > 0 ? "+" : ""}${row.hostRankDelta} ${moveWindow}`}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-3)]">Where experts rank him</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {row.ecr == null
                ? "–"
                : row.ecrPosRank != null
                  ? `${row.position}${row.ecrPosRank}`
                  : row.ecr}
            </p>
            <p className="text-xs text-[var(--ink-3)]">
              {row.ecr == null ? "no confident match" : `overall ${row.ecr} (ECR)`}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-3)]">What you are paying</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${gapCls}`}>
              {row.gap == null ? "–" : `${fmtRounds(row.gap)}`}
            </p>
            <p className="text-xs text-[var(--ink-3)]">
              {row.gap == null
                ? (row.gapReason ?? "not comparable")
                : `${row.gap > 0 ? "+" : ""}${row.gap} picks · ${row.gap < 0 ? "you pay early" : "cheaper than ranked"}`}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-3)]">Signal</p>
            <div className="mt-2"><SignalChip signal={row.signal} /></div>
          </div>
        </div>
          </div>

          <div className="mt-4">
            <PlayerChart
              points={points}
              markers={markers}
              trackingSince={trackingSince}
              signal={row.signal}
              interpretation={whatItMeans(row.signal, row.gap, row.hostRankDelta, row.gapReason)}
              evidence={evidence}
            />
          </div>

          <div className="mt-4">
        <AiTrace
          inputs={[
            `Player: ${row.name} (${row.position}${row.posRank} ${row.team})`,
            `Current ADP: ${row.hostRank}${row.hostRankDelta != null ? `, change ${row.hostRankDelta > 0 ? "+" : ""}${row.hostRankDelta}` : " (no prior day yet)"}`,
            `Host boards ranking him: ${row.sourceCount}`,
            `ECR: ${row.ecr ?? "unmatched"}${row.ecrDelta != null ? `, change ${row.ecrDelta > 0 ? "+" : ""}${row.ecrDelta}` : ""}`,
            `ADP−ECR gap: ${row.gap ?? "n/a"}`,
            `Verified catalysts: ${verifiedCatalysts.length}`,
            `Calendar phase: ${CURRENT_PHASE.title} (trust: ${CURRENT_PHASE.signal_level})`,
          ]}
        />
          </div>
        </details>
      </section>

      {/* catalyst log (incl. samples, clearly badged) */}
      {catalysts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Catalyst log</h2>
          <ul className="mt-3 space-y-3">
            {catalysts.map((c) => (
              <li key={c.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums text-[var(--ink-3)]">{c.date}</span>
                  <span className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs">{c.category}</span>
                  {c.sample ? (
                    <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: "var(--gold-bg)", color: "#8a6d1a" }}>
                      SAMPLE: not real
                    </span>
                  ) : c.verified ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-800">verified</span>
                  ) : (
                    <span className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--ink-3)]">unverified</span>
                  )}
                </div>
                <p className="mt-1">{c.summary}</p>
                <a href={c.source_url} className="mt-1 inline-block text-xs underline text-[var(--ink-3)]" rel="noreferrer">source</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 text-xs text-[var(--ink-3)]">
        Price: FantasyPros ADP (PPR){live ? `, snapshot ${latest.date}` : ", fixture"} · ECR:{" "}
        {ecrLatest ? `FantasyPros API (${ecrLatest.date})` : "capture Aug 10 (static)"} ·{" "}
        <Link href="/methodology" className="underline">Methodology</Link>
      </footer>
    </main>
  );
}
