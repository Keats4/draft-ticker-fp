import Link from "next/link";
import EvalScorecard from "@/components/EvalScorecard";
import SignalChip from "@/components/SignalChip";
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

const REPO = "https://github.com/Keats4/draft-ticker-fp";

/* ---------- design primitives (display only) ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
      {children}
    </p>
  );
}

function SectionHead({ id, title, badge }: { id: string; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <h2 id={id} className="scroll-mt-14 text-xl font-semibold">
        {title}
      </h2>
      {badge}
    </div>
  );
}

/** Compact diagram node: sentence-case semibold title, muted meta. */
function Node({
  title,
  meta,
  tone = "plain",
  dashed = false,
}: {
  title: string;
  meta?: string;
  tone?: "plain" | "mist" | "navy" | "gold";
  dashed?: boolean;
}) {
  const style =
    tone === "navy"
      ? { background: "var(--navy)", borderColor: "var(--navy)" }
      : tone === "gold"
        ? { background: "var(--gold-bg)", borderColor: "var(--gold-border)" }
        : tone === "mist"
          ? { background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }
          : { background: "var(--surface)", borderColor: "var(--border-info-soft)" };
  return (
    <div
      className={`rounded-lg border px-3 py-1.5 text-center ${dashed ? "border-dashed" : ""}`}
      style={style}
    >
      <p
        className="text-[13px] font-semibold leading-tight"
        style={{ color: tone === "navy" ? "var(--surface)" : "var(--foreground)" }}
      >
        {title}
      </p>
      {meta && (
        <p
          className="mt-0.5 text-[11px] leading-tight"
          style={{ color: tone === "navy" ? "rgba(255,255,255,0.72)" : "var(--ink-3)" }}
        >
          {meta}
        </p>
      )}
    </div>
  );
}

/** Vertical connector stub. */
function Stub() {
  return <span aria-hidden className="mx-auto block h-2.5 w-px" style={{ background: "var(--border-info-soft)" }} />;
}

/** T-splitter / merger across a pair row. */
function TBar({ flip = false }: { flip?: boolean }) {
  return (
    <div aria-hidden className="relative mx-auto h-2.5 w-1/2">
      <span className={`absolute left-1/2 h-2.5 w-px -translate-x-1/2 ${flip ? "bottom-0" : "top-0"}`} style={{ background: "var(--border-info-soft)" }} />
      <span className={`absolute left-0 right-0 h-px ${flip ? "top-0" : "bottom-0"}`} style={{ background: "var(--border-info-soft)" }} />
      <span className={`absolute left-0 h-2.5 w-px ${flip ? "top-0" : "bottom-0"}`} style={{ background: "var(--border-info-soft)" }} />
      <span className={`absolute right-0 h-2.5 w-px ${flip ? "top-0" : "bottom-0"}`} style={{ background: "var(--border-info-soft)" }} />
    </div>
  );
}

/** Board membership chip for the common-board diagram. */
function Board({ id, shared }: { id: string; shared: boolean }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold"
      style={
        shared
          ? { background: "var(--surface-info-strong)", borderColor: "var(--border-info-soft)", color: "var(--text-info)" }
          : { background: "var(--surface)", borderColor: "var(--border)", color: "var(--ink-3)" }
      }
    >
      {id}
    </span>
  );
}

