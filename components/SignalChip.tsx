"use client";

import { useState } from "react";
import type { Signal } from "@/lib/math";
import { SIGNAL_META } from "@/lib/signals";

/**
 * Display-layer label map: the stored Signal strings (lib/math.ts) are the
 * deterministic states and are unchanged; the chip renders a compact product
 * label for each. The popover keeps the full stored name, blurb and numeric
 * rule, so the precise meaning is one tap away. Mapping:
 *   Market moving faster           -> Market leading
 *   Experts moving first           -> Experts leading
 *   Market catching up to experts  -> Market converging
 *   Market and experts converging  -> Converging
 *   Market and experts diverging   -> Diverging
 *   Broad agreement                -> Aligned move
 *   Both holding                   -> Stable
 */
const DISPLAY_LABEL: Record<Signal, string> = {
  "Market moving faster": "Market leading",
  "Experts moving first": "Experts leading",
  "Market catching up to experts": "Market converging",
  "Market and experts converging": "Converging",
  "Market and experts diverging": "Diverging",
  "Broad agreement": "Aligned move",
  "Both holding": "Stable",
};

/** Clickable signal chip; opens a popover stating the rule in numbers. */
export default function SignalChip({ signal }: { signal: Signal | null }) {
  const [open, setOpen] = useState(false);
  if (signal === null)
    return <span className="text-[var(--ink-3)]">–</span>;

  const cls =
    signal === "Market and experts diverging"
      ? "sig-chip sig-chip--diverging"
      : signal === "Market and experts converging"
        ? "sig-chip sig-chip--converging"
        : signal === "Both holding"
          ? "sig-chip sig-chip--stable"
          : "sig-chip";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className={cls}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {DISPLAY_LABEL[signal]}
        <span aria-hidden className="text-[var(--ink-3)]">
          ⓘ
        </span>
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <span className="absolute left-0 top-8 z-20 block w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-xl">
            <span className="block text-sm font-semibold">{signal}</span>
            <span className="mt-1 block text-xs text-[var(--ink-2)]">
              {SIGNAL_META[signal].blurb}
            </span>
            <span className="mt-2 block text-xs">
              <span className="font-medium">Rule: </span>
              {SIGNAL_META[signal].rule}
            </span>
          </span>
        </>
      )}
    </span>
  );
}
