import Link from "next/link";
import SignalChip from "@/components/SignalChip";
import PhaseMeter, { type PhaseLevel } from "@/components/PhaseMeter";
import PlayerChart, { type ChartMarker, type ChartPoint } from "@/components/PlayerChart";
import InfoDot from "@/components/InfoDot";
import type { Signal } from "@/lib/math";
import type { Evidence } from "@/lib/evidence";
import { valueTone, valueWord } from "@/lib/story";

/**
 * The mirror-pair lead: one event, two prices, opposite directions.
 *
 * Same three axes as the single hero (calendar phase, archetype, signal) but
 * doubled and squared up, so the two halves read as a matched pair and the
 * opposition is visible before you read a word.
 *
 * Desktop composition (lg+): a 9 / 9 / 7 internal grid (36/36/28). The two player
 * columns sit side by side; the pair's context (title, interpretation,
 * evidence state, events near the move, links) lives in a right-hand rail
 * rather than a full-width block underneath, so no horizontal region of the
 * module is left without a purpose. Below lg the module keeps the original
 * stacked hierarchy: title, side A, side B, context.
 *
 * Which pair appears (and whether a pair appears at all) is decided by
 * pairStrength() in lib/story.ts. Nothing here is hardcoded. Layout only:
 * every figure, label, pill and sentence is the same data as before.
 */
export type MirrorSide = {
  href: string;
  name: string;
  position: string;
  team: string;
  archetypeTag: string | null;
  archetypeReason: string | null;
  signal: Signal | null;
  points: ChartPoint[];
  markers: ChartMarker[];
  hostRank: number;
  ecr: number | null;
  gap: number | null;
  hostRankDelta: number | null;
  /** Positional rank from the source payload (e.g. RB4 → 4). */
  posRank: number;
};

