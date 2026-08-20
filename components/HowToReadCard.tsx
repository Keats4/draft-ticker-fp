"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { THRESHOLDS } from "@/lib/math";
import { UNIVERSE } from "@/lib/universe";

/** Bumped to v3: the card and the thresholds legend merged into one block.
 *  The old key would leave anyone who dismissed v2 without ever seeing the
 *  merged form. */
const KEY = "dt_howto_market_dismissed_v3";

/**
 * The ONE explainer block on the market page, sitting directly above the
 * table, where the vocabulary is actually used. It merges the old
 * how-to-read card and the standalone thresholds legend. Dismissing it
 * collapses to a single line rather than removing it: the published
 * thresholds stay on the page at all times, which is part of the product's
 * transparency claim, and the block can be reopened from the collapsed line.
 */
export default function HowToReadCard({ hasMovement = true }: { hasMovement?: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };
  const reopen = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setShow(true);
  };

  if (!show) {
    return (
      <p className="mb-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-2)]">
        <span className="font-medium">Thresholds:</span> move ≥
        {THRESHOLDS.HOST_RANK_MOVE} picks · expert ≥{THRESHOLDS.ECR_MOVE} ranks ·
        notable gap ≥{THRESHOLDS.GAP_NOTABLE} · top {UNIVERSE.TOP_N} by both, ≥
        {UNIVERSE.MIN_SOURCE_COUNT} host boards{" "}
        <button onClick={reopen} className="underline">
          how to read this
        </button>{" "}
        · <Link href="/methodology" className="underline">Methodology</Link>
      </p>
    );
  }

  return (
    <div className="relative mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--ink-3)] hover:text-[var(--foreground)]"
      >
        ✕
      </button>
      <p className="font-semibold">How to read this</p>
      <p className="mt-1">
        <span className="font-semibold">Numbers</span> = where the league host
        boards rank him (ADP) vs. where experts rank him (ECR).
      </p>
      <p className="mt-1">
        <span className="font-semibold" style={{ color: "var(--pos)" }}>
          Green
        </span>{" "}
        means good for the drafter, cheaper than the experts rank him.{" "}
        <span className="font-semibold" style={{ color: "var(--neg)" }}>
          Red
        </span>{" "}
        means you are paying up. It applies to the value read only, the gap and
        the rounds figure.
      </p>
      <p className="mt-1">
        <span className="font-semibold">Movement is neutral.</span> An arrow
        shows the direction, because a falling ADP is a falling price, not a bad
        one. Every green or red figure carries a word too, so nothing depends on
        colour alone. Colour on a labelled pill, like a signal chip or the trust
        meter, is just the label&apos;s colour.
      </p>
      <p className="mt-1">
        <span className="font-semibold">Tap any row</span> for what it means.
      </p>
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
  );
}
