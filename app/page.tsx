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
  valueWord,
  valueTone,
  leadLine,
  smallNumberWord,
} from "@/lib/story";
import { evidenceFor, inMoveWindow } from "@/lib/evidence";
import { buildArchetypes } from "@/lib/archetype";
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

/**
 * "For your draft" eligibility bound: only players inside the top
 * FOR_YOUR_DRAFT_TOP_N by ADP are candidates, then ranked by gap as before.
 * A chosen constraint, not a fitted one (stated on the methodology page):
 * without it the module surfaces late-round quarterbacks with mathematically
 * huge gaps, which is not what a drafter means by the three decisions that
 * matter most. Display selection only; the comparison universe, the market
 * table and every signal are untouched by this bound.
 */
const FOR_YOUR_DRAFT_TOP_N = 120;

/** "Aug 15" from a stored YYYY-MM-DD date. */
const fmtShortDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

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
  /** Optional, display only: a front-page one-line statement of the event in
   *  plain words. The summary stays the evidence record; this is the
   *  headline form. Never read by evidence or verification logic. */
  short_label?: string;
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
  arrow,
  tone,
  href,
}: {
  label: string;
  name: string;
  sub: string;
  value: string;
  /** Direction arrow, rendered navy: movement's colour is the product navy,
   *  never green or red, and direction lives in orientation alone. */
  arrow?: "▲" | "▼";
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
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {arrow && (
            <span aria-hidden style={{ color: "var(--navy)" }}>{arrow} </span>
          )}
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
  // hardcoded date: the series begins at its own first capture.
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

  const movers = rows.filter((r) => r.hostRankDelta !== null && r.inUniverse);
  const riser = [...movers].sort((a, b) => b.hostRankDelta! - a.hostRankDelta!)[0];
  const faller = [...movers].sort((a, b) => a.hostRankDelta! - b.hostRankDelta!)[0];

  const forYourDraft = withGap
    .filter((r) => r.hostRankOrdinal <= FOR_YOUR_DRAFT_TOP_N)
    .sort((a, b) => Math.abs(b.gap!) - Math.abs(a.gap!))
    .slice(0, 3);

  // ---- Story selection. Programmatic, never a hardcoded player. ----
  const ranked = rankStories(rows);

  // ---- Per-player support data, all pulled from live code paths ----
  const phases = phasesFile.phases as Phase[];
  const phase = currentPhase(phases as unknown as LibPhase[]).phase;
  // Trust renders once, in the hero's strip; the duplicate footer meter was
  // removed in the compression pass.

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

  // Role archetypes need the whole room (team + position + ADP), so they are
  // computed once from the full row set. Display only: never an input to any
  // signal, ranking or selection.
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

  const extrasFor = (row: MarketRow) => {
    const arch = archMap.get(row.fpId) ?? null;
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

  // Hero guard for the no-pair fallback: the featured single should be a
  // draft decision, and a player on a season-scoped reserve list (IR, PUP,
  // NFI) has a documented move but is no longer a decision at his old price,
  // a season-ending injury is the one move a drafter cannot act on. He still
  // appears in the plain lead, the story cards, the tiles and the table; only
  // the hero spotlight skips him. Rule-based, never a hardcoded player: it
  // reads the same Sleeper designation the archetype layer uses, so it takes
  // effect for a newly injured player when player_map is next rebuilt.
  const SEASON_SCOPED_STATUS = new Set(["IR", "PUP", "NFI"]);
  const singleHero =
    ranked.find((r) => {
      const status = r.sleeperId
        ? entryBySleeper.get(r.sleeperId)?.injury_status
        : null;
      return !(status && SEASON_SCOPED_STATUS.has(status));
    }) ?? null;
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
  type PairCatalyst = { date: string; summary: string; label: string | null; sourceUrl: string; player: string | null };
  const pairCatalysts: PairCatalyst[] = bestPair
    ? [topCatalystFor(bestPair.a.sleeperId), topCatalystFor(bestPair.b.sleeperId)]
        .filter((c): c is NonNullable<typeof c> => c != null)
        .filter((c, i, arr) => arr.findIndex((x) => x.source_url === c.source_url) === i)
        .sort((x, y) => (x.date < y.date ? 1 : -1))
        .map((c) => ({
          date: c.date,
          summary: c.summary,
          label: c.short_label ?? null,
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
        label: heroX.verified[0].short_label ?? null,
        sourceUrl: heroX.verified[0].source_url,
      }
    : null;

  // ---- The plain English lead. ----
  // Two or three moves stated in ordinary language before any vocabulary.
  // Selection is programmatic and reuses what the page already decided: the
  // leading mirror pair's sides first, then the story ranking, keeping only
  // moves that cleared the published price bar inside the universe. Nothing
  // is ever hardcoded, and if no move qualifies the section does not render.
  const windowDays =
    previous && latest
      ? Math.round(
          (Date.parse(latest.date + "T12:00:00Z") -
            Date.parse(previous.date + "T12:00:00Z")) /
            86_400_000
        )
      : null;
  const daysAgo =
    windowDays === null
      ? null
      : windowDays === 1
        ? "yesterday"
        : `${smallNumberWord(windowDays)} days ago`;

  const leadEligible = (r: MarketRow) =>
    r.inUniverse &&
    r.hostRankDelta !== null &&
    Math.abs(r.hostRankDelta) >= THRESHOLDS.HOST_RANK_MOVE;
  const leadPool: MarketRow[] = [];
  for (const r of bestPair ? [bestPair.a, bestPair.b] : []) {
    if (leadEligible(r)) leadPool.push(r);
  }
  for (const r of ranked) {
    if (leadEligible(r) && !leadPool.some((p) => p.fpId === r.fpId)) leadPool.push(r);
  }
  /** Display copy only: four-word market-versus-expert relationship for the
   *  lead's scan line. Reads the published bars, introduces nothing new. */
  const relWord = (hd: number, ed: number | null): string | null => {
    if (ed == null) return null;
    if (Math.abs(ed) < THRESHOLDS.ECR_MOVE) return "Experts haven't moved";
    if (ed * hd < 0) return "Experts went the other way";
    const ratio = Math.abs(ed) / Math.abs(hd);
    if (ratio >= 2 / 3 && ratio <= 1.5) return "Experts matched it";
    return ratio < 1 ? "Experts trailed it" : "Experts moved further";
  };
  type LeadItem = {
    href: string;
    name: string;
    sub: string;
    arrow: string;
    figure: string;
    figureSub: string;
    rel: string | null;
    reason: string;
    detail: string;
  };
  const leadItems: LeadItem[] = daysAgo
    ? leadPool.slice(0, 3).flatMap((r) => {
        const read = leadLine(r, daysAgo);
        if (!read) return [];
        // Evidence clause from the same predicate every other surface uses:
        // verified, non-sample events inside the move window plus lookback.
        const inWin =
          previous && latest
            ? catalystsFor(r.sleeperId)
                .filter((c) => c.verified && !c.sample)
                .filter((c) => inMoveWindow(c.date, previous.date, latest.date))
                .sort((x, y) => (x.date < y.date ? 1 : -1))
            : [];
        // The evidence line renders the newest qualifying catalyst's
        // short_label: the headline form written for this spot. The summary
        // is an evidence record and never renders here. When no qualifying
        // entry carries a label, the line falls back to the honest empty
        // state rather than improvising one. Only the newest label shows;
        // the full sourced list lives on the player page and in the hero.
        const labelled = inWin.find((c) => c.short_label);
        const reason = labelled?.short_label
          ? `${fmtShortDate(labelled.date)} · ${labelled.short_label.trim().replace(/[.!?]$/, "")}`
          : "No documented event yet";
        const evidence = labelled?.short_label
          ? `${fmtShortDate(labelled.date)}: ${labelled.short_label.trim().replace(/[.!?]?$/, ".")}`
          : "No documented event is on file for this move yet.";
        const d = r.hostRankDelta!;
        return [
          {
            href: hrefFor(r),
            name: r.name,
            sub: `${r.position}${r.posRank} · ${r.team}`,
            arrow: d > 0 ? "▲" : "▼",
            // The arrow carries direction; the figure is magnitude only.
            figure: `${Math.abs(d)}`,
            figureSub: windowDays ? `picks · ${windowDays}d` : "picks",
            rel: relWord(d, r.ecrDelta),
            // Full sentences from the previous lead, intact behind the expander.
            detail: `${read.main}.${read.expert ? ` ${read.expert}` : ""} ${evidence}`,
            reason,
          },
        ];
      })
    : [];

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
    whatItMeans: whatItMeans(r.signal, r.gap, r.hostRankDelta, r.ecrDelta, r.gapReason),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">Draft Ticker</h1>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Daily ADP movement, measured against expert consensus.
        </p>
        {!live && (
          <p className="mt-2 inline-block rounded border border-[var(--gold-border)] bg-[var(--gold-bg)] px-2 py-1 text-xs">
            FIXTURE DATA: not live.
          </p>
        )}
      </header>

      {/* The plain English lead: the first fifteen seconds, in ordinary
          language. The market mechanics (hero, signals, evidence tiers,
          table) all stay below for the reader who wants them. */}
      {leadItems.length > 0 && (
        <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-3)]">
            What changed since your last mock draft
          </h2>
          {/* Numbers lead, words support: the figure lands before a word is
              read. Same positions on every row so the eye learns the pattern
              once. Full sentences stay intact behind the expander. */}
          <div className="mt-3 space-y-4">
            {leadItems.map((item) => (
              <div
                key={item.href}
                className="flex items-start gap-4 border-l-2 pl-3"
                style={{ borderColor: "var(--navy)" }}
              >
                <div className="w-24 shrink-0 text-right">
                  <p className="text-2xl font-bold tabular-nums leading-none">
                    <span aria-hidden style={{ color: "var(--navy)" }}>{item.arrow} </span>
                    {item.figure}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-3)]">{item.figureSub}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">
                    <Link href={item.href} className="hover:underline">{item.name}</Link>{" "}
                    <span className="font-normal text-[var(--ink-3)]">{item.sub}</span>
                  </p>
                  {item.rel && (
                    <span
                      className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs"
                      style={{ background: "rgba(22,35,61,0.06)", color: "var(--navy-2)" }}
                    >
                      {item.rel}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--ink-3)]">{item.reason}</p>
                  <details className="mt-0.5">
                    <summary
                      className="cursor-pointer select-none text-xs text-[var(--ink-3)] underline"
                      style={{ textDecorationColor: "var(--gold)" }}
                    >
                      details
                    </summary>
                    <p className="mt-1 max-w-prose text-xs leading-relaxed text-[var(--ink-2)]">
                      {item.detail}
                    </p>
                  </details>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-[var(--border)] pt-2 text-xs text-[var(--ink-3)]">
            The numbers, signals and sources behind each of these are below.
          </p>
        </section>
      )}

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
          sentence={whatItMeans(singleHero.signal, singleHero.gap, singleHero.hostRankDelta, singleHero.ecrDelta, singleHero.gapReason)}
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
          pair is mirroring. Every comparable player is holding or repricing
          in agreement, or
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
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ink-3)]">
            What the market repriced this week
          </h2>
          {/* One number is the headline per card; everything else is
              secondary type. Whitespace separates the cards, not borders.
              Fixed rhythm: name, market move, expert move + gap, signal,
              reason. Movement stays neutral with an arrow; the gap is the
              only coloured figure and carries its word. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {stories.map((r) => {
              const cat = topCatalystFor(r.sleeperId);
              const d = r.hostRankDelta;
              return (
                <div
                  key={r.fpId}
                  className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--ink-3)]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    {/* Stretched link: the whole card stays a tap target on a
                        phone, while the expander and the signal chip are
                        raised above the overlay and still work. */}
                    <Link
                      href={hrefFor(r)}
                      className="text-sm font-semibold after:absolute after:inset-0 after:content-['']"
                    >
                      {r.name}
                    </Link>
                    <span className="text-xs text-[var(--ink-3)]">
                      {r.position}{r.posRank} · {r.team}
                    </span>
                  </div>

                  <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">
                    {d !== null && d !== 0 && (
                      <span aria-hidden style={{ color: "var(--navy)" }}>{d > 0 ? "▲" : "▼"} </span>
                    )}
                    {d === null ? "–" : Math.abs(d)}
                    <span className="ml-2 align-baseline text-xs font-normal text-[var(--ink-3)]">
                      picks {moveWindow}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-[var(--ink-2)]">
                    {r.ecrDelta === null
                      ? "Experts: no data"
                      : r.ecrDelta === 0
                        ? "Experts unmoved"
                        : `Experts ${r.ecrDelta > 0 ? "▲" : "▼"} ${Math.abs(r.ecrDelta)}`}
                    {r.gap !== null && (
                      <>
                        {" · "}
                        <span style={{ color: valueTone(r.gap) }}>
                          Gap {r.gap > 0 ? "+" : ""}{r.gap}
                          {valueWord(r.gap) ? ` ${valueWord(r.gap)}` : ""}
                        </span>
                      </>
                    )}
                  </p>

                  <div className="relative z-10 mt-2">
                    <SignalChip signal={r.signal} />
                  </div>

                  {cat ? (
                    <div className="mt-2.5">
                      <span
                        className="inline-block rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
                      >
                        Event · {cat.date}
                      </span>
                      <p className="mt-1 text-xs text-[var(--ink-2)]">
                        {cat.short_label ?? cat.summary}
                      </p>
                      <details className="relative z-10 mt-0.5">
                        <summary
                          className="cursor-pointer select-none text-xs text-[var(--ink-3)] underline"
                          style={{ textDecorationColor: "var(--gold)" }}
                        >
                          view evidence
                        </summary>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">
                          {cat.summary}{" "}
                          <a
                            href={cat.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-[var(--ink-3)]"
                          >
                            source
                          </a>
                        </p>
                      </details>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--ink-3)]">
                      No documented event yet.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--ink-3)]">
          <span aria-hidden style={{ color: "var(--gold)" }}>◎</span> For your draft
        </p>
        <p className="mt-0.5 text-xs text-[var(--ink-2)]">
          Where ADP and the experts disagree most inside the top{" "}
          {FOR_YOUR_DRAFT_TOP_N} by ADP, the picks a drafter actually faces.
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
                  className="tabular-nums font-semibold"
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
                      : (
                        <>
                          <span aria-hidden style={{ color: "var(--navy)" }}>
                            {r.hostRankDelta > 0 ? "▲" : "▼"}
                          </span>{" "}
                          {Math.abs(r.hostRankDelta)} {moveWindow}
                        </>
                      )}
                </span>
              </p>
              <div className="mt-2">
                <SignalChip signal={r.signal} />
              </div>
              <p className="mt-2 text-xs text-[var(--ink-2)]">
                {whatItMeans(r.signal, r.gap, r.hostRankDelta, r.ecrDelta)}
              </p>
              <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--ink-3)]">
                How we chose this: #{i + 1} widest market-vs-expert gap inside
                the top {FOR_YOUR_DRAFT_TOP_N} by ADP.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Movement tiles: neutral, arrow carries direction. Colouring a riser
            green and a faller red is the exact contradiction the single colour
            semantic removes, a falling host rank is a falling price. These two
            are the only surface where a large move carrying a "Broad
            agreement" label appears: story cards rank by signal strength and
            that label scores zero there. The old third tile, widest expert
            gap, duplicated "For your draft" with worse selection (it
            re-surfaced the late-round quarterbacks the top 120 bound excludes)
            and was removed. */}
        {riser ? (
          <StatCard
            label={riserLabel}
            name={riser.name}
            value={`${Math.abs(riser.hostRankDelta!)}`}
            arrow="▲"
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
            value={`${Math.abs(faller.hostRankDelta!)}`}
            arrow="▼"
            sub={`${faller.position}${faller.posRank} · ${faller.team} · picks lost ${moveWindow}`}
            tone="neutral"
            href={hrefFor(faller)}
          />
        ) : (
          <StatCard label={fallerLabel} name="–" value="–" sub={`Tracking since ${trackingSince}, needs a second snapshot`} tone="muted" />
        )}
      </section>

      {/* The one explainer block, directly above the table where the
          vocabulary is used. It merges the old how-to-read card and the
          thresholds legend; dismissing collapses it to a one-line legend
          rather than removing the published bars from the page. */}
      <HowToReadCard hasMovement={hasMovement} />

      <p className="mb-2 text-sm text-[var(--ink-2)]">
        Every price move in the top 200, and how much to believe each one.
      </p>

      <MarketTable rows={tableRows} moveLabel={moveLabel} trackingSince={trackingSince} />

      <p className="mt-3 text-sm">
        <Link href="/players" className="font-semibold underline">
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
