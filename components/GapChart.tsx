/**
 * The gap over time: average host rank minus ECR on one line, against a zero baseline.
 * This is the product's actual subject. The two-series chart below it is the
 * working that produces this line.
 *
 * Reading rule, stated on the card because sign alone is ambiguous:
 *   above zero  = the market drafts him LATER than experts rank him (discount)
 *   below zero  = the market pays a premium
 *   away from zero = the gap is widening; toward zero = it is closing
 *
 * Orientation note: this chart is NOT inverted. Positive is up, the ordinary
 * reading of a signed value. The two-series chart below IS inverted, because
 * there rank 1 belongs at the top. Two charts on one page with different y
 * conventions is a real trap, so each states its own rule in its caption.
 *
 * Colour, and an honest note about it. Polarity reuses the product's existing
 * pair, --pos above zero and --neg below, because the Gap stat tile directly
 * above this chart already uses exactly that pair; a chart disagreeing with the
 * number beside it would be worse than the problem below. That pair fails CVD
 * separation: scripts/validate_palette.js reports deutan ΔE 4.5 for
 * #15803d against #c0362c, under the 6 to 8 floor, though it passes the
 * lightness band, chroma floor, normal-vision floor (27.5) and contrast.
 * Hue is therefore never the only channel carrying the sign here:
 *   1. vertical position against a labelled zero line is the primary encoding
 *   2. the current value is direct-labelled with its sign and a word
 *   3. the numbers above the plot state the same thing in text
 * The old below-zero hatch texture was retired in the visual-system pass in
 * favour of matched pale washes (both at the same low opacity): the washes
 * are context, never the carrier of the sign, so a reader who cannot
 * separate the two hues still loses no information.
 */
import type { ChartMarker, ChartPoint } from "@/components/PlayerChart";
import { fmtRounds, picksToRounds, roundsPhrase } from "@/lib/rounds";

