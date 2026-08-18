"use client";

import { useState } from "react";
import type { Signal } from "@/lib/math";
import { SIGNAL_META } from "@/lib/signals";

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
        : "sig-chip";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className={cls}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {signal}
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
