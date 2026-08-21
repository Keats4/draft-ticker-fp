import Link from "next/link";
import EvalScorecard from "@/components/EvalScorecard";
import { THRESHOLDS } from "@/lib/math";
import { CATALYST_LOOKBACK_DAYS } from "@/lib/evidence";
import { loadFirstAndLatestSnapshots } from "@/lib/snapshot";

export const metadata = { title: "Methodology · Draft Ticker" };
export const dynamic = "force-dynamic";

/** "Aug 16, 2026" from a stored YYYY-MM-DD date. */
const fmtLongDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function Methodology() {
  // The only live data this page reads is the stored series' own endpoints,
  // so every date it states is derived rather than hardcoded and cannot go
  // stale when the history grows or restarts. Blob unavailable degrades to
  // wording without a date, never to a wrong one.
  const { first, latest } = await loadFirstAndLatestSnapshots();
  const seriesStart = first?.date ?? latest?.date ?? null;
  const startLong = seriesStart ? fmtLongDate(seriesStart) : null;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
      <p className="mt-2 text-neutral-500">
        Every number on the data pages (Market, Players, player pages,
        and this one) traces to a named source, a capture time, and a
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
          into a research desk. Signals also carry an evidence tier, verified
          event in window when one sits inside the rolling window that governs
          the move, unexplained otherwise (watch, don’t act), so a reading always
          shows its receipts or admits it has none. We do not claim FantasyPros
          lacks the data or the chart; we build what they leave off of it.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Positional ranks</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Positional ranks here (TE13, WR24) are computed from FantasyPros&rsquo;
          overall ECR across the tracked players who hold an ECR, so they can
          differ by a place or two from the positional ranks published on their
          site. A player they rank whom the pipeline does not cover shifts
          every rank below him. Price-side positional rank comes from the ADP
          payload&rsquo;s own pos_rank field; kickers and team defenses are
          excluded from the pipeline before ranking, so their removal does not
          distort the skill position ranks.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Where the market number comes from</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          ADP on this site is FantasyPros&rsquo; consensus average host rank
          for PPR: the mean of a player&rsquo;s rank across up to five league
          host boards, taken from the official API, which exposes each
          contributing board&rsquo;s rank and publish time. It is an average
          rank, not a literal draft slot.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          That composite is a specific population, not the whole market. Only
          two of the five boards are identifiable, RTSports and Sleeper; the
          other three are unnamed by the API. Coverage varies by scoring
          format, five boards for PPR, three for half-PPR, two for standard,
          and one host publishes roughly 25 hours behind the others in every
          format, so part of the average always lags the news.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Two consequences worth knowing. Because it is an average over a
          varying set of boards, a host adding or dropping a player moves the
          number without anyone repricing him, which is why movement is
          measured over the boards present on both days only. And because the
          boards publish up to a day apart, a move can keep entering the
          average after the event that caused it. The same averaging is why a
          backfield pair&rsquo;s moves are not an exact mirror and are not
          expected to be: each side is averaged independently across boards,
          so what matters in a mirror pair is direction, one side&rsquo;s gain
          showing up as the other&rsquo;s loss, not equal sizes.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Sources and capture times</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            <strong>ADP</strong> (the price): FantasyPros&rsquo;
            consensus composite (PPR, defined above),
            captured automatically every day at 6:00 AM PT by a scheduled job.
            Each day is stored as an immutable dated snapshot alongside the
            raw payload exactly as received, so the typed series can always be
            rebuilt from source. Series begins with its first stored capture
            {startLong ? `, ${startLong}` : ""}.
          </li>
          <li>
            <strong>ECR</strong>: FantasyPros consensus rankings (Draft PPR),
            via the official FantasyPros API (limited public tier). Captured
            automatically every day at 6:00 AM PT by the same scheduled job
            that pulls the ADP composite, and stored as its own dated
            snapshot alongside it.
            The capture date is shown wherever ECR appears. If no stored ECR
            snapshot can be read, the page falls back to the static Aug 10,
            2026 capture and labels it as such.
          </li>
          <li>
            <strong>Player identity</strong>: price and expert rank share the
            FantasyPros player_id, so the two series need no join at all. A
            reviewed mapping table (FantasyPros id → Sleeper id) links players
            to catalysts, archetype inputs and page URLs; a row it does not
            cover simply renders without those extras, never a guessed match.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Calculations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            <strong>Gap</strong> = ADP − ECR. Positive: the market drafts the
            player later than experts rank him, a discount to the expert rank.
            Negative: the market pays a premium relative to the expert view.
          </li>
          <li>
            <strong>Movement</strong> = window-start ADP − window-end ADP, so
            positive means rising (drafted earlier now). The window is the
            span both series share, oldest shared date to newest: every
            “Move” figure on the site covers{" "}
            {startLong ?? "the first stored capture"} to the most recent
            capture, and the dates are printed wherever the number appears.
            The delta is computed only over host boards present on both days,
            for the averaging reasons stated under “Where the market number
            comes from” above. Missing data renders as “–”, never as zero.
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
            ADP move counts as real at ≥ {THRESHOLDS.HOST_RANK_MOVE} picks.
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
            (day one, or an unmatched expert rank). The site renders “–”, never
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
            move of {THRESHOLDS.HOST_RANK_MOVE} picks that widens the gap is labelled
            “Market moving faster” regardless of how far ECR drifted below its
            own threshold.
          </li>
          <li>
            <strong>ECR alone cleared its threshold</strong>: “Experts moving
            first”.
          </li>
          <li>
            <strong>Neither cleared its threshold</strong>: “Both holding”.
          </li>
        </ol>
        <p className="mt-2 text-sm text-neutral-500">
          These initial thresholds are judgment calls, not fitted to
          historical data. First directional read, recorded 2026-08-20 on the
          five days stored so far: the 3 pick price bar sits near the 80th
          percentile of nonzero price moves over the window (26 of 172
          comparable players cleared it), while the 2 rank expert bar sits at
          the median of nonzero expert moves (83 of 172 cleared), so if either
          bar is mis-set it is the expert side being too loose. Five days
          inside one high trust phase is a direction, not a fit. The bars will
          be percentile matched once several weeks of windows exist, and any
          change will be recorded here.
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
            average across host boards those positions were part of. The two
            differ on purpose.
          </li>
          <li>
            Only the top 200 tracked players by ADP are <em>compared</em>. The
            Market page <em>displays</em> the top 25 and links to Players for the
            rest; the comparison universe is unchanged by that cap.
          </li>
          <li>A player must be ranked by at least four of the five host boards (coverage bar) for his ADP to count.</li>
          <li>An expert rank (ECR) beyond the top 200 is treated as “unranked in the comparable range”, no gap is computed, rather than a fabricated one.</li>
          <li>When a gap is not computed, the value shows “–” with the reason, never a guess. “For your draft” and the widest-gap highlight are drawn only from this universe.</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          Why these bars: the coverage requirement is the liquidity rule. A
          price averaged over at least four of the five host boards rests on
          real drafting across hosts; a player carried by one board produces
          movement that is mostly that board&rsquo;s noise. The 200 cap is a
          chosen cutoff, stated as one: a judgment call with the same
          standing as the move thresholds until enough history exists to
          measure where comparability actually degrades.
        </p>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          One display module carries a further bound. &ldquo;For your
          draft&rdquo; picks its three players only from the top 120 by ADP,
          then ranks by gap as everywhere else. The reason is what the module
          claims to be: the three decisions that matter most at a draft table.
          Ranked purely by raw gap, the widest disagreements in the full
          universe are routinely late-round quarterbacks the market defers by
          position, mathematically correct and not a decision anyone is
          weighing in the rounds they draft. 120 is a judgment call with the
          same standing as the move thresholds, chosen rather than fitted, and
          will be revisited with history. It changes nothing outside that
          module: the comparison universe, the market table, gaps and signals
          are all unaffected.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Archetypes</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          The tag next to a player&rsquo;s name is a <strong>role label</strong>:
          it describes what kind of news moves that player, which is what
          connects it to the catalyst layer. A handcuff moves on starter
          injury news, a committee back on touch-split reporting. Labels are
          computed only from
          team, position and ADP, all already on every row, plus the current
          Sleeper injury designation and rookie flag. Display only: an
          archetype is never an input to any signal, ranking or selection.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li><strong>Injured</strong>: current Sleeper status is IR, Out, PUP, NFI, Doubtful, Suspended or COV. Day-to-day tags are ignored as too noisy. Checked before every role rule.</li>
          <li><strong>Lead back</strong>: the team&rsquo;s RB1 by ADP with the next back at least 30 picks behind.</li>
          <li><strong>Handcuff</strong>: the team&rsquo;s RB2 by ADP, at least 30 picks behind the RB1.</li>
          <li><strong>Committee</strong>: any back within 30 picks of the team&rsquo;s RB1, including the RB1 himself when the room is that tight.</li>
          <li><strong>Alpha receiver</strong>: ADP inside the first two rounds, or the team&rsquo;s WR1 by ADP with the WR2 at least 20 picks behind.</li>
          <li><strong>Promoted</strong>: the highest priced eligible room-mate below an Injured player, one per injured starter, so the label marks the next man in line rather than everyone below him. Checked after Injured and before the price-gap roles; an authored Injured override counts.</li>
          <li><strong>Rookie</strong>: first NFL season where no role label applies.</li>
          <li><strong>No label</strong>: quarterbacks and tight ends by design, free agents, and anyone no rule matches. No placeholder is shown.</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          <strong>The gap sizes are chosen, not fitted</strong>, the same
          status as the move thresholds: 30 picks separates a lead back and
          his handcuff from a committee, 20 picks makes a receiver room an
          alpha&rsquo;s, and a second-round price counts as an alpha price
          regardless of the room. They are judgment calls awaiting enough
          history to set honestly.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <strong>Authored overrides.</strong> A short curated list
          (data/archetype_overrides.json) corrects rooms the price gap alone
          misreads, a coach-stated committee priced like a lead back and his
          handcuff, or an injury the designation feed has not caught up to.
          Every override carries its reason, which renders in the label&rsquo;s
          tooltip, and an override can remove a label as well as set one.
        </p>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          <strong>Known gap.</strong> Injured fires on a player&rsquo;s
          <em> current</em> designation, not his injury history. A player two ACL
          tears into his career who is healthy today carries no tag, because
          nothing we store remembers the tears. Closing that needs an
          injury-history source the site does not have.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Limitations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            History begins {startLong ?? "at the first stored capture"}, the
            first capture of the current FantasyPros series. No chart or
            number implies data from before that date.
          </li>
          <li>
            The price reflects five league host boards, not all of fantasy
            football.
          </li>
          <li>
            News does not hit the price all at once. Drafters are spread across
            days, so someone drafting Thursday has heard Tuesday&rsquo;s news and
            someone who drafted Tuesday morning had not, and the five host
            boards refresh at different times, more than a day apart on some
            days. A reaction therefore keeps entering the ADP for
            days after the event, and a real repricing looks like a slope rather
            than a step. How many days that takes is not published by any host
            and has not yet been measured here; that measurement needs more
            stored days than exist.
          </li>
          <li>
            The catalyst lookback follows from that. A catalyst is matched to a
            move if it falls inside the {CATALYST_LOOKBACK_DAYS} days before the
            older snapshot or anywhere up to the newer one, not only inside the
            gap between the two snapshots, because an event older than the gap
            can still be the cause. The number {CATALYST_LOOKBACK_DAYS} is an
            assumption, stated as one: it is a prior for staggered drafting plus
            host publish lag plus whatever averaging the hosts do, and it is
            consistent with the one directional measurement on file (mover news
            fell a median 3 days before the window end in the August lookback
            test). Once enough history exists it will be replaced by a measured
            figure: how many days a verified catalyst takes to finish moving the
            price.
          </li>
          <li>
            ECR history is short, it begins with the first automated capture,
            so the expert line has fewer points than the market line until the
            two histories are the same length. The chart now reads every stored
            ECR snapshot, not just the most recent ones.
          </li>
          <li>
            Some players carry no expert rank in the ECR payload, or sit
            outside the comparable range, and show “–” for ECR rather than a
            guessed value.
          </li>
          <li>
            Signal evaluation summary (how often each label appeared and how
            it resolved) does not exist yet; it needs more stored history than
            currently exists.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Explanation evals</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          The AI explanation layer is gated behind this scorecard. Two
          hand-graded passes are recorded below, and no note is live: the
          usefulness check in the grading contract is not yet in force, so a
          note that only paraphrases its inputs cannot yet be failed for it.
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
