import Link from "next/link";
import {
  loadHostRankHistory,
  ecrSeriesFor,
  loadSharedWindow,
} from "@/lib/snapshot";
import { buildMarketRows, playerHref, type SleeperByFpId, type MarketRow } from "@/lib/market";
import { THRESHOLDS, type FpLite } from "@/lib/math";
import { UNIVERSE } from "@/lib/universe";
import { whatItMeans } from "@/lib/signals";
import {
  rankStories,
  pairStrength,
  isOpposed,
  moveLine,
  valueLine,
  valueWord,
  valueTone,
} from "@/lib/story";
import { evidenceFor, inMoveWindow } from "@/lib/evidence";
import { archetype } from "@/lib/archetype";
import fpHostRankFixture from "@/fixtures/fp_host_rank.json";
import { toHostRankPlayers, type RawHostRankRow } from "@/lib/sources/fantasypros-host-rank";
import fpEcr from "@/fixtures/fp_ecr.json";
import playerMap from "@/data/player_map.json";
import catalystsFile from "@/data/catalysts.json";
import phasesFile from "@/data/calendar_phases.json";
import { currentPhase, type Phase as LibPhase } from "@/lib/phases";
import featured from "@/data/featured.json";
import HowToReadCard from "@/components/HowToReadCard";
import SignalChip from "@/components/SignalChip";
import HeroStory from "@/components/HeroStory";
import MirrorHero, { type MirrorSide } from "@/components/MirrorHero";
import type { PhaseLevel } from "@/components/PhaseMeter";
import type { ChartMarker, ChartPoint } from "@/components/PlayerChart";
import MarketTable, { type RowLite } from "@/components/MarketTable";
import type { FpHostRankPlayer } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The homepage curates; the full universe lives on /players. */
const HOME_TABLE_ROWS = 25;

/** "Aug 16, 2026" from a stored YYYY-MM-DD date. */
const fmtLongDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const hrefFor = (r: MarketRow) => playerHref(r);

/** Surname for tight hero copy ("Jonathon Brooks" → "Brooks"), skipping
 *  generational suffixes so "Kenneth Walker III" → "Walker". */
const SUFFIXES = new Set(["Jr.", "Sr.", "II", "III", "IV", "V"]);
const lastName = (n: string) => {
  const parts = n.trim().split(/\s+/).filter((p) => !SUFFIXES.has(p));
  return parts[parts.length - 1] ?? n;
};

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

type Phase = {
  key: string;
  title: string;
  start: string;
  end: string;
  signal_level: PhaseLevel;
  /** one short sentence; the hero shows this, not the long TRUST WHY prose */
  card_line: string;
  how_to_read: string;
};

/**
 * tone is deliberately NOT a direction. Under the single colour semantic only
 * a value read is coloured, so the movement tiles pass "neutral" and put their
 * direction in an arrow instead. "cheap"/"expensive" are the value tones.
 */