function Side({
  s,
  moveWindow,
  trackingSince,
  className = "",
}: {
  s: MirrorSide;
  moveWindow: string;
  trackingSince: string;
  className?: string;
}) {
  const up = (s.hostRankDelta ?? 0) > 0;
  // Movement is neutral by rule. The arrow carries the direction; painting a
  // faller red would say "bad price" about a price that just got cheaper.
  const arrow = s.hostRankDelta == null || s.hostRankDelta === 0 ? null : up ? "▲" : "▼";
  return (
    <div className={`flex flex-col gap-2 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={s.href} className="text-sm font-semibold tracking-tight hover:underline">
            {s.name}
          </Link>
          <p className="text-xs text-[var(--ink-3)]">{s.position}{s.posRank} · {s.team}</p>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-bold tabular-nums text-[var(--foreground)]">
            {/* Arrow carries direction, so the figure drops its sign: the
                two said the same thing. Zero renders without either. */}
            {arrow && <span aria-hidden style={{ color: "var(--navy)" }}>{arrow} </span>}
            {s.hostRankDelta === null ? "–" : Math.abs(s.hostRankDelta)}
          </div>
          <p className="text-xs text-[var(--ink-3)]">
            {s.hostRankDelta === null
              ? `no movement stored yet`
              : s.hostRankDelta === 0
                ? `unmoved ${moveWindow}`
                : `picks ${up ? "gained" : "lost"} ${moveWindow}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {s.archetypeTag ? (
          <span
            className="rounded-full border px-2 py-0.5 text-xs"
            style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
            title={s.archetypeReason ?? undefined}
          >
            {s.archetypeTag}
          </span>
        ) : (
          <span
            className="rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs text-[var(--ink-3)]"
            title="No role label. Quarterbacks and tight ends carry none by design; unclear rooms stay unlabelled rather than guessed."
          >
            No role label
          </span>
        )}
        <SignalChip signal={s.signal} />
      </div>

      <PlayerChart
        variant="mini"
        points={s.points}
        markers={s.markers}
        trackingSince={trackingSince}
      />

      <dl className="grid grid-cols-3 gap-1 text-center text-xs">
        <div>
          <dt className="text-[var(--ink-3)]">ADP</dt>
          <dd className="tabular-nums font-semibold">{s.hostRank}</dd>
        </div>
        <div>
          <dt className="text-[var(--ink-3)]">ECR</dt>
          <dd className="tabular-nums font-semibold">{s.ecr ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-[var(--ink-3)]">Gap</dt>
          {/* The only coloured figure in this tile, and it carries its word. */}
          <dd
            className="tabular-nums font-semibold"
            style={{ color: s.gap === null ? "var(--ink-3)" : valueTone(s.gap) }}
          >
            {s.gap === null ? "–" : `${s.gap > 0 ? "+" : ""}${s.gap}`}
            {valueWord(s.gap) && (
              <span className="ml-1 text-xs font-normal">{valueWord(s.gap)}</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function MirrorHero({
  title,
  phaseTitle,
  phaseLevel,
  phaseProse,
  a,
  b,
  evidence,
  catalysts,
  pairSummary,
  moveWindow,
  trackingSince,
}: {
  title: string;
  phaseTitle: string | null;
  phaseLevel: PhaseLevel;
  phaseProse: string;
  a: MirrorSide;
  b: MirrorSide;
  evidence: Evidence | null;
  /** Events near the move, newest first: each side's newest verified event,
   *  deduped when both sides point at the same article. */
  catalysts: { date: string; summary: string; label: string | null; sourceUrl: string; player: string | null }[];
  /** Structured pair read: the two deltas plus the opposed/same-direction
   *  state. `note` is the full honest sentence (both variants unchanged) and
   *  renders as the status pill's tooltip rather than as standing prose. */
  pairSummary: {
    aLabel: string;
    aDelta: number | null;
    bLabel: string;
    bDelta: number | null;
    opposed: boolean;
    note: string;
  };
  moveWindow: string;
  trackingSince: string;
}) {
  const titlePills = (
    <>
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      <span
        className="rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }}
      >
        Mirror pair
      </span>
      {evidence && (
        <span
          className="rounded-full px-2 py-0.5 text-xs"
          title={evidence.note}
          style={
            evidence.confirmed
              ? { background: "rgba(21,128,61,0.12)", color: "var(--pos)" }
              : { background: "var(--background)", color: "var(--ink-3)", border: "1px solid var(--border)" }
          }
        >
          {evidence.label}
        </span>
      )}
    </>
  );

  return (
    <section
      className="mb-8 overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm"
      style={{ borderColor: "var(--navy)" }}
      aria-label="Today's lead story: mirror pair"
    >
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">
          Today&rsquo;s lead
        </span>
        {phaseTitle && (
          <>
            <span className="text-[var(--ink-3)]" aria-hidden>·</span>
            <Link href="/calendar" className="text-xs hover:underline">
              {phaseTitle}
            </Link>
            {/* The phase's one-line explanation moved behind the info dot;
                the full calendar context lives on /calendar. */}
            {phaseProse && <InfoDot text={phaseProse} />}
          </>
        )}
        <span className="text-xs text-[var(--ink-3)]">Movement trust:</span>
        <PhaseMeter level={phaseLevel} />
      </div>

      {/* Below lg the title row keeps its original place above the sides;
          on lg it lives in the context rail instead. Same content once each. */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 lg:hidden">
        {titlePills}
      </div>

      {/* the two player columns and the context rail: 9 / 9 / 7 on lg */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[9fr_9fr_7fr]">
        <Side s={a} moveWindow={moveWindow} trackingSince={trackingSince} />
        <Side
          s={b}
          moveWindow={moveWindow}
          trackingSince={trackingSince}
          className="border-t border-[var(--border)] md:border-t-0 md:border-l"
        />

        <aside className="flex flex-col border-t border-[var(--border)] p-4 md:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l">
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            {titlePills}
          </div>
          {/* The pair read as values: the two windows' moves side by side,
              with the opposed / same-direction state as a labelled pill. The
              full sentence (either variant) is the pill's tooltip. */}
          <dl className="mt-2 space-y-1 text-sm">
            {[
              { label: pairSummary.aLabel, delta: pairSummary.aDelta },
              { label: pairSummary.bLabel, delta: pairSummary.bDelta },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-2">
                <dt className="font-semibold">{row.label}</dt>
                <dd className="tabular-nums font-semibold">
                  {row.delta === null || row.delta === 0 ? (
                    <span className="font-normal text-[var(--ink-3)]">
                      {row.delta === null ? "–" : `unmoved`}
                    </span>
                  ) : (
                    <>
                      <span aria-hidden style={{ color: "var(--navy)" }}>
                        {row.delta > 0 ? "▲" : "▼"}
                      </span>{" "}
                      {Math.abs(row.delta)}
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-1.5">
            <span
              title={pairSummary.note}
              className="inline-block cursor-help rounded-full px-2 py-0.5 text-xs"
              style={{ background: "rgba(22,35,61,0.06)", color: "var(--navy-2)" }}
            >
              {pairSummary.opposed
                ? "Opposite directions"
                : "Same direction · not mirroring"}
            </span>
          </p>
          {catalysts.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                <span aria-hidden style={{ color: "var(--gold)" }}>◆ </span>
                Events near the move
              </p>
              <div className="mt-1 space-y-2">
                {catalysts.map((c) => (
                  <div key={c.sourceUrl + c.date}>
                    <p className="text-xs text-[var(--ink-3)]">
                      {c.date}
                      {c.player ? ` · ${c.player}` : ""}
                    </p>
                    <p className="text-sm">{c.label ?? c.summary}</p>
                    <details className="mt-1">
                      <summary className="disclose disclose--gold">view evidence</summary>
                      <p className="mt-1 max-w-prose text-xs leading-relaxed text-[var(--ink-2)]">
                        {c.summary}{" "}
                        <a href={c.sourceUrl} rel="noreferrer" className="underline text-[var(--ink-3)]">
                          source
                        </a>
                      </p>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--ink-3)]">
              No shared verified event on file
              <InfoDot text="These two are moving in opposite directions, but no single verified event is on file for both. The mirror is measured, not explained." />
            </p>
          )}
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] pt-2 text-sm lg:mt-auto lg:flex-col lg:pt-3">
            <Link href={a.href} className="font-semibold underline">See {a.name} →</Link>
            <Link href={b.href} className="font-semibold underline">See {b.name} →</Link>
          </p>
        </aside>
      </div>
    </section>
  );
}
