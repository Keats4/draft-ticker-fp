import Link from "next/link";
import EvalScorecard from "@/components/EvalScorecard";
import { THRESHOLDS, type FpLite } from "@/lib/math";
import { loadAllEcrSnapshots, loadFirstAndLatestSnapshots } from "@/lib/snapshot";
import { buildMarketRows, type MapByFfc } from "@/lib/market";
import playerMap from "@/data/player_map.json";
import ffcFixture from "@/fixtures/ffc_adp.json";
import fpEcr from "@/fixtures/fp_ecr.json";
import type { FfcPlayer } from "@/lib/types";

export const metadata = { title: "Methodology · Draft Ticker" };
export const dynamic = "force-dynamic";

const AWAITING = (
  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
    awaiting more data
  </span>
);

export default async function Methodology() {
  // The join review below is computed from the SAME pipeline the Market page
  // runs, so the numbers on this page are the live ones, not a stored report.
  const [{ first, latest }, ecrSnaps] = await Promise.all([
    loadFirstAndLatestSnapshots(),
    loadAllEcrSnapshots(),
  ]);
  const adpRows: FfcPlayer[] = latest ? latest.rows : (ffcFixture.players as FfcPlayer[]);
  // Read live rather than hardcoded: the sample size moves every day.
  const draftCount = latest?.meta?.total_drafts ?? null;
  const mapByFfc: MapByFfc = {};
  for (const e of Object.values(
    playerMap as Record<string, { sleeper_id: string; ffc_id?: number; fp_id?: number }>
  )) {
    if (e.ffc_id != null) mapByFfc[e.ffc_id] = { sleeper_id: e.sleeper_id, fp_id: e.fp_id };
  }
  const ecrLatest = ecrSnaps[ecrSnaps.length - 1] ?? null;
  const { review } = buildMarketRows(
    adpRows,
    first?.rows ?? null,
    ecrLatest ? ecrLatest.rows : (fpEcr as { players: FpLite[] }).players,
    mapByFfc,
    null
  );
  const joined = review.viaMap + review.viaFallback;
  const flagged =
    review.unmatched.length + review.ambiguous.length + review.teamMismatch.length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
      <p className="mt-2 text-neutral-500">
        Every number on the data pages (Market, Players, player pages,
        Featured and this one) traces to a named source, a capture time, and a
        calculation defined on this page. Where one day of data cannot support a
        claim, the site says so instead of implying history. Two pages are
        excluded by design and badged as such: the Market Price Index and
        Inside FP are concept previews whose figures are illustrative, not
        measured.
      </p>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-xl font-semibold">What this adds</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          FantasyPros already collects, stores, and even charts this series, a
          daily ECR-vs-ADP chart (two series plus a 5-day moving average)           sits on their own player pages. They render it
          and stop there. Draft Ticker adds the interpretation layer on top:
          movement screening, who-moved-first signals, catalyst annotation,
          calendar context, and evaluated explanations: turning a raw exhibit
          into a research desk. Signals also carry an evidence tier, catalyst-confirmed when a verified catalyst sits inside the rolling window that governs the
          move, unexplained otherwise (watch, don’t act), so a reading always
          shows its receipts or admits it has none. We do not claim FantasyPros
          lacks the data or the chart; we build what they leave off of it.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Positional ranks</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Positional ranks here (TE13, WR24) are computed from FantasyPros&rsquo;
          overall ECR across the players we successfully match, so they can
          differ by a place or two from the positional ranks published on their
          site. A player they rank whom we fail to join shifts every rank below
          him. Draft-cost positional rank is computed the same way from Fantasy
          Football Calculator&rsquo;s ADP ordering, which already excludes kickers
          and team defenses, so their removal does not distort the skill
          position ranks.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Where the market number comes from</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Draft cost here is Fantasy Football Calculator&rsquo;s PPR twelve team
          ADP, computed from mock drafts run on their site over a rolling seven
          day window, with computer picks filtered out and only human selections
          counted (
          <a
            href="https://fantasyfootballcalculator.com/adp/ppr"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            their stated method
          </a>
          ). The current sample is{" "}
          {draftCount ? `${draftCount.toLocaleString()} drafts` : "the live rolling window"}.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          That is a specific crowd, not the whole market. People running August
          mocks are hobbyists rather than the manager who shows up five minutes
          before the draft. It moves faster than a platform average and it
          reflects more engaged drafters. FantasyPros publishes its own
          composite ADP across the major league hosts, which is a different and
          broader population.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Two consequences worth knowing. Because it is a seven day rolling
          mean, a move you see today reflects drafts from the past week, and an
          event cannot show up in it faster than that. And because it is one
          crowd rather than all of them, it is best read as a leading indicator
          rather than as what your league will do.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-3)]">
          Roadmap: comparing this mock draft crowd against a platform composite
          would show where the sharp market and the general market disagree,
          which is a second gap and a better one. That second source is now
          being captured daily in parallel, stored but not used:{" "}
          <Link href="/adp-sources" className="underline">
            see the two sources side by side
          </Link>
          . It feeds nothing on this site, and it will not until there is enough
          stored history to say anything honest about it.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Sources and capture times</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            <strong>ADP</strong>: Fantasy Football Calculator public API
            (PPR, 12-team, 2026). Captured automatically every day at 6:00 AM
            PT by a scheduled job; each day is stored as an immutable dated
            snapshot. Tracking since Aug 10, 2026. Each pull is a rolling
            average over roughly the previous seven days of drafts, not that
            day&rsquo;s spot price; the API returns the exact window it covers in
            meta.start_date and meta.end_date.
          </li>
          <li>
            <strong>ECR</strong>: FantasyPros consensus rankings (Draft PPR),
            via the official FantasyPros API (limited public tier). Captured
            automatically every day at 6:00 AM PT by the same scheduled job
            that pulls ADP, and stored as its own dated snapshot alongside it.
            The capture date is shown wherever ECR appears. If no stored ECR
            snapshot can be read, the page falls back to the static Aug 10,
            2026 capture and labels it as such.
          </li>
          <li>
            <strong>FantasyPros composite ADP</strong> (parallel, stored only,
            since Aug 16, 2026): a composite of five league host sites, league
            size agnostic, captured by the same daily job and stored under its
            own path. It is <em>not</em> used in any gap, signal, threshold,
            chart, story card or evidence tier, and it is not the ADP shown
            anywhere on this site. It exists so a second series accumulates,
            because ADP history cannot be bought after the fact. Compare them on{" "}
            <Link href="/adp-sources" className="underline">
              ADP sources
            </Link>
            .
          </li>
          <li>
            <strong>Player identity</strong>: Sleeper player database is the
            canonical ID space. Most rows join on a reviewed mapping table; only
            the rows that table does not cover fall through to name matching,
            and every one of those that fails to resolve is logged for human
            review rather than guessed. Live counts are below.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Calculations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            <strong>Gap</strong> = ADP − ECR. Positive: the market drafts the
            player later than experts rank him. Negative: the market pays a
            premium relative to the expert view.
          </li>
          <li>
            <strong>Movement</strong> = oldest stored snapshot ADP − newest
            snapshot ADP, so positive means rising (drafted earlier now). The
            window is the full tracked span, not a single day: every “Move”
            figure on the site covers Aug 10, 2026 to the most recent capture,
            and the dates are printed wherever the number appears. Missing data
            renders as “, ”, never as zero.
          </li>
          <li>
            <strong>Signal labels</strong> are rules, not a model:
            market-vs-expert movement compared over the same window. A label
            appears only when both movement series exist.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Signal thresholds</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            ADP move counts as real at ≥ {THRESHOLDS.ADP_MOVE} picks.
          </li>
          <li>ECR move counts as real at ≥ {THRESHOLDS.ECR_MOVE} ranks.</li>
          <li>
            A gap is flagged notable at |Gap| ≥ {THRESHOLDS.GAP_NOTABLE}{" "}
            picks.
          </li>
        </ul>
        <p className="mt-3 text-sm text-neutral-700">
          Which label applies is a fixed branch order, evaluated top to bottom;
          the first match wins:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            <strong>No label</strong> if either movement series is missing
            (day one, or an unmatched expert rank). The site renders “, ”, never
            a label.
          </li>
          <li>
            <strong>Both sides cleared their threshold, same direction</strong>
            {", "}“Market moving faster” when |ADP move| ≥ 1.5 × |ECR move|,
            otherwise “Broad agreement”.
          </li>
          <li>
            <strong>Both sides cleared their threshold, opposite directions</strong>
            {" , "}split on distance, not just direction. Two lines can move
            opposite ways and still close on each other, so the prior gap is
            reconstructed from both moves: if the absolute gap grew it is
            “Market and experts diverging”, if it shrank it is “Market and
            experts converging”.
          </li>
          <li>
            <strong>ADP alone cleared its threshold</strong>: “Market catching
            up to experts” if the move shrank |Gap|, otherwise “Market moving
            faster”. <em>No 1.5× test applies on this path</em>: an ADP-only
            move of {THRESHOLDS.ADP_MOVE} picks that widens the gap is labelled
            “Market moving faster” regardless of how far ECR drifted below its
            own threshold.
          </li>
          <li>
            <strong>ECR alone cleared its threshold</strong>: “Experts moving
            first”.
          </li>
          <li>
            <strong>Neither cleared its threshold</strong>: “Broad agreement”.
          </li>
        </ol>
        <p className="mt-2 text-sm text-neutral-500">
          These initial thresholds are judgment calls, not fitted to
          historical data {AWAITING}. They will be revisited once several
          weeks of snapshots exist, and any change will be recorded here.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Comparison universe</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          A gap (ADP − ECR) is only meaningful when both sources genuinely
          cover the player. Outside a comparable band, ADP is thin (drafted in
          few leagues) or ECR is in the noisy tail (experts effectively do not
          rank him), and subtracting the two produces giant, misleading gaps.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--ink-2)]">
          <li>
            Only quarterbacks, running backs, wide receivers and tight ends are
            tracked. Kickers and team defenses are excluded from the pipeline
            entirely, so they receive no rank, gap, signal or page. They are
            dropped before ranking, which means the <em>#</em> column is a rank
            among tracked players, while <em>ADP</em> stays the source&rsquo;s
            average pick from real drafts those positions were part of. The two
            differ on purpose.
          </li>
          <li>
            Only the top 200 tracked players by ADP are <em>compared</em>. The
            Market page <em>displays</em> the top 25 and links to Players for the
            rest; the comparison universe is unchanged by that cap.
          </li>
          <li>A player must be drafted in at least 30 mock drafts (liquidity bar) for his ADP to count.</li>
          <li>An expert rank (ECR) beyond the top 200 is treated as “unranked in the comparable range”, no gap is computed, rather than a fabricated one.</li>
          <li>When a gap is not computed, the value shows “, ” with the reason, never a guess. “For your draft” and the widest-gap highlight are drawn only from this universe.</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          Why 200 and 30: median times-drafted stays above ~80 through ADP
          rank 200, then collapses to ~19 beyond it, so 200 sits at the
          liquidity cliff rather than being an arbitrary round number. The
          30-draft bar additionally removes 6 of 173 otherwise-comparable
          players whose ADP rests on too few drafts to trust.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Archetypes</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          The tag next to a player&rsquo;s name is a <strong>tenure cut, not a
          usage claim</strong>. It is derived only from fields the Sleeper player
          record already carries: position, years of experience, age, and
          current injury designation, and says nothing about a player&rsquo;s
          role, snap share or standing on a depth chart. A back splitting a
          committee and a clear starter with the same years of service get the
          same tag.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li><strong>Rookie WR / Rookie RB / Rookie</strong>: years_exp 0.</li>
          <li><strong>Sophomore</strong>: years_exp 1.</li>
          <li><strong>Ascending</strong>: years_exp 2–3.</li>
          <li><strong>Prime</strong>: years_exp 4–5 and age under 30.</li>
          <li><strong>Veteran</strong>: years_exp 6 or more, or age 30 or over. Checked ahead of Ascending and Prime, so a 30-year-old is never tagged either.</li>
          <li><strong>Injury-Return</strong>: current Sleeper status is IR, Out, PUP, NFI, Doubtful, Suspended or COV. Day-to-day tags are ignored as too noisy.</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          <strong>Known gap.</strong> Injury-Return fires on a player&rsquo;s
          <em> current</em> designation, not his injury history. A player two ACL
          tears into his career who is healthy today carries no tag, because
          nothing we store remembers the tears. Closing that needs an
          injury-history source the site does not have.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          <strong>v2 roadmap:</strong> usage-derived archetypes read from
          depth-chart designations, the explicit &ldquo;or&rdquo; pairings teams
          publish, and first-team rep reports, so a committee back is labelled
          for what he does rather than how long he has been in the league.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Cross-source join review</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          ADP and expert ranks come from two different providers with two
          different id spaces, so every row has to be joined. These counts are
          computed live, on this request, by the same function the Market page
          uses, they are not a stored report.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            <strong>{review.viaMap}</strong> rows joined on the reviewed mapping
            table (Sleeper id → FantasyPros id). These never reach name matching.
          </li>
          <li>
            <strong>{review.viaFallback}</strong> rows the mapping table does not
            cover, resolved by normalised name and position.
          </li>
          <li>
            <strong>{review.unmatched.length}</strong> unmatched, no confident
            expert match, so ECR renders “, ” and no gap is computed
            {review.unmatched.length > 0 && <>: {review.unmatched.join(", ")}</>}.
          </li>
          <li>
            <strong>{review.ambiguous.length}</strong> ambiguous, more than one
            candidate, never auto-picked
            {review.ambiguous.length > 0 && <>: {review.ambiguous.join(", ")}</>}.
          </li>
          <li>
            <strong>{review.teamMismatch.length}</strong> matched on name and
            position with a disagreeing team, accepted but flagged
            {review.teamMismatch.length > 0 && <>: {review.teamMismatch.join(", ")}</>}.
          </li>
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          {joined} of {joined + flagged} rows resolved; {flagged} flagged for a
          human. The scope is worth stating plainly: this review covers the rows
          that fall through to name matching. A row joined on the mapping table
          cannot appear here, because it never went through the matcher, the
          mapping table itself is checked separately at build time.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Limitations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            History begins Aug 10, 2026. No chart or number implies data from
            before that date.
          </li>
          <li>
            ADP reflects Fantasy Football Calculator mock drafts only, one
            market, not all of fantasy football.
          </li>
          <li>
            Because ADP is a trailing seven-day mean, two consecutive daily
            snapshots share six of their seven days of drafts. A single day of
            news therefore enters the average at roughly one-seventh weight and
            takes about a week to wash through, so a real repricing appears as a
            week-long slope rather than a step, and day-over-day movement is
            damped. The move thresholds have not yet been re-fitted against that
            property {AWAITING}.
          </li>
          <li>
            The same property sets the catalyst lookback. The Aug 10 snapshot
            averages drafts from Aug 4 to Aug 10 and the Aug 12 snapshot
            averages Aug 6 to Aug 12, so the move between them is driven only
            by the drafts entering the newer mean (Aug 11 to Aug 12) and the
            drafts leaving the older one (Aug 4 to Aug 5). The Aug 6 to Aug 10
            overlap sits in both means and largely cancels. A catalyst on the
            leaving edge therefore pushes the measured move against its own
            direction, because the reaction is ageing out of the average.
            Catalysts are matched over the full rolling window for that reason,
            not over the gap between snapshots. Until Aug 14, 2026 they were
            matched from the previous snapshot forward, which silently
            discarded the entire leaving edge.
          </li>
          <li>
            ECR history is short, it begins with the first automated capture,
            so the expert line has fewer points than the market line until the
            two histories are the same length. The chart now reads every stored
            ECR snapshot, not just the most recent ones.
          </li>
          <li>
            Some players have no confident cross-source match and show “, ”
            for ECR rather than a guessed value.
          </li>
          <li>
            Signal evaluation summary (how often each label appeared and how
            it resolved): {AWAITING}.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Explanation evals</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          The AI explanation layer is gated behind a scorecard. Until it runs,
          the shell shows a pending state rather than any score.
        </p>
        <div className="mt-3">
          <EvalScorecard />
        </div>
      </section>

      <p className="mt-10 text-xs text-neutral-400">
        Decision records for the storage and catalyst approaches live in the
        repository under /decisions.
      </p>
    </main>
  );
}