type Day = { date: string; gap: number };

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : ""}${r}`;
}

export default function GapChart({
  points,
  markers,
  trackingSince,
}: {
  points: ChartPoint[];
  markers: ChartMarker[];
  trackingSince: string;
}) {
  const days: Day[] = points
    .filter((p) => p.hostRank != null && p.ecr != null)
    .map((p) => ({ date: p.date, gap: Math.round((p.hostRank! - p.ecr!) * 10) / 10 }));

  if (days.length === 0) {
    return (
      <figure className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="text-sm text-[var(--ink-3)]">
          No gap to chart yet. A gap needs a stored ADP and a matched expert rank
          on the same day, and this player has no day with both.
        </p>
      </figure>
    );
  }

  const now = days[days.length - 1].gap;
  const then = days[0].gap;
  const delta = Math.round((now - then) * 10) / 10;
  const widened = Math.abs(now) > Math.abs(then);
  const crossedZero = now === 0 || then === 0 || now * then < 0;
  const single = days.length === 1;

  const W = 680;
  const H = 240;
  const M = { top: 24, right: 56, bottom: 32, left: 44 };

  const gaps = days.map((d) => d.gap);
  const rawLo = Math.min(0, ...gaps);
  const rawHi = Math.max(0, ...gaps);
  const pad = Math.max(1.5, (rawHi - rawLo) * 0.18);
  const lo = rawLo - pad;
  const hi = rawHi + pad;

  const x = (i: number) =>
    single
      ? (M.left + (W - M.right)) / 2
      : M.left + (i * (W - M.left - M.right)) / (days.length - 1);
  // positive up: larger value maps to a smaller y
  const y = (v: number) => M.top + ((hi - v) / (hi - lo)) * (H - M.top - M.bottom);
  const yZero = y(0);

  const linePts = days.map((d, i) => `${x(i)},${y(d.gap)}`);
  const linePath = days.length >= 2 ? `M${linePts.join(" L")}` : null;
  const areaPath =
    days.length >= 2
      ? `M${x(0)},${yZero} L${linePts.join(" L")} L${x(days.length - 1)},${yZero} Z`
      : null;

  const ticks = Array.from(new Set([Math.round(hi), 0, Math.round(lo)])).sort((a, b) => b - a);
  const markerByDate = new Map(markers.map((m) => [m.date, m]));

  return (
    <figure className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Gap in rounds, 12 team league</span>
        <span className="text-xs text-[var(--ink-3)]">Positive is up</span>
      </figcaption>

      {/* the plain numbers */}
      <div
        className="mb-3 flex flex-wrap items-end gap-x-8 gap-y-2 rounded-md border px-3 py-2"
        style={{ background: "var(--surface-info-soft)", borderColor: "var(--border-info-soft)" }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-2)]">Gap now</p>
          <p
            className="text-2xl font-semibold tabular-nums"
            style={{ color: now < 0 ? "var(--neg)" : now > 0 ? "var(--pos)" : "var(--ink-2)" }}
          >
            {fmtRounds(now)}
          </p>
          <p className="text-xs text-[var(--ink-3)]">
            {now < 0
              ? `you pay ${roundsPhrase(picksToRounds(now))} early`
              : now > 0
                ? `${roundsPhrase(picksToRounds(now))} later than ranked`
                : "cost matches the rank"}
            {` (${fmt(now)} picks)`}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-2)]">
            Change since {days[0].date.slice(5)}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--text-info)]">
            {single ? "n/a" : fmtRounds(delta)}
          </p>
          <p className="text-xs text-[var(--ink-3)]">
            {single
              ? "one day stored"
              : delta === 0
                ? "unchanged"
                : `${fmtRounds(then)} to ${fmtRounds(now)} rounds`}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-2)]">Direction</p>
          <p className="text-2xl font-semibold text-[var(--text-info)]">
            {single ? "n/a" : delta === 0 ? "flat" : widened ? "widening" : "closing"}
          </p>
          <p className="text-xs text-[var(--ink-3)]">
            {single
              ? "needs a second day"
              : crossedZero && !single
                ? "crossed zero, the sides swapped"
                : widened
                  ? "moving away from zero"
                  : "moving toward zero"}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Value over time: draft cost minus expert rank, in rounds. Currently ${fmtRounds(now)} rounds.`}
        className="w-full"
      >
        <defs>
          <clipPath id="gap-above">
            <rect x="0" y="0" width={W} height={Math.max(0, yZero)} />
          </clipPath>
          <clipPath id="gap-below">
            <rect x="0" y={yZero} width={W} height={Math.max(0, H - yZero)} />
          </clipPath>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "var(--ink-3)" : "#eceef1"}
              strokeWidth="1"
              strokeDasharray={t === 0 ? "4 3" : undefined}
            />
            <text x={M.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)">
              {t === 0 ? "0" : fmtRounds(t)}
            </text>
          </g>
        ))}

        {/* Which side means what. Pinned to the top and bottom of the plot, not
            to the zero line: the direct label for the current value lives in
            the right margin near the line end, and anchoring these to zero put
            the two on top of each other. */}
        <text x={W - M.right - 6} y={M.top + 10} textAnchor="end" fontSize="9" fill="var(--ink-3)">
          discount to the expert rank
        </text>
        <text x={W - M.right - 6} y={H - M.bottom - 6} textAnchor="end" fontSize="9" fill="var(--ink-3)">
          premium over the expert rank
        </text>

        {/* Matched pale washes: context for the sign, deliberately far
            below the navy series in visual weight. */}
        {areaPath && (
          <>
            <path d={areaPath} fill="var(--pos)" fillOpacity="0.06" clipPath="url(#gap-above)" />
            <path d={areaPath} fill="var(--neg)" fillOpacity="0.06" clipPath="url(#gap-below)" />
          </>
        )}
        {linePath && (
          <path d={linePath} fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {days.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.gap)} r="4" fill="var(--navy)" stroke="var(--surface)" strokeWidth="2">
              <title>{`${d.date}, gap ${fmt(d.gap)}`}</title>
            </circle>
            {markerByDate.has(d.date) && (
              <g transform={`translate(${x(i)}, ${M.top - 14})`}>
                <path d="M0 0 L6 6 L0 12 L-6 6 Z" fill="var(--gold)" stroke="var(--surface)" strokeWidth="1">
                  <title>
                    {`${markerByDate.get(d.date)!.sample ? "SAMPLE, not real: " : ""}${markerByDate.get(d.date)!.label}`}
                  </title>
                </path>
                <line x1="0" y1="12" x2="0" y2={y(d.gap) - (M.top - 14) - 6} stroke="var(--gold)" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="2 3" />
              </g>
            )}
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
              {d.date.slice(5)}
            </text>
          </g>
        ))}

        {/* one direct label, on the current value only */}
        <text
          x={x(days.length - 1) + 8}
          y={Math.min(Math.max(y(now) + 4, M.top + 12), H - M.bottom - 2)}
          fontSize="12"
          fontWeight="600"
          fill="var(--ink-2)"
        >
          {fmtRounds(now)}
        </text>
      </svg>

      <p className="mt-2 text-xs text-[var(--ink-2)]">
        Above the line, the market prices him at a discount to the expert rank.
        Below it, at a premium. The line moving away from zero means the disagreement is
        growing.
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-3)]">
        <span>
          {single
            ? `Tracking since ${trackingSince}, one day with both series stored; no history is implied before it.`
            : `Tracking daily since ${trackingSince}. Gap is ADP minus ECR on days where both exist.`}
        </span>
        {markers.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden style={{ color: "var(--gold)" }}>◆</span>
            News on file that day
          </span>
        )}
      </div>

      <details className="mt-2 text-xs text-[var(--ink-2)]">
        <summary className="disclose">Data table</summary>
        <table className="mt-1 w-full text-left">
          <thead>
            <tr>
              <th className="pr-4">Date</th>
              <th className="pr-4">Rounds</th>
              <th className="pr-4">Picks</th>
              <th>Side</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td className="pr-4">{d.date}</td>
                <td className="pr-4 tabular-nums">{fmtRounds(d.gap)}</td>
                <td className="pr-4 tabular-nums">{fmt(d.gap)}</td>
                <td>{d.gap < 0 ? "premium" : d.gap > 0 ? "discount" : "level"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
