"use client";

import { useState } from "react";

/** Small (i) affordance with a plain-language definition on hover/tap. */
export default function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label={text}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] leading-none text-[var(--ink-3)] align-middle"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-5 z-20 w-52 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-xs font-normal normal-case tracking-normal text-[var(--foreground)] shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
