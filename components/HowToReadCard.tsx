"use client";

import { useEffect, useState } from "react";

/** Bumped to v2 with the single colour semantic. The old card stated the
 *  previous rule ("green and red = who's moving"), so anyone who had dismissed
 *  v1 would never be shown the rule that replaced it. */
const KEY = "dt_howto_market_dismissed_v2";

/** Dismissible 3-line "how to read this" card. Shows on first visit,
 *  hidden thereafter (localStorage). Deployed app, not an artifact. */
export default function HowToReadCard() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  return (
    <div className="relative mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--ink-3)] hover:text-[var(--foreground)]"
      >
        ✕
      </button>
      <p>
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
        colour alone.
      </p>
      <p className="mt-1 text-[var(--ink-2)]">
        Colour on a number means something. Colour on a labelled pill, like a
        signal chip, an evidence badge or the trust meter, is just the
        label&apos;s colour, and the label already says it in words.
      </p>
      <p className="mt-1">
        <span className="font-semibold">Tap any row</span> for what it means.
      </p>
    </div>
  );
}
