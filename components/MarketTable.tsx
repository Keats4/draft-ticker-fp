"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import type { Signal } from "@/lib/math";
import SignalChip from "@/components/SignalChip";
import InfoDot from "@/components/InfoDot";
import { valueTone, valueWord } from "@/lib/story";

export type RowLite = {
  /** hostRankOrdinal: our ordinal among tracked players. */
  rank: number;
  href: string;
  name: string;
  position: string;
  /** Positional rank from the source payload (e.g. RB4 → 4). */
  posRank: number;
  team: string;
  hostRank: number;
  ecr: number | null;
  gap: number | null;
  gapReason: string | null;
  gapNotable: boolean;
  hostRankDelta: number | null;
  signal: Signal | null;
  whatItMeans: string;
};

/**
 * The gap is a VALUE READ, so it is coloured: green = discount to the expert
 * rank, red = premium. The word ships with the number, so the meaning
 * survives greyscale. No arrow here: an arrow means a change, and the gap is a
 * level, so reusing the glyph would make it mean two things in one row.
 */
function Gap({ v, notable, reason }: { v: number | null; notable: boolean; reason: string | null }) {
  if (v === null)
    return (
      <span className="text-[var(--ink-3)]" title={reason ?? undefined}>–</span>
    );
  const word = valueWord(v);
  return (
    <span
      className="whitespace-nowrap tabular-nums"
      style={{ color: valueTone(v), fontWeight: notable ? 600 : 400 }}
    >
      {v > 0 ? "+" : ""}
      {v}
      {word && <span className="ml-1 text-xs font-normal">{word}</span>}
    </span>
  );
}

/**
 * Movement is NOT coloured. A falling host rank is a falling price, so red here
 * would contradict the value rule one column to the left. Direction is the
 * arrow, which only ever marks a change.
 */
function Move({ v, trackingSince }: { v: number | null; trackingSince?: string | null }) {
  if (v === null)
    return (
      <span
        className="text-[var(--ink-3)]"
        title={`${trackingSince ? `Tracking since ${trackingSince}. ` : ""}Movement appears once the player is ranked by enough of the same host boards on both days of the window.`}
      >
        –
      </span>
    );
  return (
    <span className="whitespace-nowrap tabular-nums text-[var(--foreground)]">
      {v !== 0 && (
        <span aria-hidden className="mr-0.5" style={{ color: "var(--navy)" }}>
          {v > 0 ? "▲" : "▼"}
        </span>
      )}
      {Math.abs(v)}
    </span>
  );
}

const H = {
  hostRank: "ADP: the mean of his rank across the contributing league host boards. An average rank, not a literal draft slot. Lower = ranked earlier.",
  ecr: "Expert Consensus Rank: FantasyPros' aggregated expert ranking. Lower = ranked higher.",
  gap: "ADP minus ECR, in picks, shown only inside the comparison universe (top 200 by both, ranked widely enough to trust). Positive = experts rank him ahead of his cost (value). Negative = market pays ahead of experts.",
  move: "Change in ADP over the move window, in picks. Positive = rising (ranked earlier now).",
  signal: "A rule-based label comparing market movement with expert movement. Click any chip for the exact rule.",
};

export default function MarketTable({
  rows,
  moveLabel = "Move",
  trackingSince = null,
}: {
  rows: RowLite[];
  moveLabel?: string;
  /** Earliest stored host rank date, formatted; derived by the caller, never
   *  hardcoded here. */
  trackingSince?: string | null;
}) {
  const [openRank, setOpenRank] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--background)] text-left text-xs uppercase tracking-wide text-[var(--ink-3)]">
            <th className="px-3 py-2.5">#</th>
            <th className="px-3 py-2.5">Player</th>
            <th className="px-3 py-2.5">Pos</th>
            <th className="hidden px-3 py-2.5 sm:table-cell">Team</th>
            <th className="px-3 py-2.5 text-right">ADP<InfoDot text={H.hostRank} /></th>
            <th className="px-3 py-2.5 text-right">ECR<InfoDot text={H.ecr} /></th>
            <th className="px-3 py-2.5 text-right">Gap<InfoDot text={H.gap} /></th>
            <th className="hidden px-3 py-2.5 text-right sm:table-cell">{moveLabel}<InfoDot text={H.move} /></th>
            <th className="px-3 py-2.5">Signal<InfoDot text={H.signal} /></th>
            <th className="px-3 py-2.5" aria-label="expand" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = openRank === r.rank;
            return (
              <Fragment key={r.rank}>
                <tr
                  className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]"
                  onClick={() => setOpenRank(isOpen ? null : r.rank)}
                >
                  <td className="px-3 py-2.5 tabular-nums text-[var(--ink-3)]">{r.rank}</td>
                  <td className="px-3 py-2.5 font-semibold">
                    <Link href={r.href} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{r.position}{r.posRank}</td>
                  <td className="hidden px-3 py-2.5 text-[var(--ink-2)] sm:table-cell">{r.team}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.hostRank}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.ecr ?? <span className="text-[var(--ink-3)]">–</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Gap v={r.gap} notable={r.gapNotable} reason={r.gapReason} />
                  </td>
                  <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                    <Move v={r.hostRankDelta} trackingSince={trackingSince} />
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <SignalChip signal={r.signal} />
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink-3)]">{isOpen ? "▲" : "▼"}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={10} className="px-0 py-0">
                      <div
                        className="border-b border-[var(--gold-border)] px-4 py-3 text-sm"
                        style={{ background: "var(--gold-bg)" }}
                      >
                        <span className="font-semibold">What it means: </span>
                        {r.whatItMeans}{" "}
                        <Link href={r.href} className="underline" onClick={(e) => e.stopPropagation()}>
                          Open {r.name}&apos;s page →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
