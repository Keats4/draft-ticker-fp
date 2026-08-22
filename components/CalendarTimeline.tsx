"use client";

import { useEffect, useRef } from "react";
import type { PhaseLevel } from "@/components/PhaseMeter";

export type TimelinePhase = {
  key: string;
  title: string;
  window: string;
  signal_level: PhaseLevel;
};

const TRUST_ABBR: Record<string, string> = {
  low: "L",
  med: "M",
  high: "H",
  vhigh: "VH",
};
const TRUST_FULL: Record<string, string> = {
  low: "Low",
  med: "Medium",
  high: "High",
  vhigh: "Very high",
};

/** Rail-only display shortenings; the full authored title renders everywhere
 *  else on the page. */
const RAIL_TITLE: Record<string, string> = {
  "Stretch Run & Fantasy Playoffs": "Stretch Run & Playoffs",
};

/**
 * The phase rail: one horizontal fantasy-year timeline, not twelve cards.
 * Each phase carries only its number, title (max two clamped lines) and a
 * compact categorical trust mark (mini bars + L/M/H/VH, the existing trust
 * colours; the full word lives in the tooltip and aria-label, and in the
 * status row and phase rows below). Windows/dates stay out of the rail —
 * they render in the rows and expanded cards.
 *
 * Desktop: all twelve fit, no scroll, starts at phase 01. When the rail
 * genuinely overflows (tablet/mobile) it becomes a contained scroller and
 * the current phase is brought into view. Buttons scroll to and open the
 * phase's details element, updating the hash. Display only: trust levels
 * come straight from the authored calendar data.
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
    // Centre the current phase ONLY when the rail actually overflows;
    // a fully visible desktop rail must start at phase 01.
    const el = currentRef.current;
    const scroller = el?.closest("[data-timeline-scroll]");
    if (el && scroller && scroller.scrollWidth > scroller.clientWidth + 8) {
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
    <div
      data-timeline-scroll
      className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"
    >
      <div className="flex min-w-max items-stretch gap-0.5 lg:min-w-0">
        {phases.map((p, i) => {
          const isCurrent = i === currentIdx && !inGap;
          const level = p.signal_level ?? "";
          const full = TRUST_FULL[level] ?? "pending";
          return (
            <div key={p.key} className="flex flex-1 items-stretch gap-0.5">
              {/* draft-season → in-season handoff: one quiet separator */}
              {i === 8 && (
                <span
                  aria-hidden
                  className="mx-0.5 w-px self-stretch"
                  style={{ background: "rgba(110,116,126,0.35)" }}
                />
              )}
              <button
                ref={isCurrent ? currentRef : undefined}
                type="button"
                onClick={() => jump(p.key)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${p.title}. Movement trust: ${full}`}
                title={`Movement trust: ${full}`}
                className="flex w-full min-w-[78px] flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-center transition-colors hover:bg-[var(--surface-info-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                style={
                  isCurrent
                    ? { background: "var(--surface-info-strong)", borderColor: "var(--navy)" }
                    : { borderColor: "transparent" }
                }
              >
                <span className="flex h-[14px] items-center">
                  {isCurrent ? (
                    <span
                      className="rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wide leading-[13px]"
                      style={{ background: "var(--navy)", color: "var(--surface)" }}
                    >
                      Current
                    </span>
                  ) : (
                    <span className="text-[9px] tabular-nums text-[var(--ink-3)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                </span>
                <span
                  className={`line-clamp-2 h-[27px] w-full text-[10.5px] leading-[1.28] ${
                    isCurrent ? "font-semibold" : "text-[var(--ink-2)]"
                  }`}
                >
                  {RAIL_TITLE[p.title] ?? p.title}
                </span>
                <span className="flex items-center gap-1">
                  <span aria-hidden className={`meter meter--sm ${level}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="text-[9px] font-bold text-[var(--ink-2)]">
                    {TRUST_ABBR[level] ?? "–"}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
