import Link from "next/link";
import SignalChip from "@/components/SignalChip";
import PhaseMeter, { type PhaseLevel } from "@/components/PhaseMeter";
import PlayerChart, { type ChartMarker, type ChartPoint } from "@/components/PlayerChart";
import type { Signal } from "@/lib/math";
import type { Evidence } from "@/lib/evidence";
import { valueTone, valueWord } from "@/lib/story";

/**
 * The homepage lead. It is the intersection of all three axes, calendar
 * phase, player archetype, market signal, not a chart with a caption.
 *
 * Field order is fixed by spec: phase + trust, archetype, signal chip,
 * evidence badge, chart, plain-language sentence, catalyst headline.
 *
 * Nothing here is authored. phase comes from data/calendar_phases.json,
 * archetype from lib/archetype.ts, signal from signalLabel(), tier from
 * lib/evidence.ts, and WHICH player appears comes from lib/story.ts. If the
 * calendar prose has not been written yet, the phase name and trust meter
 * still render and the prose slot is simply absent, never filled with filler.
 */
export type HeroCatalyst = { date: string; summary: string; label: string | null; sourceUrl: string };

export default function HeroStory({
  href,
  name,
  position,
  team,
  phaseTitle,
  phaseLevel,
  phaseProse,
  archetypeTag,
  archetypeReason,
  signal,
  evidence,
  sentence,
  points,
  markers,
  trackingSince,
  catalyst,
  hostRank,
  ecr,
  gap,
  posRank,
}: {
  href: string;
  name: string;
  position: string;
  team: string;
  phaseTitle: string | null;
  phaseLevel: PhaseLevel;
  phaseProse: string;
  archetypeTag: string | null;
  archetypeReason: string | null;
  signal: Signal | null;
  evidence: Evidence | null;
  sentence: string;
  points: ChartPoint[];
  markers: ChartMarker[];
  trackingSince: string;
  catalyst: HeroCatalyst | null;
  hostRank: number;
  ecr: number | null;
  gap: number | null;
  /** Positional rank from the source payload (e.g. RB4 → 4). */
  posRank: number;
}) {
  return (
    <section
      className="mb-6 overflow-hidden rounded-xl border bg-[var(--surface)]"
      style={{ borderColor: "var(--navy)" }}
      aria-label="Today's lead story"
    >
      {/* 1. calendar phase + trust level */}
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
          </>
        )}
        <span className="text-xs text-[var(--ink-3)]">Movement trust:</span>
        <PhaseMeter level={phaseLevel} />
      </div>

      {phaseProse && (
        <p className="border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--ink-2)]">
          {phaseProse}
        </p>
      )}

      <div className="p-4">
        {/* 2. player + archetype */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link href={href} className="text-2xl font-bold tracking-tight hover:underline">
            {name}
          </Link>
          <span className="text-sm text-[var(--ink-2)]">{position}{posRank} · {team}</span>
          {archetypeTag && (
            <span
              className="rounded-full border px-2.5 py-0.5 text-xs"
              style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
              title={archetypeReason ?? undefined}
            >
              {archetypeTag}
            </span>
          )}
        </div>

        {/* 3 + 4, signal chip, then evidence badge */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SignalChip signal={signal} />
          {signal && evidence && (
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
          <span className="ml-auto flex items-center gap-3 text-xs tabular-nums text-[var(--ink-3)]">
            <span>ADP {hostRank}</span>
            <span>ECR {ecr ?? "–"}</span>
            {/* The value read: the only coloured number in the hero, and the
                word carries the same meaning without colour. */}
            {gap !== null && (
              <span style={{ color: valueTone(gap) }}>
                Gap {gap > 0 ? "+" : ""}{gap}
                {valueWord(gap) ? ` ${valueWord(gap)}` : ""}
              </span>
            )}
          </span>
        </div>

        {/* 5. mini chart with the disagreement band */}
        <div className="mt-3">
          <PlayerChart
            variant="mini"
            points={points}
            markers={markers}
            trackingSince={trackingSince}
          />
        </div>

        {/* 6. plain-language sentence */}
        <p className="mt-3 text-sm text-[var(--foreground)]">{sentence}</p>

        {/* 7. event headline with its date; full summary behind the expander */}
        {catalyst ? (
          <div className="mt-3">
            <span
              className="inline-block rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
              style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
            >
              Event · {catalyst.date}
            </span>
            <p className="mt-1 text-sm">{catalyst.label ?? catalyst.summary}</p>
            <details className="mt-0.5">
              <summary
                className="cursor-pointer select-none text-xs text-[var(--ink-3)] underline"
                style={{ textDecorationColor: "var(--gold)" }}
              >
                view evidence
              </summary>
              <p className="mt-1 max-w-prose text-xs leading-relaxed text-[var(--ink-2)]">
                {catalyst.summary}{" "}
                <a href={catalyst.sourceUrl} rel="noreferrer" className="underline text-[var(--ink-3)]">
                  source
                </a>
              </p>
            </details>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[var(--ink-3)]">
            No verified event on file for this move yet.
          </p>
        )}

        <Link href={href} className="mt-3 inline-block text-sm font-semibold underline">
          See the full read on {name} →
        </Link>
      </div>
    </section>
  );
}