function StatCard({
  label,
  name,
  sub,
  value,
  tone,
  href,
}: {
  label: string;
  name: string;
  sub: string;
  value: string;
  tone: "cheap" | "expensive" | "neutral" | "muted";
  href?: string;
}) {
  const color =
    tone === "cheap"
      ? "var(--pos)"
      : tone === "expensive"
        ? "var(--neg)"
        : tone === "neutral"
          ? "var(--foreground)"
          : "var(--ink-3)";
  const inner = (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--ink-3)]">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold">{name}</span>
        <span className="text-xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-[var(--ink-3)]">{sub}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function Home() {
  const [{ first, latest, ecrPrev, ecrLatest, ecrSnaps }, history] =
    await Promise.all([loadSharedWindow(), loadHostRankHistory()]);
  // The move window is the span BOTH series cover (lib/snapshot.ts
  // loadSharedWindow): host rank delta and ECR delta are measured over the
  // same dates, so every "since <date>" sentence is true of both halves.
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

  const rows: MarketRow[] = buildMarketRows(
    priceRows,
    previous?.rows ?? null,
    ecrLatest ? ecrLatest.rows : (fpEcr as { players: FpLite[] }).players,
    sleeperByFpId,
    ecrPrev
      ? Object.fromEntries(ecrPrev.rows.map((r) => [r.player_id, r.rank_ecr]))
      : null
  );

  // "Tracking since" is the earliest STORED host rank date, never a
  // hardcoded date: the retired series began Aug 10 but this one did not.
  const firstHostDate =
    history.length > 0
      ? history.reduce((min, r) => (r.date < min ? r.date : min), history[0].date)
      : (latest?.date ?? null);
  const trackingSince = firstHostDate ? fmtLongDate(firstHostDate) : "day one";

  const hasMovement = previous !== null;
  const prevDateLabel = previous
    ? new Date(previous.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : null;
  const moveLabel = prevDateLabel ? `Move (since ${prevDateLabel})` : "Move";
  const moveWindow = prevDateLabel ? `since ${prevDateLabel}` : "since tracking began";
  const riserLabel = prevDateLabel ? `Biggest riser (${moveWindow})` : "Biggest riser";
  const fallerLabel = prevDateLabel ? `Biggest faller (${moveWindow})` : "Biggest faller";

  // rows are already tracked-positions only (see lib/universe.ts)
  const withGap = rows.filter((r) => r.gap !== null);
  const comparableCount = rows.filter((r) => r.gap !== null).length;

  const widest = [...withGap].sort((a, b) => Math.abs(b.gap!) - Math.abs(a.gap!))[0];
  const movers = rows.filter((r) => r.hostRankDelta !== null && r.inUniverse);
  const riser = [...movers].sort((a, b) => b.hostRankDelta! - a.hostRankDelta!)[0];
  const faller = [...movers].sort((a, b) => a.hostRankDelta! - b.hostRankDelta!)[0];

  const forYourDraft = [...withGap]
    .sort((a, b) => Math.abs(b.gap!) - Math.abs(a.gap!))
    .slice(0, 3);

  // ---- Story selection. Programmatic, never a hardcoded player. ----
  const ranked = rankStories(rows);

  // ---- Per-player support data, all pulled from live code paths ----
  const phases = phasesFile.phases as Phase[];
  const phase = currentPhase(phases as unknown as LibPhase[]).phase;

  const catalystsFor = (sleeperId: string | null) =>
    sleeperId
      ? (catalystsFile.entries as Catalyst[]).filter(
          (c) => c.player.sleeper_id === sleeperId
        )
      : [];

  /**
   * Newest verified, non-sample catalyst for a player, or null.
   * Exactly the filter the hero already uses in extrasFor(); the story cards
   * reuse it rather than inventing a second notion of evidence.
   */
  const topCatalystFor = (sleeperId: string | null) =>
    catalystsFor(sleeperId)
      .filter((c) => c.verified && !c.sample)
      .sort((x, y) => (x.date < y.date ? 1 : -1))[0] ?? null;

  const extrasFor = (row: MarketRow) => {
    const entry = entries.find((e) => e.sleeper_id === row.sleeperId) ?? null;
    const arch = entry
      ? archetype({
          position: entry.pos,
          years_exp: entry.years_exp ?? null,
          age: entry.age ?? null,
          injury_status: entry.injury_status ?? null,
        })
      : null;
    // Both series key on the FantasyPros player_id.
    const ecrByDate = ecrSeriesFor(ecrSnaps, row.fpId);
    const hist = history.filter((h) => h.player_id === row.fpId);
    const dates = [...new Set(hist.map((h) => h.date))].sort();
    const points: ChartPoint[] = dates.map((d) => ({
      date: d,
      hostRank: hist.find((h) => h.date === d)?.rank_ave ?? null,
      ecr: ecrByDate.get(d) ?? null,
    }));
    const cats = catalystsFor(row.sleeperId);
    const markers: ChartMarker[] = cats.map((c) => ({
      date: c.date,
      label: c.summary,
      sample: c.sample,
    }));
    const verified = cats
      .filter((c) => c.verified && !c.sample)
      .sort((x, y) => (x.date < y.date ? 1 : -1));
    // Same predicate as the player page (lib/evidence.ts inMoveWindow), so
    // the two surfaces cannot disagree about whether a catalyst backs a
    // signal. The old test here was `c.date >= previous.date`, which dropped
    // events inside the lookback before the older snapshot.
    const inWindow =
      previous && latest
        ? verified.some((c) => inMoveWindow(c.date, previous.date, latest.date))
        : verified.length > 0;
    return {
      arch,
      points,
      markers,
      verified,
      evidence: row.signal ? evidenceFor(inWindow) : null,
    };
  };

  const sideFor = (row: MarketRow): MirrorSide => {
    const x = extrasFor(row);
    return {
      href: hrefFor(row),
      name: row.name,
      position: row.position,
      posRank: row.posRank,
      team: row.team,
      archetypeTag: x.arch?.tag ?? null,
      archetypeReason: x.arch?.reason ?? null,
      signal: row.signal,
      points: x.points,
      markers: x.markers,
      hostRank: row.hostRank,
      ecr: row.ecr,
      gap: row.gap,
      hostRankDelta: row.hostRankDelta,
    };
  };

  // ---- Lead selection. A qualifying mirror pair outranks any single story. ----
  const bySleeper = new Map(
    rows.filter((r) => r.sleeperId).map((r) => [r.sleeperId!, r])
  );
  const verifiedUrls = (sleeperId: string | null) =>
    new Set(
      catalystsFor(sleeperId)
        .filter((c) => c.verified && !c.sample)
        .map((c) => c.source_url)
    );

  type PairDef = { id: string; title: string; players: string[] };
  const bestPair = (featured.mirror_pairs as PairDef[])
    .map((def) => {
      const a = bySleeper.get(def.players[0]);
      const b = bySleeper.get(def.players[1]);
      if (!a || !b) return null;
      const ua = verifiedUrls(a.sleeperId);
      const ub = verifiedUrls(b.sleeperId);
      const shared = [...ua].find((u) => ub.has(u)) ?? null;
      return { def, a, b, shared, score: pairStrength(a, b, shared !== null) };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && p.score > 0)
    .sort((x, y) => y.score - x.score)[0] ?? null;

  const singleHero = ranked[0] ?? null;
  const leadIds = new Set<number>(
    bestPair ? [bestPair.a.fpId, bestPair.b.fpId] : singleHero ? [singleHero.fpId] : []
  );
  const stories = ranked.filter((r) => !leadIds.has(r.fpId)).slice(0, 3);

  // shared-event headline for the pair: the catalyst both players point at
  const sharedCatalyst = bestPair?.shared
    ? (catalystsFile.entries as Catalyst[])
        .filter((c) => c.source_url === bestPair.shared && c.verified && !c.sample)
        .sort((x, y) => (x.date < y.date ? 1 : -1))[0] ?? null
    : null;
  // Same inMoveWindow predicate as everywhere else.
  const pairEvidence = bestPair
    ? evidenceFor(
        previous && latest
          ? sharedCatalyst !== null &&
              inMoveWindow(sharedCatalyst.date, previous.date, latest.date)
          : sharedCatalyst !== null
      )
    : null;

  // The pair box lists each side's newest verified event, newest first,
  // deduped when both sides cite the same article: an injury on one side and
  // the other side's response can appear together. Evidence above stays keyed
  // to the shared-URL event.
  type PairCatalyst = { date: string; summary: string; sourceUrl: string; player: string | null };
  const pairCatalysts: PairCatalyst[] = bestPair
    ? [topCatalystFor(bestPair.a.sleeperId), topCatalystFor(bestPair.b.sleeperId)]
        .filter((c): c is NonNullable<typeof c> => c != null)
        .filter((c, i, arr) => arr.findIndex((x) => x.source_url === c.source_url) === i)
        .sort((x, y) => (x.date < y.date ? 1 : -1))
        .map((c) => ({
          date: c.date,
          summary: c.summary,
          sourceUrl: c.source_url,
          player: c.player.name ?? null,
        }))
    : [];

  // single-hero extras (only used when no pair qualifies)
  const heroX = singleHero ? extrasFor(singleHero) : null;
  const heroCatalyst = heroX?.verified[0]
    ? {
        date: heroX.verified[0].date,
        summary: heroX.verified[0].summary,
        sourceUrl: heroX.verified[0].source_url,
      }
    : null;

  const tableRows: RowLite[] = rows.slice(0, HOME_TABLE_ROWS).map((r) => ({
    rank: r.hostRankOrdinal,
    href: hrefFor(r),
    name: r.name,
    position: r.position,
    posRank: r.posRank,
    team: r.team,
    hostRank: r.hostRank,
    ecr: r.ecr,
    gap: r.gap,
    gapReason: r.gapReason,
    gapNotable: r.gap !== null && Math.abs(r.gap) >= THRESHOLDS.GAP_NOTABLE,
    hostRankDelta: r.hostRankDelta,
    signal: r.signal,
    whatItMeans: whatItMeans(r.signal, r.gap, r.hostRankDelta, r.gapReason),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">Draft Ticker</h1>
        <p className="mt-1 text-lg text-[var(--ink-2)]">
          Daily ADP movement, measured against expert consensus.
        </p>
        {!live && (
          <p className="mt-2 inline-block rounded border border-[var(--gold-border)] bg-[var(--gold-bg)] px-2 py-1 text-xs">
            FIXTURE DATA: not live.
          </p>
        )}
      </header>

      {/* No intro line here on purpose: the hero's trust strip and the phase
          card line directly below already carry the phase name and trust
          reading. */}

      {bestPair ? (
        <MirrorHero
          title={bestPair.def.title}
          phaseTitle={phase?.title ?? null}
          phaseLevel={phase?.signal_level ?? null}
          phaseProse={phase?.card_line ?? ""}
          a={sideFor(bestPair.a)}
          b={sideFor(bestPair.b)}
          evidence={pairEvidence}
          catalysts={pairCatalysts}
          sentence={
            isOpposed(bestPair.a, bestPair.b)
              ? `Same backfield, opposite directions. ${lastName(bestPair.a.name)} ${
                  (bestPair.a.hostRankDelta ?? 0) > 0 ? "up" : "down"
                } ${Math.abs(bestPair.a.hostRankDelta ?? 0)} ${moveWindow}, ${lastName(bestPair.b.name)} ${
                  (bestPair.b.hostRankDelta ?? 0) > 0 ? "up" : "down"
                } ${Math.abs(bestPair.b.hostRankDelta ?? 0)}.`
              : `Both halves of this backfield moved the SAME way ${moveWindow} (${bestPair.a.name} ${
                  (bestPair.a.hostRankDelta ?? 0) > 0 ? "+" : ""
                }${bestPair.a.hostRankDelta}, ${bestPair.b.name} ${
                  (bestPair.b.hostRankDelta ?? 0) > 0 ? "+" : ""
                }${bestPair.b.hostRankDelta}), so the mirror is not showing in the price today. Shown as measured, not as a story it is not telling.`
          }
          moveWindow={moveWindow}
          trackingSince={trackingSince}
        />
      ) : singleHero ? (
        <HeroStory
          href={hrefFor(singleHero)}
          name={singleHero.name}
          position={singleHero.position}
          posRank={singleHero.posRank}
          team={singleHero.team}
          phaseTitle={phase?.title ?? null}
          phaseLevel={phase?.signal_level ?? null}
          phaseProse={phase?.card_line ?? ""}
          archetypeTag={heroX?.arch?.tag ?? null}
          archetypeReason={heroX?.arch?.reason ?? null}
          signal={singleHero.signal}
          evidence={heroX?.evidence ?? null}
          sentence={whatItMeans(singleHero.signal, singleHero.gap, singleHero.hostRankDelta, singleHero.gapReason)}
          points={heroX?.points ?? []}
          markers={heroX?.markers ?? []}
          trackingSince={trackingSince}
          catalyst={heroCatalyst}
          hostRank={singleHero.hostRank}
          ecr={singleHero.ecr}
          gap={singleHero.gap}
        />
      ) : (
        <section className="mb-6 rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--ink-3)]">
          No player is showing a disagreement signal right now, and no curated
          pair is mirroring. Every comparable player is in broad agreement, or
          there is not yet enough history to say. Nothing is featured rather
          than featuring a non-story.
        </section>
      )}

      {stories.length === 0 && (
        <p className="mb-6 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-2)]">
          Most players are not moving. That is normal, and it is the point: only
          a handful of moves in any week are worth acting on.
        </p>
      )}

      {stories.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 text-lg font-semibold">
            What the market repriced this week
          </h2>
          <p className="mb-2 text-sm text-[var(--ink-2)]">
            Where the price actually moved, and what it costs you.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {stories.map((r) => {
              const m = moveLine(r, moveWindow);
              const v = valueLine(r);
              const cat = topCatalystFor(r.sleeperId);
              return (
                <div
                  key={r.fpId}
                  className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--ink-3)]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    {/* Stretched link: the whole card stays a tap target on a
                        phone, while the source anchor and the signal chip are
                        raised above the overlay and still work. */}
                    <Link
                      href={hrefFor(r)}
                      className="font-semibold after:absolute after:inset-0 after:content-['']"
                    >
                      {r.name}
                    </Link>
                    <span className="text-xs text-[var(--ink-3)]">
                      {r.position}{r.posRank} · {r.team}
                    </span>
                  </div>

                  {/* 1. The move, first, in plain language. Neutral by rule:
                      direction is the arrow, never colour. */}
                  <p className="mt-2 text-sm font-medium">
                    {m.arrow && (
                      <span aria-hidden className="text-[var(--ink-2)]">
                        {m.arrow}{" "}
                      </span>
                    )}
                    {m.headline}.
                  </p>
                  {m.expert && (
                    <p className="mt-0.5 text-xs text-[var(--ink-3)]">{m.expert}</p>
                  )}

                  {/* The value read: the only coloured figure on the card, and
                      it carries its own word. */}
                  <p className="mt-1 text-xs font-medium" style={{ color: v.tone }}>
                    {v.text}.
                  </p>

                  {/* 2. The signal label. */}
                  <div className="relative z-10 mt-2">
                    <SignalChip signal={r.signal} />
                  </div>

                  {/* 3. The catalyst with its source, or the honest empty
                      state. Never a guess in place of a document. */}
                  {cat ? (
                    <div
                      className="mt-2 rounded-md border px-2.5 py-2"
                      style={{
                        background: "var(--gold-bg)",
                        borderColor: "var(--gold-border)",
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                        Catalyst · {cat.date}
                      </p>
                      <p className="mt-0.5 text-xs">{cat.summary}</p>
                      <a
                        href={cat.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative z-10 mt-1 inline-block text-[10px] underline text-[var(--ink-3)]"
                      >
                        source
                      </a>
                    </div>
                  ) : (
                    <p className="mt-2 rounded-md border border-dashed border-[var(--border)] px-2.5 py-2 text-[11px] text-[var(--ink-3)]">
                      No documented event on file for this move yet.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="flex items-center gap-2 font-semibold">
          <span aria-hidden style={{ color: "var(--gold)" }}>◎</span> For your draft
        </p>
        <p className="mt-0.5 text-sm text-[var(--ink-2)]">
          Where ADP and the experts disagree most right now.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {forYourDraft.map((r, i) => (
            <div key={r.fpId} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={hrefFor(r)} className="font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-xs text-[var(--ink-3)]">{r.position}{r.posRank} · {r.team}</p>
                </div>
                <span className="text-xs text-[var(--ink-3)]">{i + 1}</span>
              </div>
              <p className="mt-2 text-sm">
                {/* Value read: coloured, and the word carries the same meaning
                    so colour is never the only signal. */}
                <span
                  className="tabular-nums font-medium"
                  style={{ color: valueTone(r.gap) }}
                >
                  {r.gap! > 0 ? "+" : ""}
                  {r.gap} gap
                  {valueWord(r.gap) ? `, ${valueWord(r.gap)}` : ""}
                </span>{" "}
                {/* Movement: neutral text, direction in the arrow. */}
                <span className="text-[var(--ink-3)]">
                  ·{" "}
                  {r.hostRankDelta === null
                    ? "no movement data yet"
                    : r.hostRankDelta === 0
                      ? `unmoved ${moveWindow}`
                      : `${r.hostRankDelta > 0 ? "▲" : "▼"} ${r.hostRankDelta > 0 ? "+" : ""}${r.hostRankDelta} ${moveWindow}`}
                </span>
              </p>
              <div className="mt-2">
                <SignalChip signal={r.signal} />
              </div>
              <p className="mt-2 text-xs text-[var(--ink-2)]">
                {whatItMeans(r.signal, r.gap, r.hostRankDelta)}
              </p>
              <p className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--ink-3)]">
                How we chose this: #{i + 1} widest market-vs-expert gap.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Movement tiles: neutral, arrow carries direction. Colouring a riser
            green and a faller red is the exact contradiction the single colour
            semantic removes, a falling host rank is a falling price. */}
        {riser ? (
          <StatCard
            label={riserLabel}
            name={riser.name}
            value={`▲ +${riser.hostRankDelta}`}
            sub={`${riser.position}${riser.posRank} · ${riser.team} · picks gained ${moveWindow}`}
            tone="neutral"
            href={hrefFor(riser)}
          />
        ) : (
          <StatCard label={riserLabel} name="–" value="–" sub={`Tracking since ${trackingSince}, needs a second snapshot`} tone="muted" />
        )}
        {faller ? (
          <StatCard
            label={fallerLabel}
            name={faller.name}
            value={`▼ ${faller.hostRankDelta}`}
            sub={`${faller.position}${faller.posRank} · ${faller.team} · picks lost ${moveWindow}`}
            tone="neutral"
            href={hrefFor(faller)}
          />
        ) : (
          <StatCard label={fallerLabel} name="–" value="–" sub={`Tracking since ${trackingSince}, needs a second snapshot`} tone="muted" />
        )}
        {/* Value read: coloured, with the word in the tile so colour is never
            the only signal. */}
        {widest && (
          <StatCard
            label="Widest expert gap"
            name={widest.name}
            value={`${widest.gap! > 0 ? "+" : ""}${widest.gap}${valueWord(widest.gap) ? ` ${valueWord(widest.gap)}` : ""}`}
            sub={`${widest.position}${widest.posRank} · ${widest.team} · ADP minus expert rank`}
            tone={widest.gap! < 0 ? "expensive" : "cheap"}
            href={hrefFor(widest)}
          />
        )}
      </section>

      <HowToReadCard />

      <p className="mb-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-2)]">
        <span className="font-medium">Thresholds:</span> Move counts at ≥
        {THRESHOLDS.HOST_RANK_MOVE} picks · Expert move at ≥{THRESHOLDS.ECR_MOVE} ranks
        · Notable gap at ≥{THRESHOLDS.GAP_NOTABLE} · Both sides clearing their
        threshold in opposite directions is labelled “Market and experts
        diverging” when the gap grew and “Market and experts converging” when it
        shrank · Gaps only inside the top{" "}
        {UNIVERSE.TOP_N} (both ADP &amp; ECR), ranked by ≥{UNIVERSE.MIN_SOURCE_COUNT} host boards
        {!hasMovement && " · Movement begins once a second daily snapshot exists"}
      </p>

      <p className="mb-2 text-sm text-[var(--ink-2)]">
        Every price move in the top 200, and how much to believe each one.
      </p>

      <MarketTable rows={tableRows} moveLabel={moveLabel} trackingSince={trackingSince} />

      <p className="mt-3 text-sm">
        <Link href="/players" className="font-medium underline">
          View the full tracked pool ({rows.length} players) →
        </Link>{" "}
        <span className="text-[var(--ink-3)]">
          Showing the top {Math.min(HOME_TABLE_ROWS, rows.length)} by ADP here.
          Gaps and signals are computed only inside the comparison universe, the top{" "}
          {UNIVERSE.TOP_N} by ADP; the Players page lists every tracked
          player, comparable or not.
        </span>
      </p>

      <footer className="mt-6 text-xs text-[var(--ink-3)]">
        Price: FantasyPros ADP (PPR), the mean of each contributing
        host board&rsquo;s rank{live ? ` across ${latest.meta.source_count} boards` : " (fixture, static)"}.
        ECR:{" "}
        {ecrLatest ? "FantasyPros official API, daily" : "FantasyPros capture Aug 10 (static)"}.
        A gap is computed for {comparableCount} players inside the comparison
        universe, the rest show “–” (too few host boards or an expert rank outside
        the top {UNIVERSE.TOP_N}), never a fabricated gap.{" "}
        <Link href="/methodology" className="underline">Methodology</Link>
      </footer>
    </main>
  );
}
