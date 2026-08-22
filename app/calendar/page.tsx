import Link from "next/link";
import phasesFile from "@/data/calendar_phases.json";
import { currentPhase, type Phase as LibPhase } from "@/lib/phases";
import PhaseMeter, { type PhaseLevel } from "@/components/PhaseMeter";
import CalendarTimeline from "@/components/CalendarTimeline";
import InfoDot from "@/components/InfoDot";

export const metadata = { title: "Market Calendar · Draft Ticker" };

type Phase = {
  key: string;
  title: string;
  window: string;
  start: string;
  end: string;
  signal_level: "low" | "med" | "high" | null;
  card_line: string;
  how_to_read: string;
  sections: Record<string, string>;
};

/** The Watching field is labelled by WHERE the phase sits relative to the one
 *  carrying current:true. No dates are parsed - `window` is a display string and
 *  nothing reads it - so ordering is the only honest source of past/now/future.
 *  Move the `current` flag and these labels follow, same as the timeline. */
function watchingLabel(offset: "past" | "now" | "future"): string {
  if (offset === "past") return "What happened";
  if (offset === "now") return "Watching now";
  return "What to watch for";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--ink-2)]">
        {title}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function Pending() {
  return (
    <p className="rounded border border-dashed border-[var(--border)] px-3 py-2 text-xs italic text-[var(--ink-3)]">
      Content pending, being written by hand, not generated.
    </p>
  );
}

/** Authored player-type strings render as neutral chips when they split
 *  cleanly on "·"; sentence-style entries stay prose. Wording untouched. */
function PlayerTypes({ value }: { value: string }) {
  const parts = value.split("·").map((s) => s.trim()).filter(Boolean);
  const chippable = parts.length >= 2 && parts.every((p) => p.length <= 40);
  if (!chippable) return <>{value}</>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {parts.map((p) => (
        <span
          key={p}
          className="rounded-full border px-2 py-0.5 text-xs"
          style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)", color: "var(--ink-2)" }}
        >
          {p}
        </span>
      ))}
    </span>
  );
}

/** One concise, honest note; trust stays categorical and authored. */
const TRUST_NOTE =
  "Calendar trust levels are authored preseason guidance, intended to be validated against movement persistence and reversion. Categorical by design, never a percentage.";

/**
 * Phases where an in-season price actually earns its place. week-1 is
 * deliberately NOT here: it is the lowest trust phase in the set (signal_level
 * "low"), and one week of games is not yet an in-season market. Chrome only,
 * no authored prose in calendar_phases.json is touched.
 */
const IN_SEASON = new Set(["long-middle", "trade-deadlines", "stretch-run"]);

export default function Calendar() {
  const phases = phasesFile.phases as Phase[];
  const { index: currentIdx, inGap, phase: current } = currentPhase(phases as unknown as LibPhase[]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">
        How much a move is worth right now
      </h1>
      <p className="mt-1 text-[var(--ink-2)]">
        The same four pick move means different things in May and in late
        August. This is what each part of the fantasy year actually tells you.
      </p>

      {/* Phase navigator: chronology and trust together. Click a phase to
          open its card below. */}
      <div className="mt-6">
        <CalendarTimeline
          phases={phases.map((p) => ({
            key: p.key,
            title: p.title,
            window: p.window,
            signal_level: p.signal_level as PhaseLevel,
          }))}
          currentIdx={currentIdx}
          inGap={inGap}
        />
      </div>

      {/* Compact current-phase status. The detail lives in the open card
          below; this says only what a passer-by needs. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
        {current && !inGap ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-2)]">
              Current phase
            </span>
            <span className="text-sm font-semibold">{current.title}</span>
            <span className="flex items-center gap-2 text-xs text-[var(--ink-2)]">
              Movement trust: <PhaseMeter level={current.signal_level as PhaseLevel} />
              <InfoDot text={TRUST_NOTE} />
            </span>
          </>
        ) : (
          <span className="text-sm text-[var(--ink-2)]">
            Between phases. No phase carries today&rsquo;s date, so no trust
            reading is shown.
          </span>
        )}
      </div>

      {/* One open card (the current phase); everything else is a compact,
          expandable row. Native details/summary: keyboard accessible, no
          state to persist, nothing authored is removed. */}
      <ol className="mt-6 space-y-2.5">
        {phases.map((phase, i) => {
          const isCurrent = i === currentIdx && !inGap;
          const offset: "past" | "now" | "future" =
            currentIdx < 0 ? "future" : i < currentIdx ? "past" : i === currentIdx ? "now" : "future";
          return (
            <li key={phase.key}>
              <details
                id={`phase-${phase.key}`}
                open={isCurrent}
                className="group scroll-mt-4 rounded-lg border bg-[var(--surface)]"
                style={{ borderColor: isCurrent ? "var(--navy)" : "var(--border)" }}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm tabular-nums text-[var(--ink-3)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-base font-semibold">{phase.title}</h2>
                  {isCurrent && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: "var(--navy)", color: "var(--surface)" }}
                    >
                      Current phase
                    </span>
                  )}
                  <PhaseMeter level={phase.signal_level as PhaseLevel} />
                  {phase.card_line && (
                    <span className="hidden min-w-0 flex-1 truncate text-xs text-[var(--ink-2)] group-open:lg:hidden lg:inline">
                      {phase.card_line}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-2 text-xs text-[var(--ink-3)]">
                    {phase.window}
                    <span aria-hidden className="transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </summary>

                <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                  {phase.card_line && (
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {phase.card_line}
                    </p>
                  )}
                  {IN_SEASON.has(phase.key) && (
                    <p className="mt-1.5 text-xs text-[var(--ink-3)]">
                      Once games start, in-season value moves for different reasons.{" "}
                      <Link href="/market-price-index" className="underline">
                        Market Price Index
                      </Link>
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                    <dl className="space-y-3">
                      <Section title="New information">
                        {phase.sections.what_appears || <Pending />}
                      </Section>
                      <Section title="Player types affected">
                        {phase.sections.player_types ? (
                          <PlayerTypes value={phase.sections.player_types} />
                        ) : (
                          <Pending />
                        )}
                      </Section>
                    </dl>
                    <div className="space-y-3">
                      <dl className="space-y-3">
                        <Section title={watchingLabel(offset)}>
                          {phase.sections.watching ? phase.sections.watching : <Pending />}
                        </Section>
                      </dl>
                      {isCurrent ? (
                        <div className="rounded-lg border p-3" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
                          <p className="text-xs font-semibold uppercase tracking-wide">How to read this phase</p>
                          {phase.how_to_read ? (
                            <p className="mt-1 text-sm">{phase.how_to_read}</p>
                          ) : (
                            <p className="mt-1 text-sm italic text-[var(--ink-3)]">
                              Content pending, being written by hand.
                            </p>
                          )}
                        </div>
                      ) : (
                        <dl>
                          <Section title="How to read this phase">
                            {phase.how_to_read || <Pending />}
                          </Section>
                        </dl>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-xs text-[var(--ink-3)]">
        Phase content and signal levels are authored by hand (see
        data/calendar_phases.json), nothing here is generated.{" "}
        <Link href="/" className="underline">Back to the Market</Link>
      </p>
    </main>
  );
}
