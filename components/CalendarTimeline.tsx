"use client";

import { useEffect, useRef } from "react";
import type { PhaseLevel } from "@/components/PhaseMeter";

export type TimelinePhase = {
  key: string;
  title: string;
  window: string;
  signal_level: PhaseLevel;
};

const TRUST_FULL: Record<string, string> = {
  low: "Low",
  med: "Medium",
  high: "High",
};

/** Existing categorical trust colours; the dot is small, the word does the
 *  talking. */
const TRUST_DOT: Record<string, string> = {
  low: "var(--sig-low)",
  med: "var(--sig-med)",
  high: "var(--sig-high)",
};

/** Content-aware minimum widths so long titles breathe instead of wrapping
 *  aggressively; still systematic (three length categories, not per-phase
 *  hand tuning). */
const minWidthFor = (title: string) =>
  title.length <= 9 ? "104px" : title.length <= 17 ? "120px" : "136px";

/** Rail-only display shortenings; the full authored title renders everywhere
 *  else on the page. */
const RAIL_TITLE: Record<string, string> = {
  "Stretch Run & Fantasy Playoffs": "Stretch Run & Playoffs",
};

/**
 * The phase rail: one horizontal fantasy-year timeline, not twelve cards.
 * Each phase carries only its number, title (max two clamped lines) and a
 * trust row: a small dot in the existing categorical trust colour plus the
 * full word (Low / Medium / High). Windows/dates stay out of the rail —
 * they render in the rows and expanded cards.
 *
 * Readability over fit: tiles take content-aware widths, so the rail is a
 * contained scroller at desktop too, starting at phase 01 (the partially
 * visible tile at the right edge is the overflow affordance). The current
 * phase is centred on mount only below the desktop breakpoint. Buttons
 * scroll to and open the phase's details element, updating the hash.
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
    // Centre the current phase only on smaller screens; desktop always
    // starts the year at phase 01, never mid-scroll.
    if (window.matchMedia("(min-width: 1024px)").matches) return;
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
                className="flex w-full flex-col items-center gap-1 rounded-md border px-1.5 py-2.5 text-center transition-colors hover:bg-[var(--surface-info-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                style={{
                  minWidth: minWidthFor(RAIL_TITLE[p.title] ?? p.title),
                  ...(isCurrent
                    ? { background: "var(--surface-info-strong)", borderColor: "var(--navy)" }
                    : { borderColor: "transparent" }),
                }}
              >
                <span className="flex h-[16px] items-center">
                  {isCurrent ? (
                    <span
                      className="rounded-full px-1.5 text-[10px] font-bold uppercase tracking-wide leading-[15px]"
                      style={{ background: "var(--navy)", color: "var(--surface)" }}
                    >
                      Current
                    </span>
                  ) : (
                    <span className="text-[10px] tabular-nums text-[var(--ink-3)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                </span>
                <span
                  className={`line-clamp-2 h-[34px] w-full text-[13px] leading-[1.3] ${
                    isCurrent ? "font-semibold" : "text-[var(--ink-2)]"
                  }`}
                >
                  {RAIL_TITLE[p.title] ?? p.title}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: TRUST_DOT[level] ?? "var(--border)" }}
                  />
                  <span className="whitespace-nowrap text-[11px] font-medium text-[var(--ink-2)]">
                    {full === "pending" ? "–" : full}
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
