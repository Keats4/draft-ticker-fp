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

/* ---------- small presentational helpers (display only) ---------- */

function SectionHead({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="scroll-mt-16 text-xl font-semibold">
      {title}
    </h2>
  );
}

function Step({
  label,
  sub,
  tone = "mist",
}: {
  label: string;
  sub?: string;
  tone?: "mist" | "gold" | "navy" | "plain";
}) {
  const style =
    tone === "gold"
      ? { background: "var(--gold-bg)", borderColor: "var(--gold-border)" }
      : tone === "navy"
        ? { background: "var(--navy)", borderColor: "var(--navy)" }
        : tone === "plain"
          ? { background: "var(--surface)", borderColor: "var(--border)" }
          : { background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" };
  return (
    <div className="min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-center" style={style}>
      <p
        className="text-[11px] font-bold uppercase tracking-wide leading-tight"
        style={{ color: tone === "navy" ? "var(--surface)" : tone === "gold" ? "var(--gold-ink)" : "var(--text-info)" }}
      >
        {label}
      </p>
      {sub && (
        <p
          className="mt-0.5 text-[10px] leading-snug"
          style={{ color: tone === "navy" ? "rgba(255,255,255,0.75)" : "var(--ink-2)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <span aria-hidden className="self-center px-0.5 text-sm text-[var(--ink-3)]">
      <span className="hidden lg:inline">→</span>
      <span className="lg:hidden">↓</span>
    </span>
  );
}

/** Leaf of the decision tree: stored rule name + user-facing display label. */
function Leaf({ stored, display }: { stored: string; display: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span
        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ background: "var(--surface-info-strong)", color: "var(--text-info)" }}
      >
        {display}
      </span>
      <span className="text-[10px] text-[var(--ink-3)]">stored: “{stored}”</span>
    </span>
  );
}

function Branch({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-2)]">{title}</p>
      <div className="mt-1.5 space-y-1.5 text-xs text-[var(--ink-2)]">{children}</div>
    </div>
  );
}

function FunnelStep({ label, why }: { label: string; why: string }) {
  return (
    <li className="flex flex-col gap-x-4 gap-y-0.5 border-l-2 pl-3 sm:flex-row sm:items-baseline" style={{ borderColor: "var(--border-info-soft)" }}>
      <span className="w-56 shrink-0 text-sm font-semibold text-[var(--text-info)]">{label}</span>
      <span className="text-xs text-[var(--ink-2)]">{why}</span>
    </li>
  );
}

function LimitCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-2)]">{title}</p>
      <div className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">{children}</div>
    </div>
  );
}

const NAV = [
  ["overview", "Overview"],
  ["glance", "At a glance"],
  ["math", "Math"],
  ["signals", "Signals"],
  ["universe", "Universe"],
  ["sources", "Sources"],
  ["evidence", "Evidence"],
  ["archetypes", "Archetypes"],
  ["limitations", "Limitations"],
  ["evals", "AI evals"],
] as const;

