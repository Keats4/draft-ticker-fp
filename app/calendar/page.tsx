import Link from "next/link";
import phasesFile from "@/data/calendar_phases.json";
import { currentPhase, type Phase as LibPhase } from "@/lib/phases";
import PhaseMeter from "@/components/PhaseMeter";

export const metadata = { title: "Market Calendar · Draft Ticker" };

type Phase = {
  key: string;
  title: string;
  window: string;
  start: string;
  end: string;
  signal_level: "low" | "med" | "high" | "vhigh" | null;
  card_line: string;
  how_to_read: string;
  sections: Record<string, string>;
};

const SECTION_TITLES: Record<string, string> = {
  what_appears: "What information appears",
  player_types: "Player types affected",
  signal_strength: "How meaningful movement is",
  // watching has no static title - see watchingLabel(), which varies by phase position
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

const FUTURE_NOTE =
  "Names populate when this phase opens, from the catalyst file and the Move column.";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--ink-3)]">
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

/**
 * Phases where an in-season price actually earns its place. week-1 is
 * deliberately NOT here: it is the lowest trust phase in the set (signal_level
 * "low"), and one week of games is not yet an in-season market. Chrome only,
 * no authored prose in calendar_phases.json is touched.
 */
const IN_SEASON = new Set(["long-middle", "trade-deadlines", "stretch-run"]);

export default function Calendar() {
  const phases = phasesFile.phases as Phase[];
  const { index: currentIdx, inGap } = currentPhase(phases as unknown as LibPhase[]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">
        How much a move is worth right now
      </h1>
      <p className="mt-1 text-[var(--ink-2)]">
        The same four pick move means different things in May and in late
        August. This is what each part of the fantasy year actually tells you.
      </p>

      {/* timeline strip */}
      <div className="mt-6 overflow-x-auto">
        <div className="flex min-w-max items-start gap-0">
          {phases.map((p, i) => (
            <div key={p.key} className="flex flex-col items-center" style={{ width: 96 }}>
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : ""}`} style={{ background: "var(--border)" }} />
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: i === currentIdx && !inGap ? "var(--navy)" : "var(--surface)",
                    border: `2px solid ${i === currentIdx && !inGap ? "var(--navy)" : "var(--border)"}`,
                  }}
                />
                <span className={`h-0.5 flex-1 ${i === phases.length - 1 ? "opacity-0" : ""}`} style={{ background: "var(--border)" }} />
              </div>
              <span className={`mt-1 text-center text-[11px] ${i === currentIdx && !inGap ? "font-semibold" : "text-[var(--ink-3)]"}`}>
                {p.title}
              </span>
              {i === currentIdx && !inGap && (
                <span className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }}>
                  YOU ARE HERE
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 rounded-md border px-3 py-2 text-sm" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
        You are here. Movement now is worth taking seriously.
      </p>

      <ol className="mt-8 space-y-5">
        {phases.map((phase, i) => {
          const isCurrent = i === currentIdx;
          const offset: "past" | "now" | "future" =
            currentIdx < 0 ? "future" : i < currentIdx ? "past" : isCurrent ? "now" : "future";
          return (
            <li
              key={phase.key}
              className="rounded-lg border bg-[var(--surface)] p-4"
              style={{ borderColor: isCurrent ? "var(--navy)" : "var(--border)" }}
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-sm tabular-nums text-[var(--ink-3)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-lg font-semibold">{phase.title}</h2>
                {isCurrent && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }}>
                    CURRENT PHASE
                  </span>
                )}
                <span className="ml-auto text-xs text-[var(--ink-3)]">{phase.window}</span>
              </div>

              {IN_SEASON.has(phase.key) && (
                <p className="mt-2 text-xs text-[var(--ink-3)]">
                  Once games start, in-season value moves for different reasons.{" "}
                  <Link href="/market-price-index" className="underline">
                    Market Price Index
                  </Link>
                </p>
              )}
              {phase.card_line && (
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {phase.card_line}
                </p>
              )}

              {/* Sections are split across BOTH columns so no card is ever
                  half-empty. Previously all four sat in the left column and the
                  right column filled only on the current phase, which left 11 of
                  12 cards looking unfinished once real content landed. */}
              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <dl className="space-y-3">
                  <Section title={SECTION_TITLES.what_appears}>
                    {phase.sections.what_appears || <Pending />}
                  </Section>
                  <Section title={SECTION_TITLES.player_types}>
                    {phase.sections.player_types || <Pending />}
                  </Section>
                </dl>
                <div className="space-y-3">
                  <dl className="space-y-3">
                    <Section title={SECTION_TITLES.signal_strength}>
                      <PhaseMeter level={phase.signal_level} />
                    </Section>
                    <Section title={watchingLabel(offset)}>
                      {phase.sections.watching ? (
                        <>
                          {phase.sections.watching}
                          {offset === "future" && (
                            <span className="mt-1 block text-xs italic text-[var(--ink-3)]">
                              {FUTURE_NOTE}
                            </span>
                          )}
                        </>
                      ) : (
                        <Pending />
                      )}
                    </Section>
                  </dl>
                  {isCurrent && (
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
                  )}
                </div>
              </div>
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