function RefRow({
  n,
  title,
  desc,
  href,
  linkLabel,
}: {
  n: string;
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-baseline gap-3 border-t border-[var(--border)] py-2.5">
      <span className="w-6 shrink-0 text-[11px] tabular-nums text-[var(--ink-3)]">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-tight">{title}</p>
        <p className="text-[11px] text-[var(--ink-3)]">{desc}</p>
      </div>
      <a href={href} className="shrink-0 text-[11px] font-medium text-[var(--accent)] hover:underline">
        {linkLabel} →
      </a>
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
  ["reference", "Reference"],
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
      <h1 id="overview" className="scroll-mt-14 text-3xl font-bold tracking-tight">Methodology</h1>
      <p className="mt-3 max-w-[720px] text-[var(--ink-2)]">
        Every number on the data pages (Market, Players, player pages,
        and this one) traces to a named source, a capture time, and a
        calculation defined on this page. Where one day of data cannot support a
        claim, the site says so instead of implying history. Two pages are
        excluded by design and badged as such: the Market Price Index and
        Inside FP are concept previews whose figures are illustrative, not
        measured.
      </p>

      {/* compact sticky document rail */}
      <nav
        aria-label="On this page"
        className="sticky top-0 z-10 -mx-4 mt-6 overflow-x-auto border-b border-[var(--border)] bg-[var(--background)] px-4"
      >
        <div className="flex h-10 min-w-max items-center gap-4">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-[13px] text-[var(--ink-2)] transition-colors hover:text-[var(--navy)]"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section className="mt-8 max-w-[720px]">
        <h2 className="text-xl font-semibold">What this adds</h2>
        <p className="mt-1.5 text-sm text-[var(--ink-2)]">
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
      <section className="mt-12">
        <SectionHead id="glance" title="Method at a glance" />
        <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-5">
          <div className="mx-auto max-w-[620px]">
            {/* sources */}
            <Eyebrow>Sources</Eyebrow>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <Node title="FantasyPros ADP" meta="5 host boards · PPR composite" />
              <Node title="FantasyPros ECR" meta="Draft PPR · official API" />
            </div>
            <TBar flip />
            {/* spine */}
            <div className="mx-auto max-w-[340px]">
              <Node title="Daily capture" meta="6:00 AM PT · immutable snapshots" tone="mist" />
              <Stub />
              <Node title="Calculations" meta="ADP move · ECR move · ADP − ECR gap" tone="mist" />
              <Stub />
              <Node title="Deterministic signal rules" meta="thresholds · fixed branch order" tone="navy" />
            </div>
            <TBar />
            {/* context */}
            <div className="grid grid-cols-2 gap-2">
              <Node title="Evidence" meta="documented events near the move, or unexplained" tone="gold" />
              <Node title="Calendar context" meta="fantasy-year phase · movement trust" tone="mist" />
            </div>
            <TBar flip />
            <div className="relative mx-auto max-w-[340px]">
              <Node title="Interpretation" meta="what renders on every surface" />
              {/* quiet AI branch, downstream of the deterministic output */}
              <span
                aria-hidden
                className="absolute left-full top-1/2 hidden w-6 -translate-y-1/2 border-t border-dashed lg:block"
                style={{ borderColor: "var(--border-info-soft)" }}
              />
            </div>
            <div className="mt-2 lg:absolute lg:hidden" />
          </div>
          <div className="mt-3 flex justify-center lg:mt-2 lg:justify-end">
            <div className="max-w-[240px]">
              <Node title="AI notes" meta="gated behind the eval scorecard · 0 live · never assigns a signal" dashed />
            </div>
          </div>
          <p className="mt-3 border-t border-[var(--border)] pt-2 text-center text-[11px] text-[var(--ink-3)]">
            Everything solid is deterministic product logic. The AI explanation
            layer is a separate, optional branch after the product output.
          </p>
        </div>
      </section>

      {/* ================= CORE MATH ================= */}
      <section className="mt-16">
        <SectionHead id="math" title="Core math" />
        <div className="mt-5 grid grid-cols-1 divide-y divide-[var(--border-info-soft)] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex flex-col p-4">
            <Eyebrow>Gap</Eyebrow>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--navy)]">ADP − ECR</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-2)]">
              Positive: drafted later than experts rank him — a discount to the
              expert rank. Negative: the market pays a premium.
            </p>
            <p className="mt-auto pt-3 text-xs tabular-nums text-[var(--ink-2)]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">Illustrative · </span>
              ADP 92 · ECR 86 → +6 <span className="val-pill val-pill--pos">discount</span>
            </p>
          </div>
          <div className="flex flex-col p-4">
            <Eyebrow>Movement</Eyebrow>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--navy)]">start − end</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-2)]">
              Window-start ADP minus window-end ADP. Positive = rising = drafted
              earlier now = more valuable. Up always means more valuable.
            </p>
            <p className="mt-auto pt-3 text-xs tabular-nums text-[var(--ink-2)]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">Illustrative · </span>
              99 → 92 = <span className="font-semibold" style={{ color: "var(--navy)" }}>↑ 7</span> drafted earlier
            </p>
          </div>
          <div className="flex flex-col p-4">
            <Eyebrow>Published bars</Eyebrow>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--navy)]">
              ≥{THRESHOLDS.HOST_RANK_MOVE} · ≥{THRESHOLDS.ECR_MOVE} · ≥{THRESHOLDS.GAP_NOTABLE}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-2)]">
              ADP move counts at ≥ {THRESHOLDS.HOST_RANK_MOVE} picks, ECR move at ≥ {THRESHOLDS.ECR_MOVE} ranks,
              a gap is notable at |Gap| ≥ {THRESHOLDS.GAP_NOTABLE}.
            </p>
            <p className="mt-auto pt-3">
              <span
                className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)", color: "var(--gold-ink)" }}
              >
                Initial judgment calls · not fitted
              </span>
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-[720px] text-sm text-[var(--ink-3)]">
          Published bars are initial judgment calls, not historically fitted.
          Early directional reads are recorded as history accumulates.
        </p>
        <div className="mt-2 flex max-w-[720px] flex-wrap gap-2">
          <details>
            <summary className="disclose">Calculation details</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--ink-2)]">
              <li>
                <strong>Gap</strong> = ADP − ECR. Positive: the market drafts the
                player later than experts rank him, a discount to the expert rank.
                Negative: the market pays a premium relative to the expert view.
              </li>
              <li>
                <strong>Movement</strong> = window-start ADP − window-end ADP, so
                positive means rising (drafted earlier now). Primary movement
                figures use the latest seven calendar dates once seven days of
                shared history exist; before then, they use all available shared
                history. Movement is computed between the earliest and latest
                valid shared snapshots in that window and only across host
                boards present on both endpoint dates, for the averaging reasons
                stated under “Sources” below. Missing capture days are never
                fabricated or interpolated; if a day is absent, the window
                simply starts at the earliest real date inside it. The
                seven-day span is a product window choice, not a historically
                calibrated constant, and it is separate from the seven-day
                catalyst lookback under “Catalyst window details”. Missing
                data renders as “–”, never as zero.
              </li>
              <li>
                <strong>Signal labels</strong> are rules, not a model:
                market-vs-expert movement compared over the same window. A label
                appears only when both movement series exist.
              </li>
            </ul>
          </details>
          <details>
            <summary className="disclose">Threshold calibration</summary>
            <p className="mt-3 text-sm text-[var(--ink-2)]">
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
          </details>
        </div>
      </section>

      {/* ================= SIGNAL DECISION TREE ================= */}
      <section className="mt-16">
        <SectionHead id="signals" title="How a signal is assigned" />
        <p className="mt-2 max-w-[720px] text-sm text-[var(--ink-2)]">
          Fixed branch order. First match wins. Rules, not a model.
        </p>
        <p className="mt-2 max-w-[720px] text-xs text-[var(--ink-2)]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
            Both series required
          </span>{" "}
          — if ADP or ECR movement is missing, Draft Ticker renders{" "}
          <span className="font-semibold tabular-nums text-[var(--foreground)]">“–”</span>,
          never a guessed signal.
        </p>
        <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
          <p className="border-b border-[var(--border-info-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
            Which side cleared its bar? <span className="font-normal normal-case tracking-normal text-[var(--ink-3)]">(ADP ≥ {THRESHOLDS.HOST_RANK_MOVE} picks · ECR ≥ {THRESHOLDS.ECR_MOVE} ranks)</span>
          </p>
          <div className="grid grid-cols-1 divide-y divide-[var(--border-info-soft)] md:grid-cols-[1fr_1fr_1.1fr_1.4fr] md:divide-x md:divide-y-0">
            <div className="p-4">
              <Eyebrow>Neither</Eyebrow>
              <div className="mt-2.5"><SignalChip signal="Both holding" /></div>
              <p className="mt-1 text-[10px] text-[var(--ink-3)]">Both holding</p>
            </div>
            <div className="p-4">
              <Eyebrow>ECR only</Eyebrow>
              <div className="mt-2.5"><SignalChip signal="Experts moving first" /></div>
              <p className="mt-1 text-[10px] text-[var(--ink-3)]">Experts moving first</p>
            </div>
            <div className="p-4">
              <Eyebrow>ADP only</Eyebrow>
              <div className="mt-2.5 space-y-2.5 text-[11px] text-[var(--ink-2)]">
                <div>
                  <p>gap shrank →</p>
                  <div className="mt-1"><SignalChip signal="Market catching up to experts" /></div>
                  <p className="mt-1 text-[10px] text-[var(--ink-3)]">Market catching up to experts</p>
                </div>
                <div>
                  <p>gap widened →</p>
                  <div className="mt-1"><SignalChip signal="Market moving faster" /></div>
                  <p className="mt-1 text-[10px] text-[var(--ink-3)]">Market moving faster</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <Eyebrow>Both</Eyebrow>
              <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-2.5 text-[11px] text-[var(--ink-2)] sm:grid-cols-2">
                <div>
                  <p>same direction · ≥ 1.5× →</p>
                  <div className="mt-1"><SignalChip signal="Market moving faster" /></div>
                  <p className="mt-1 text-[10px] text-[var(--ink-3)]">Market moving faster</p>
                </div>
                <div>
                  <p>same direction · under 1.5× →</p>
                  <div className="mt-1"><SignalChip signal="Broad agreement" /></div>
                  <p className="mt-1 text-[10px] text-[var(--ink-3)]">Broad agreement</p>
                </div>
                <div>
                  <p>opposite · |Gap| grew →</p>
                  <div className="mt-1"><SignalChip signal="Market and experts diverging" /></div>
                  <p className="mt-1 text-[10px] text-[var(--ink-3)]">Market and experts diverging</p>
                </div>
                <div>
                  <p>opposite · |Gap| shrank →</p>
                  <div className="mt-1"><SignalChip signal="Market and experts converging" /></div>
                  <p className="mt-1 text-[10px] text-[var(--ink-3)]">Market and experts converging</p>
                </div>
              </div>
            </div>
          </div>
          <p className="border-t border-[var(--border-info-soft)] px-4 py-2 text-[10px] text-[var(--ink-3)]">
            Pills are the product’s display labels — tap one for its exact rule.
            The small line beneath each is the stored rule string.
          </p>
        </div>
        <details className="mt-4 max-w-[720px]">
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
      <section className="mt-16">
        <SectionHead id="universe" title="Who enters the comparison" />
        <p className="mt-3 max-w-[720px] text-sm text-[var(--ink-2)]">
          A gap (ADP − ECR) is only meaningful when both sources genuinely
          cover the player. Outside a comparable band, ADP is thin (drafted in
          few leagues) or ECR is in the noisy tail (experts effectively do not
          rank him), and subtracting the two produces giant, misleading gaps.
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <p className="text-center text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
            All source players
          </p>
          {[
            ["01", "QB · RB · WR · TE only", "kickers and team defenses dropped before ranking"],
            ["02", "Top 200 by ADP", "a chosen cutoff, stated as one"],
            ["03", "≥ 4 of 5 host boards", "liquidity rule — one thin board never defines the price"],
            ["04", "ECR inside the top 200", "no gap against noisy expert-tail ranks"],
          ].map(([n, label, why]) => (
            <div key={n}>
              <span aria-hidden className="mx-auto my-1.5 block h-2.5 w-px" style={{ background: "var(--border-info-soft)" }} />
              <div
                className="rounded-lg border px-3 py-2 text-center"
                style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}
              >
                <p className="text-[13px] font-semibold">
                  <span className="mr-2 text-[10px] tabular-nums text-[var(--ink-3)]">{n}</span>
                  {label}
                </p>
                <p className="text-[11px] text-[var(--ink-3)]">{why}</p>
              </div>
            </div>
          ))}
          <span aria-hidden className="mx-auto my-1.5 block h-2.5 w-px" style={{ background: "var(--border-info-soft)" }} />
          <div className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: "var(--navy)" }}>
            <p className="text-[13px] font-semibold text-[var(--navy)]">Comparable player</p>
            <p className="text-[11px] text-[var(--ink-3)]">
              gap and signal eligible; everyone else shows “–” with the reason
            </p>
          </div>
        </div>
        <details className="mt-4 max-w-[720px]">
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
      <section className="mt-16">
        <SectionHead id="sources" title="Data & provenance" />
        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 border-y border-[var(--border)] py-4 md:grid-cols-3">
          {[
            ["ADP · the price", ["FantasyPros consensus PPR composite", "up to 5 host boards", "captured 6:00 AM PT daily", "immutable dated snapshots + raw payload"]],
            ["ECR · the experts", ["FantasyPros Draft PPR rankings", "official API (limited public tier)", "captured 6:00 AM PT, same job", "own dated snapshot, date always shown"]],
            ["Identity", ["shared FantasyPros player_id — no join needed", "reviewed FantasyPros → Sleeper mapping", "unmapped rows render without extras, never a guessed match"]],
          ].map(([title, lines]) => (
            <div key={title as string}>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--navy)" }} />
                {title}
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-[var(--ink-2)]">
                {(lines as string[]).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* common-board membership */}
        <div className="mx-auto mt-8 max-w-md text-center">
          <Eyebrow>Why movement uses only common boards</Eyebrow>
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-center gap-3">
              <span className="w-12 text-right text-[11px] text-[var(--ink-3)]">Day A</span>
              <span className="flex gap-1.5">
                <Board id="A" shared /> <Board id="B" shared /> <Board id="C" shared /> <Board id="D" shared={false} />
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="w-12 text-right text-[11px] text-[var(--ink-3)]">Day B</span>
              <span className="flex gap-1.5">
                <Board id="A" shared /> <Board id="B" shared /> <Board id="C" shared /> <Board id="E" shared={false} />
              </span>
            </div>
          </div>
          <p className="mt-3 text-[13px] font-semibold text-[var(--text-info)]">
            Movement uses A + B + C only
          </p>
          <p className="mx-auto mt-1 max-w-[380px] text-[11px] text-[var(--ink-3)]">
            Movement compares only boards present on both dates so host
            entry/exit is not mistaken for repricing.
          </p>
        </div>

        <details className="mt-6 max-w-[720px]">
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
      <section className="mt-16">
        <SectionHead id="evidence" title="Evidence & timing" />
        <div className="mx-auto mt-8 max-w-2xl px-2">
          {/* timeline */}
          <div className="relative h-16">
            {/* baseline segments */}
            <span aria-hidden className="absolute left-0 top-8 w-[8%] border-t" style={{ borderColor: "var(--border)" }} />
            <span aria-hidden className="absolute left-[8%] top-8 w-[26%] border-t border-dashed" style={{ borderColor: "var(--gold)" }} />
            <span aria-hidden className="absolute left-[34%] right-0 top-8 h-0.5" style={{ background: "var(--navy)" }} />
            {/* event marker */}
            <span aria-hidden className="absolute left-[8%] top-8 -translate-x-1/2 -translate-y-1/2 text-[13px]" style={{ color: "var(--gold)" }}>◆</span>
            <p className="absolute left-[8%] top-1 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--gold-ink)" }}>
              Event
            </p>
            {/* ticks */}
            {["34%", "100%"].map((l) => (
              <span key={l} aria-hidden className="absolute top-6 h-4 w-px" style={{ left: l, background: "var(--ink-3)" }} />
            ))}
            {/* span labels */}
            <p className="absolute left-[21%] top-10 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-wider" style={{ color: "var(--gold-ink)" }}>
              {CATALYST_LOOKBACK_DAYS}-day lookback
            </p>
            <p className="absolute left-[67%] top-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-[var(--text-info)]">
              shared movement window
            </p>
            <p className="absolute left-[34%] top-10 -translate-x-1/2 whitespace-nowrap text-[10px] text-[var(--ink-3)]">
              older snapshot
            </p>
            <p className="absolute right-0 top-10 whitespace-nowrap text-[10px] text-[var(--ink-3)]">
              newer snapshot
            </p>
          </div>
          <p className="mt-4 text-center text-[11px] text-[var(--ink-2)]">
            <span
              className="mr-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)", color: "var(--gold-ink)" }}
            >
              {CATALYST_LOOKBACK_DAYS} days = current assumption
            </span>
            not measured final truth — drafts occur over several days and host
            boards publish asynchronously, so the composite reacts gradually.
          </p>
        </div>
        <p className="mt-5 max-w-[720px] text-sm text-[var(--ink-2)]">
          A catalyst counts if it falls inside the {CATALYST_LOOKBACK_DAYS} days
          before the older snapshot or anywhere up to the newer one — an event
          older than the window can still be the cause.
        </p>
        <details className="mt-2 max-w-[720px]">
          <summary className="disclose">Catalyst window details</summary>
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
        </details>
      </section>

      {/* ================= ARCHETYPES ================= */}
      <section className="mt-16">
        <SectionHead
          id="archetypes"
          title="Player archetypes"
          badge={
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: "var(--surface-info-strong)", borderColor: "var(--border-info-soft)", color: "var(--text-info)" }}
            >
              Display only
            </span>
          }
        />
        <p className="mt-3 max-w-[720px] text-sm text-[var(--ink-2)]">
          The tag next to a player&rsquo;s name is a <strong>role label</strong>:
          it describes what kind of news moves that player, which is what
          connects it to the catalyst layer. A handcuff moves on starter
          injury news, a committee back on touch-split reporting. Labels are
          computed only from
          team, position and ADP, all already on every row, plus the current
          Sleeper injury designation and rookie flag. Archetypes never
          determine signals, rankings, or selection.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {[
            ["Injured", "current severe designation (IR, Out, PUP, NFI, Doubtful, Suspended, COV)"],
            ["Lead back", "RB1 · next RB ≥ 30 picks behind"],
            ["Handcuff", "RB2 · ≥ 30 picks behind the RB1"],
            ["Committee", "any RB within 30 picks of the team's RB1"],
            ["Alpha receiver", "first-two-round price, or WR1 ≥ 20 ahead of WR2"],
            ["Promoted", "highest-priced eligible teammate below an injured player"],
            ["Rookie", "first NFL season when no stronger role applies"],
            ["No label", "QBs and TEs by design · free agents · no rule matched"],
          ].map(([t, d]) => (
            <div key={t} className="flex items-baseline gap-3 border-t border-[var(--border)] py-2">
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 text-xs"
                style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
              >
                {t}
              </span>
              <span className="text-xs text-[var(--ink-2)]">{d}</span>
            </div>
          ))}
        </div>
        <details className="mt-4 max-w-[720px]">
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
      <section className="mt-16">
        <SectionHead id="limitations" title="Known limitations" />
        <div className="mt-4 grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {[
            ["Short history", `History begins ${startLong ?? "at the first stored capture"}. No chart or number implies data from before that date.`],
            ["Partial market", "The price reflects five league host boards, not all of fantasy football."],
            ["Staggered reaction", "News enters the ADP over several days — a real repricing looks like a slope, not a step. How long that takes has not yet been measured here."],
            ["Short ECR history", "The expert line has fewer points than the market line until the two histories are the same length."],
            ["Missing ECR", "Some players carry no expert rank, or sit outside the comparable range, and show “–” rather than a guessed value."],
            ["No signal outcome history yet", "How often each label appeared and how it resolved needs more stored history than currently exists."],
          ].map(([t, d]) => (
            <div key={t} className="border-t border-[var(--border)] py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">{t}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-2)]">{d}</p>
            </div>
          ))}
        </div>
        <details className="mt-4 max-w-[720px]">
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
      <section className="mt-16">
        <SectionHead id="evals" title="AI explanation evals" />
        <p className="mt-3 max-w-[720px] text-sm text-[var(--ink-2)]">
          The AI explanation layer is gated behind this scorecard. Two
          hand-graded passes are recorded below, and no note is live: the
          usefulness check in the grading contract is not yet in force, so a
          note that only paraphrases its inputs cannot yet be failed for it.
        </p>
        <div className="mt-4">
          <EvalScorecard />
        </div>
      </section>

      {/* ================= TECHNICAL REFERENCE ================= */}
      <section className="mt-16 border-t border-[var(--border)] pt-10" id="reference">
        <h2 className="scroll-mt-14 text-xl font-semibold">Technical reference</h2>
        <p className="mt-1 text-sm text-[var(--ink-3)]">
          Implementation details, edge cases, and decision records behind the
          rendered numbers.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-x-10 md:grid-cols-2">
          <div>
            <details>
              <summary className="flex cursor-pointer list-none items-baseline gap-3 border-t border-[var(--border)] py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="w-6 shrink-0 text-[11px] tabular-nums text-[var(--ink-3)]">01</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight">Positional ranks</span>
                  <span className="block text-[11px] text-[var(--ink-3)]">Why TE13 / WR24 may differ from FantasyPros</span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-[var(--accent)]">View →</span>
              </summary>
              <div className="ml-9 border-l pl-4 pb-3" style={{ borderColor: "var(--border-info-soft)" }}>
                <dl className="space-y-1.5 text-xs">
                  <div>
                    <dt className="font-semibold">Site rank</dt>
                    <dd className="text-[var(--ink-2)]">FantasyPros overall ECR across the tracked players who hold an ECR.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Price-side rank</dt>
                    <dd className="text-[var(--ink-2)]">The ADP payload&rsquo;s own pos_rank field.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Why they differ</dt>
                    <dd className="text-[var(--ink-2)]">Pipeline coverage and excluded positions shift ranks by a place or two.</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-3)]">
                  Positional ranks here (TE13, WR24) are computed from FantasyPros&rsquo;
                  overall ECR across the tracked players who hold an ECR, so they can
                  differ by a place or two from the positional ranks published on their
                  site. A player they rank whom the pipeline does not cover shifts
                  every rank below him. Price-side positional rank comes from the ADP
                  payload&rsquo;s own pos_rank field; kickers and team defenses are
                  excluded from the pipeline before ranking, so their removal does not
                  distort the skill position ranks.
                </p>
              </div>
            </details>
            <RefRow n="02" title="Signal semantics" desc="Stored rule strings ↔ display labels" href="#signals" linkLabel="Signals" />
            <RefRow n="03" title="Missing data" desc="Fallbacks, out-of-range ECR and “–”" href="#limitations" linkLabel="Limitations" />
          </div>
          <div>
            <RefRow n="04" title="Player identity" desc="FantasyPros IDs and Sleeper enrichment" href="#sources" linkLabel="Sources" />
            <RefRow n="05" title="Common-board movement" desc="Why changing board membership is excluded" href="#sources" linkLabel="Sources" />
            <RefRow n="06" title="Archetype overrides" desc="Authored corrections, display-only behaviour" href="#archetypes" linkLabel="Archetypes" />
          </div>
        </div>

        <div className="mt-8">
          <Eyebrow>Decision records</Eyebrow>
          <div className="mt-2 grid grid-cols-1 gap-x-10 md:grid-cols-2">
            {[
              ["ADR-001", "Snapshot storage", "Daily snapshots on Vercel Blob, not Postgres", "ADR-001-snapshot-storage.md"],
              ["ADR-002", "Curated catalysts", "Curated catalysts, not automated news analysis", "ADR-002-curated-catalysts.md"],
              ["ADR-003", "Interpretation layer", "Repositioning to an interpretation layer, not missing data", "ADR-003-repositioning-interpretation-layer.md"],
              ["ADR-004", "Catalyst sourcing & verification", "Sourcing is agent-assisted; verification is human", "ADR-004-catalyst-sourcing-and-verification.md"],
              ["ADR-005", "News-lookback preregistration", "Preregistered lookback measurement", "ADR-005-news-lookback-preregistration.md"],
            ].map(([id, title, desc, file]) => (
              <div key={id} className="flex items-baseline gap-3 border-t border-[var(--border)] py-2.5">
                <span className="w-14 shrink-0 text-[11px] tabular-nums text-[var(--ink-3)]">{id}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-tight">{title}</p>
                  <p className="text-[11px] text-[var(--ink-3)]">{desc}</p>
                </div>
                <a
                  href={`${REPO}/blob/master/decisions/${file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  ADR →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="mt-16 border-t border-[var(--border)] pt-4 text-xs text-[var(--ink-3)]">
        Decision records for the storage and catalyst approaches live in the
        repository under /decisions.{" "}
        <Link href="/" className="underline">Back to the Market</Link>
      </p>
    </main>
  );
}
