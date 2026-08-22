"use client";

import { useEffect, useRef } from "react";
import PhaseMeter, { type PhaseLevel } from "@/components/PhaseMeter";

export type TimelinePhase = {
  key: string;
  title: string;
  window: string;
  signal_level: PhaseLevel;
};

/**
 * The calendar's phase navigator: chronology AND trust in one strip. Each
 * phase shows its authored trust meter (discrete, categorical, the existing
 * red/gold/green semantics) so the year's signal shape is visible without
 * opening a single card. Buttons scroll to and open the phase's details
 * element; the current phase is highlighted and centred on load.
 *
 * Display only: trust levels come straight from the authored calendar data.
 */
export default function CalendarTimeline({
  phases,
  currentIdx,
  inGap,
}: {
  phases: TimelinePhase[];
  currentIdx: number;
  inGap: boolean;
}) {
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Centre the current phase in the scroller without scrolling the page.
    const el = currentRef.current;
    const scroller = el?.closest("[data-timeline-scroll]");
    if (el && scroller) {
      const r = el.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      scroller.scrollLeft += r.left - s.left - (s.width - r.width) / 2;
    }
  }, []);

  const jump = (key: string) => {
    const target = document.getElementById(`phase-${key}`) as HTMLDetailsElement | null;
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#phase-${key}`);
  };

  return (
    <div data-timeline-scroll className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-stretch gap-1">
        {phases.map((p, i) => {
          const isCurrent = i === currentIdx && !inGap;
          return (
            <button
              key={p.key}
              ref={isCurrent ? currentRef : undefined}
              type="button"
              onClick={() => jump(p.key)}
              aria-current={isCurrent ? "step" : undefined}
              className="flex w-[104px] flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              style={
                isCurrent
                  ? { background: "var(--surface-info-strong)", borderColor: "var(--navy)" }
                  : { background: "var(--surface)", borderColor: "var(--border)" }
              }
            >
              {isCurrent ? (
                <span
                  className="rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{ background: "var(--navy)", color: "var(--surface)" }}
                >
                  Current
                </span>
              ) : (
                <span className="text-[9px] uppercase tracking-wide text-[var(--ink-3)]">
                  {p.window}
                </span>
              )}
              <span
                className={`text-[11px] leading-tight ${
                  isCurrent ? "font-semibold" : "text-[var(--ink-2)]"
                }`}
              >
                {p.title}
              </span>
              <PhaseMeter level={p.signal_level} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
