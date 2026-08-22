"use client";

import { useState } from "react";
import Link from "next/link";
import { THRESHOLDS } from "@/lib/math";
import { UNIVERSE } from "@/lib/universe";

/**
 * The ONE explainer block on the market page, sitting directly above the
 * table, where the vocabulary is actually used. It merges the old
 * how-to-read card and the standalone thresholds legend.
 *
 * COLLAPSED BY DEFAULT: a fresh load shows a compact row with the three
 * headline thresholds and a Methodology link; the full three-column
 * explainer expands on click. The open state is deliberately not persisted
 * (and the old localStorage dismissal flag is gone): the published bars stay
 * one click away on every visit, which keeps the transparency claim without
 * front-loading a wall of prose.
 */
export default function HowToReadCard({ hasMovement = true }: { hasMovement?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 border-y border-[var(--border)] py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--navy-2)]"
        >
          How to read Draft Ticker
          <span aria-hidden className="text-[var(--ink-3)]">
            {open ? "▴" : "▾"}
          </span>
        </button>
        <span className="flex items-center gap-x-3 text-xs text-[var(--ink-2)]">
          <span className="tabular-nums">
            Move ≥{THRESHOLDS.HOST_RANK_MOVE} · Expert ≥{THRESHOLDS.ECR_MOVE} · Gap ≥{THRESHOLDS.GAP_NOTABLE}
          </span>
          <Link href="/methodology" className="underline">
            Methodology →
          </Link>
        </span>
      </div>

      {open && (
        <div className="mt-2.5">
          {/* Desktop: the three explanations sit in columns so the explainer
              uses the row instead of stacking into a tall block. Same words,
              same order; below lg it reads exactly as before. */}
          <div className="space-y-1 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:space-y-0">
            <p>
              <span className="font-semibold">Numbers</span> = where the league host
              boards rank him (ADP) vs. where experts rank him (ECR).{" "}
              <span className="font-semibold">Tap any row</span> for what it means.
            </p>
            <p>
              <span className="font-semibold" style={{ color: "var(--pos)" }}>
                Green
              </span>{" "}
              means a discount, the market prices him below the expert rank.{" "}
              <span className="font-semibold" style={{ color: "var(--neg)" }}>
                Red
              </span>{" "}
              means a premium, you pay ahead of it. It applies to the value read
              only, the gap and the rounds figure.
            </p>
            <p>
              <span className="font-semibold">Movement is neutral.</span> An arrow
              shows the direction, because a falling ADP is a falling price, not a bad
              one. Every green or red figure carries a word too, so nothing depends on
              colour alone. Colour on a labelled pill, like a signal chip or the trust
              meter, is just the label&apos;s colour.
            </p>
          </div>
          <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--ink-2)]">
            <span className="font-medium">Thresholds:</span> a move counts at ≥
            {THRESHOLDS.HOST_RANK_MOVE} picks · an expert move at ≥
            {THRESHOLDS.ECR_MOVE} ranks · a gap is notable at ≥
            {THRESHOLDS.GAP_NOTABLE} · both sides clearing their bar in opposite
            directions reads &ldquo;diverging&rdquo; when the gap grew and
            &ldquo;converging&rdquo; when it shrank · gaps only inside the top{" "}
            {UNIVERSE.TOP_N} (both ADP &amp; ECR), ranked by ≥
            {UNIVERSE.MIN_SOURCE_COUNT} host boards
            {!hasMovement && " · movement begins once a second daily snapshot exists"}
            . Full rules on the{" "}
            <Link href="/methodology" className="underline">
              methodology page
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