export default async function Methodology() {
  // The only live data this page reads is the stored series' own endpoints,
  // so every date it states is derived rather than hardcoded and cannot go
  // stale when the history grows or restarts. Blob unavailable degrades to
  // wording without a date, never to a wrong one.
  const { first, latest } = await loadFirstAndLatestSnapshots();
  const seriesStart = first?.date ?? latest?.date ?? null;
  const startLong = seriesStart ? fmtLongDate(seriesStart) : null;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 id="overview" className="scroll-mt-16 text-3xl font-bold tracking-tight">Methodology</h1>
      <p className="mt-2 text-[var(--ink-2)]">
        Every number on the data pages (Market, Players, player pages,
        and this one) traces to a named source, a capture time, and a
        calculation defined on this page. Where one day of data cannot support a
        claim, the site says so instead of implying history. Two pages are
        excluded by design and badged as such: the Market Price Index and
        Inside FP are concept previews whose figures are illustrative, not
        measured.
      </p>

      {/* On this page: slim sticky anchor rail */}
      <nav
        aria-label="On this page"
        className="sticky top-0 z-10 -mx-4 mt-4 overflow-x-auto border-b border-[var(--border)] bg-[var(--background)] px-4 py-2"
      >
        <div className="flex min-w-max items-center gap-1">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-info-soft)] hover:text-[var(--text-info)]"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

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

      {/* ================= METHOD AT A GLANCE ================= */}
      <section className="mt-8">
        <SectionHead id="glance" title="Method at a glance" />
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Step label="FantasyPros ADP" sub="up to 5 host boards · daily composite" tone="plain" />
              <Step label="FantasyPros ECR" sub="Draft PPR rankings · official API" tone="plain" />
            </div>
            <Arrow />
            <Step label="Daily snapshots" sub="6:00 AM PT · immutable dated captures" />
            <Arrow />
            <Step label="Calculations" sub="ADP move · ECR move · ADP − ECR gap" />
            <Arrow />
            <Step label="Deterministic signal rules" sub="thresholds + fixed branch order" tone="navy" />
            <Arrow />
            <Step label="Evidence" sub="documented events near the move, or unexplained" tone="gold" />
            <Arrow />
            <Step label="Calendar context" sub="fantasy-year phase · movement trust" />
            <Arrow />
            <Step label="Interpretation" sub="what renders on every surface" tone="plain" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--ink-2)]">
            <span className="font-semibold uppercase tracking-wide text-[var(--text-info)]">
              Deterministic product logic
            </span>
            <span>— everything above. The AI explanation layer is a separate, optional downstream branch:</span>
            <span
              className="rounded-full border border-dashed px-2 py-0.5"
              style={{ borderColor: "var(--border-info-soft)", color: "var(--ink-2)" }}
            >
              AI notes · gated behind the eval scorecard · 0 live
            </span>
            <span>It never assigns a signal.</span>
          </div>
        </div>
      </section>

      {/* ================= CORE MATH ================= */}
      <section className="mt-8">
        <SectionHead id="math" title="Core math" />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-2)]">Gap</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--text-info)]">ADP − ECR</p>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              Positive: drafted later than experts rank him — a discount to the
              expert rank. Negative: the market pays a premium.
            </p>
            <p
              className="mt-2 rounded-md border px-2 py-1.5 text-xs tabular-nums"
              style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}
            >
              <span className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Illustrative</span>
              <br />
              ADP 92 · ECR 86 → Gap +6{" "}
              <span className="val-pill val-pill--pos">discount</span>
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-2)]">Movement</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--text-info)]">start ADP − end ADP</p>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              Positive = rising = drafted earlier now = more valuable. The sign
              convention is deliberate: up always means more valuable.
            </p>
            <p
              className="mt-2 rounded-md border px-2 py-1.5 text-xs tabular-nums"
              style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}
            >
              <span className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Illustrative</span>
              <br />
              99 → 92 = <span className="font-semibold" style={{ color: "var(--navy)" }}>↑ 7</span>{" "}
              drafted 7 spots earlier
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-2)]">Published bars</p>
            <p className="mt-1 text-xs tabular-nums text-[var(--ink-2)]">
              ADP move counts at <span className="font-bold text-[var(--text-info)]">≥ {THRESHOLDS.HOST_RANK_MOVE} picks</span>
              <br />
              ECR move counts at <span className="font-bold text-[var(--text-info)]">≥ {THRESHOLDS.ECR_MOVE} ranks</span>
              <br />
              Gap is notable at <span className="font-bold text-[var(--text-info)]">|Gap| ≥ {THRESHOLDS.GAP_NOTABLE}</span>
            </p>
            <p
              className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)", color: "var(--gold-ink)" }}
            >
              Initial judgment calls · not historically fitted
            </p>
          </div>
        </div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--ink-2)]">
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
            for the averaging reasons stated under “Sources” below. Missing
            data renders as “–”, never as zero.
          </li>
          <li>
            <strong>Signal labels</strong> are rules, not a model:
            market-vs-expert movement compared over the same window. A label
            appears only when both movement series exist.
          </li>
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-3)]">
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

      {/* ================= SIGNAL DECISION TREE ================= */}
      <section className="mt-8">
        <SectionHead id="signals" title="How a signal is assigned" />
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Fixed branch order. First match wins. Rules, not a model. Each leaf
          shows the user-facing display label first and the stored rule name
          beneath it; display labels never alter the stored semantics.
        </p>
        <div className="mt-3 space-y-2">
          <Branch title="Step 0 · Do ADP and ECR movement both exist?">
            <p>
              <span className="font-semibold">No</span> (day one, or an
              unmatched expert rank) → no label. The site renders{" "}
              <span className="font-semibold tabular-nums">“–”</span>, never a
              guess.
            </p>
          </Branch>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Branch title={`Neither cleared its bar (ADP < ${THRESHOLDS.HOST_RANK_MOVE}, ECR < ${THRESHOLDS.ECR_MOVE})`}>
              <Leaf stored="Both holding" display="Stable" />
            </Branch>
            <Branch title="ECR alone cleared its bar">
              <Leaf stored="Experts moving first" display="Experts leading" />
            </Branch>
            <Branch title="ADP alone cleared its bar">
              <p>Did the move shrink |Gap|?</p>
              <p className="pl-3">
                Yes → <Leaf stored="Market catching up to experts" display="Market converging" />
              </p>
              <p className="pl-3">
                No → <Leaf stored="Market moving faster" display="Market leading" />
              </p>
            </Branch>
            <Branch title="Both cleared their bars">
              <p>Same direction?</p>
              <p className="pl-3">
                Yes, |ADP move| ≥ 1.5 × |ECR move| →{" "}
                <Leaf stored="Market moving faster" display="Market leading" />
              </p>
              <p className="pl-3">
                Yes, under 1.5× → <Leaf stored="Broad agreement" display="Aligned move" />
              </p>
              <p className="pl-3">
                Opposite, |Gap| grew → <Leaf stored="Market and experts diverging" display="Diverging" />
              </p>
              <p className="pl-3">
                Opposite, |Gap| shrank → <Leaf stored="Market and experts converging" display="Converging" />
              </p>
            </Branch>
          </div>
        </div>
        <details className="mt-3">
          <summary className="disclose">Exact branch definitions</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--ink-2)]">
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
        </details>
      </section>

      {/* ================= COMPARISON UNIVERSE ================= */}
      <section className="mt-8">
        <SectionHead id="universe" title="Who enters the comparison" />
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          A gap (ADP − ECR) is only meaningful when both sources genuinely
          cover the player. Outside a comparable band, ADP is thin (drafted in
          few leagues) or ECR is in the noisy tail (experts effectively do not
          rank him), and subtracting the two produces giant, misleading gaps.
        </p>
        <ol className="mt-3 space-y-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <FunnelStep label="All source players" why="Everything the FantasyPros payloads carry." />
          <FunnelStep label="QB · RB · WR · TE only" why="Kickers and team defenses are dropped before ranking; they receive no rank, gap, signal or page." />
          <FunnelStep label="Top 200 by ADP" why="A chosen cutoff, stated as one — the same standing as the move thresholds until history shows where comparability degrades." />
          <FunnelStep label="Ranked by ≥ 4 of 5 host boards" why="The liquidity rule: prevents one thin host board from defining the price." />
          <FunnelStep label="ECR inside the top 200" why="Avoids subtracting meaningful ADP from noisy expert-tail ranks; beyond it, no gap is computed rather than a fabricated one." />
          <FunnelStep label="Comparable player" why="Gap and signal eligible. Everyone else shows “–” with the reason." />
        </ol>
        <details className="mt-3">
          <summary className="disclose">Universe details</summary>
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
            One display module states its bound explicitly. &ldquo;For your
            draft&rdquo; picks its three players from the top 200 by ADP, the
            same top-200 bound as the comparison universe, then ranks by gap as
            everywhere else. 200 is a judgment call with the same standing as
            the move thresholds, chosen rather than fitted, and will be
            revisited with history. It changes nothing outside that module: the
            comparison universe, the market table, gaps and signals are all
            unaffected.
          </p>
        </details>
      </section>

      {/* ================= SOURCES ================= */}
      <section className="mt-8">
        <SectionHead id="sources" title="Data & provenance" />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--gold-ink)" }}>ADP · the price</p>
            <ul className="mt-1 space-y-0.5 text-xs text-[var(--ink-2)]">
              <li>FantasyPros consensus PPR composite</li>
              <li>up to 5 host boards</li>
              <li>captured 6:00 AM PT daily</li>
              <li>immutable dated snapshots + raw payload</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--gold-ink)" }}>ECR · the experts</p>
            <ul className="mt-1 space-y-0.5 text-xs text-[var(--ink-2)]">
              <li>FantasyPros Draft PPR rankings</li>
              <li>official API (limited public tier)</li>
              <li>captured 6:00 AM PT, same job</li>
              <li>own dated snapshot, date always shown</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--gold-ink)" }}>Identity</p>
            <ul className="mt-1 space-y-0.5 text-xs text-[var(--ink-2)]">
              <li>shared FantasyPros player_id — no join needed</li>
              <li>reviewed FantasyPros → Sleeper mapping</li>
              <li>unmapped rows render without extras, never a guessed match</li>
            </ul>
          </div>
        </div>

        {/* why common-board movement exists */}
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-2)]">
            Why movement uses only common boards
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border p-2 text-center text-xs" style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-3)]">Day A</p>
              <p className="mt-1 tabular-nums text-[var(--ink-2)]">
                Board <span className="font-semibold text-[var(--text-info)]">A · B · C</span> · D
              </p>
            </div>
            <div className="rounded-md border p-2 text-center text-xs" style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-3)]">Day B</p>
              <p className="mt-1 tabular-nums text-[var(--ink-2)]">
                Board <span className="font-semibold text-[var(--text-info)]">A · B · C</span> · E
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--ink-2)]">
            Movement is computed over{" "}
            <span className="font-semibold text-[var(--text-info)]">A + B + C only</span> — never the
            changing full composite. Movement compares only boards present on
            both dates so host entry/exit is not mistaken for repricing.
          </p>
        </div>

        <details className="mt-3">
          <summary className="disclose">Source details</summary>
          <div className="mt-3 space-y-2 text-sm text-[var(--ink-2)]">
            <p>
              ADP on this site is FantasyPros&rsquo; consensus average host rank
              for PPR: the mean of a player&rsquo;s rank across up to five league
              host boards, taken from the official API, which exposes each
              contributing board&rsquo;s rank and publish time. It is an average
              rank, not a literal draft slot.
            </p>
            <p>
              That composite is a specific population, not the whole market. Only
              two of the five boards are identifiable, RTSports and Sleeper; the
              other three are unnamed by the API. Coverage varies by scoring
              format, five boards for PPR, three for half-PPR, two for standard,
              and one host publishes roughly 25 hours behind the others in every
              format, so part of the average always lags the news.
            </p>
            <p>
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
            <p>
              Each ADP day is stored as an immutable dated snapshot alongside the
              raw payload exactly as received, so the typed series can always be
              rebuilt from source. Series begins with its first stored capture
              {startLong ? `, ${startLong}` : ""}. If no stored ECR snapshot can
              be read, the page falls back to the static Aug 10, 2026 capture
              and labels it as such.
            </p>
            <p>
              Player identity: price and expert rank share the FantasyPros
              player_id, so the two series need no join at all. A reviewed
              mapping table (FantasyPros id → Sleeper id) links players to
              catalysts, archetype inputs and page URLs; a row it does not cover
              simply renders without those extras, never a guessed match.
            </p>
          </div>
        </details>
      </section>

      {/* ================= EVIDENCE & TIMING ================= */}
      <section className="mt-8">
        <SectionHead id="evidence" title="Evidence & timing" />
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex flex-col items-stretch gap-1 text-center text-[11px] sm:flex-row">
            <div className="flex-1 rounded-md border px-2 py-2" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
              <p className="font-bold uppercase tracking-wide" style={{ color: "var(--gold-ink)" }}>◆ Event</p>
              <p className="mt-0.5 text-[var(--ink-2)]">may precede the window</p>
            </div>
            <Arrow />
            <div className="flex-1 rounded-md border border-dashed px-2 py-2" style={{ borderColor: "var(--gold-border)", color: "var(--ink-2)" }}>
              <p className="font-bold uppercase tracking-wide" style={{ color: "var(--gold-ink)" }}>
                {CATALYST_LOOKBACK_DAYS}-day lookback
              </p>
              <p className="mt-0.5">before the older snapshot</p>
            </div>
            <Arrow />
            <div className="flex-[2] rounded-md border px-2 py-2" style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}>
              <p className="font-bold uppercase tracking-wide text-[var(--text-info)]">
                older snapshot ══ shared movement window ══ newer snapshot
              </p>
              <p className="mt-0.5 text-[var(--ink-2)]">
                a catalyst anywhere in lookback + window can back the move
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--ink-2)]">
            <span
              className="mr-1.5 rounded-full border px-2 py-0.5 font-bold uppercase tracking-wide"
              style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)", color: "var(--gold-ink)" }}
            >
              {CATALYST_LOOKBACK_DAYS} days = current assumption
            </span>
            not measured final truth — drafts occur over several days and host
            boards publish asynchronously, so the composite reacts gradually.
          </p>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          A catalyst is matched to a
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
        </p>
      </section>

      {/* ================= ARCHETYPES ================= */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <SectionHead id="archetypes" title="Player archetypes" />
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: "var(--surface-info-strong)", borderColor: "var(--border-info-soft)", color: "var(--text-info)" }}
          >
            Display only
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          The tag next to a player&rsquo;s name is a <strong>role label</strong>:
          it describes what kind of news moves that player, which is what
          connects it to the catalyst layer. A handcuff moves on starter
          injury news, a committee back on touch-split reporting. Labels are
          computed only from
          team, position and ADP, all already on every row, plus the current
          Sleeper injury designation and rookie flag. Archetypes never
          determine signals, rankings, or selection.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Injured", "current severe designation (IR, Out, PUP, NFI, Doubtful, Suspended, COV)"],
            ["Lead back", "team's RB1 with the next back ≥ 30 picks behind"],
            ["Handcuff", "team's RB2, ≥ 30 picks behind the RB1"],
            ["Committee", "any back within 30 picks of the team's RB1"],
            ["Alpha receiver", "first-two-round price, or WR1 ≥ 20 ahead of WR2"],
            ["Promoted", "highest-priced eligible teammate below an Injured player"],
            ["Rookie", "first NFL season when no stronger role applies"],
            ["No label", "QBs and TEs by design; free agents; no rule matched"],
          ].map(([t, d]) => (
            <div
              key={t}
              className="rounded-lg border p-2.5"
              style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
            >
              <p className="text-xs font-semibold">{t}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-2)]">{d}</p>
            </div>
          ))}
        </div>
        <details className="mt-3">
          <summary className="disclose">Archetype details</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--ink-2)]">
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
        </details>
      </section>

      {/* ================= LIMITATIONS ================= */}
      <section className="mt-8">
        <SectionHead id="limitations" title="Known limitations" />
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <LimitCard title="Short history">
            History begins {startLong ?? "at the first stored capture"}, the
            first capture of the current FantasyPros series. No chart or
            number implies data from before that date.
          </LimitCard>
          <LimitCard title="Partial market">
            The price reflects five league host boards, not all of fantasy
            football.
          </LimitCard>
          <LimitCard title="Staggered reaction">
            News enters the ADP over several days — a real repricing looks
            like a slope rather than a step. How many days that takes has not
            yet been measured here.
          </LimitCard>
          <LimitCard title="Short ECR history">
            The expert line has fewer points than the market line until the
            two histories are the same length.
          </LimitCard>
          <LimitCard title="Missing ECR">
            Some players carry no expert rank, or sit outside the comparable
            range, and show “–” rather than a guessed value.
          </LimitCard>
          <LimitCard title="No signal outcome history yet">
            How often each label appeared and how it resolved does not exist
            yet; it needs more stored history than currently exists.
          </LimitCard>
        </div>
        <details className="mt-3">
          <summary className="disclose">Limitation details</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--ink-2)]">
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
        </details>
      </section>

      {/* ================= AI EVALS ================= */}
      <section className="mt-8">
        <SectionHead id="evals" title="AI explanation evals" />
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

      {/* ================= DEEP REFERENCE ================= */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Deep technical reference</h2>
        <details className="mt-3">
          <summary className="disclose">Positional ranks</summary>
          <p className="mt-3 text-sm text-[var(--ink-2)]">
            Positional ranks here (TE13, WR24) are computed from FantasyPros&rsquo;
            overall ECR across the tracked players who hold an ECR, so they can
            differ by a place or two from the positional ranks published on their
            site. A player they rank whom the pipeline does not cover shifts
            every rank below him. Price-side positional rank comes from the ADP
            payload&rsquo;s own pos_rank field; kickers and team defenses are
            excluded from the pipeline before ranking, so their removal does not
            distort the skill position ranks.
          </p>
        </details>
      </section>

      <p className="mt-10 text-xs text-[var(--ink-3)]">
        Decision records for the storage and catalyst approaches live in the
        repository under /decisions.{" "}
        <Link href="/" className="underline">Back to the Market</Link>
      </p>
    </main>
  );
}
