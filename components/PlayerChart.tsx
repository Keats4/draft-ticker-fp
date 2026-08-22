/**
 * Server-rendered SVG: average host rank + ECR by date on an inverted rank axis
 * (rank 1 at top = more valuable), with a shaded disagreement band and
 * catalyst diamond markers. Honest at one day: a dot and a note, never a
 * fabricated line or simulated history.
 *
 * Interpretation rule (positioning): this card is NEVER bare. FantasyPros
 * renders the same two-series chart and stops; ours always carries the
 * signal chip + the current "what it means" line + catalyst markers. That
 * strip is the visible product difference.
 *
 * variant="mini" renders the plot ALONE (band and markers included, no strip,
 * legend, footer or table). It exists for the homepage hero card, which
 * composes the chip, badge and sentence itself in a specified order. The plot
 * itself is shared so the two surfaces can never disagree about the data.
 *
 * Palette: validated reference palette, navy #16233d (market),
 * gold #e0a92e (experts). Text uses ink tokens, not series colors.
 */
import SignalChip from "@/components/SignalChip";
import type { Signal } from "@/lib/math";
import type { Evidence } from "@/lib/evidence";

export type ChartPoint = { date: string; hostRank: number | null; ecr: number | null };
export type ChartMarker = { date: string; label: string; sample: boolean };

export default function PlayerChart({
  points,
  markers,
  trackingSince,
  signal = null,
  interpretation = null,
  evidence = null,
  title = "Market vs. Experts: interpreted",
  variant = "full",
}: {
  points: ChartPoint[];
  markers: ChartMarker[];
  trackingSince: string;
  signal?: Signal | null;
  interpretation?: string | null;
  evidence?: Evidence | null;
  title?: string;
  variant?: "full" | "mini";
}) {
  const mini = variant === "mini";
  const W = 680;
  const H = mini ? 190 : 300;
  const M = mini
    ? { top: 16, right: 14, bottom: 24, left: 34 }
    : { top: 22, right: 20, bottom: 30, left: 42 };

  const days = points.filter((p) => p.hostRank != null || p.ecr != null);
  const values = days.flatMap((p) =>
    [p.hostRank, p.ecr].filter((v): v is number => v != null)
  );
  if (days.length === 0 || values.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-8 text-center text-sm text-[var(--ink-3)]">
        No stored history for this player yet. Tracking begins with the next
        daily snapshot.
      </div>
    );
  }

  const lo = Math.max(1, Math.floor(Math.min(...values)) - 4);
  const hi = Math.ceil(Math.max(...values)) + 4;
  const x = (i: number) =>
    days.length === 1
      ? (M.left + (W - M.right)) / 2
      : M.left + (i * (W - M.left - M.right)) / (days.length - 1);
  const y = (v: number) => M.top + ((v - lo) / (hi - lo)) * (H - M.top - M.bottom);

  const line = (key: "hostRank" | "ecr") => {
    const pts = days
      .map((p, i) => (p[key] != null ? `${x(i)},${y(p[key]!)}` : null))
      .filter(Boolean);
    return pts.length >= 2 ? `M${pts.join(" L")}` : null;
  };
  const hostRankLine = line("hostRank");
  const ecrLine = line("ecr");
  const hasEcr = days.some((p) => p.ecr != null);

  const bothIdx = days
    .map((p, i) => (p.hostRank != null && p.ecr != null ? i : -1))
    .filter((i) => i >= 0);
  let band: string | null = null;
  if (bothIdx.length >= 2) {
    const top = bothIdx.map((i) => `${x(i)},${y(days[i].hostRank!)}`);
    const bot = bothIdx.slice().reverse().map((i) => `${x(i)},${y(days[i].ecr!)}`);
    band = `M${top.join(" L")} L${bot.join(" L")} Z`;
  }

  const markerByDate = new Map(markers.map((m) => [m.date, m]));
  // The legend must describe what THIS chart actually renders: an event
  // marker plots only when its date is inside the plotted series, so the
  // legend keys off the plotted count, never the player's full event list.
  // Events outside the domain stay in the evidence rail; nothing is moved
  // to the nearest datapoint and the series is never extended for them.
  const plottedMarkerCount = days.filter((p) => markerByDate.has(p.date)).length;

  const plot = (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ADP and ECR by date" className="w-full">
      {[lo, Math.round((lo + hi) / 2), hi].map((t) => (
        <g key={t}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#eceef1" strokeWidth="1" />
          <text x={M.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)">{t}</text>
        </g>
      ))}
      {band && <path d={band} fill="var(--gold-bg)" stroke="none" />}
      {ecrLine && <path d={ecrLine} fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />}
      {hostRankLine && <path d={hostRankLine} fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" />}
      {days.map((p, i) => (
        <g key={p.date}>
          {p.ecr != null && (
            <circle cx={x(i)} cy={y(p.ecr)} r="3.5" fill="var(--gold)" stroke="var(--surface)" strokeWidth="1.5">
              <title>{`${p.date}, ECR ${p.ecr}`}</title>
            </circle>
          )}
          {p.hostRank != null && (
            <circle cx={x(i)} cy={y(p.hostRank)} r="4" fill="var(--navy)" stroke="var(--surface)" strokeWidth="1.5">
              <title>{`${p.date}, ADP ${p.hostRank}`}</title>
            </circle>
          )}
          {markerByDate.has(p.date) && (
            <g>
              {/* Documented event: gold evidence language, a thin guide down
                  the plot plus a diamond, visually distinct from the data
                  series points. Tooltip carries date + headline. */}
              <line
                x1={x(i)}
                x2={x(i)}
                y1={M.top + 8}
                y2={H - M.bottom}
                stroke="var(--gold)"
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity="0.8"
              />
              <g transform={`translate(${x(i)}, ${M.top - 6})`}>
                <path d="M0 0 L7 7 L0 14 L-7 7 Z" fill="var(--gold)" stroke="var(--surface)" strokeWidth="1.5">
                  <title>{`${p.date} · ${markerByDate.get(p.date)!.sample ? "SAMPLE: not real: " : ""}${markerByDate.get(p.date)!.label}`}</title>
                </path>
              </g>
            </g>
          )}
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{p.date.slice(5)}</text>
        </g>
      ))}
      {days.length === 1 && days[0].hostRank != null && (
        <text x={x(0)} y={y(days[0].hostRank) - 12} textAnchor="middle" fontSize="11" fill="var(--ink-2)">ADP {days[0].hostRank}</text>
      )}
    </svg>
  );

  if (mini) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
        {plot}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-0.5 text-[11px] text-[var(--ink-3)]">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: "var(--navy)" }} />
              Market
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4"
                style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--gold) 0 4px, transparent 4px 7px)" }}
              />
              Experts
            </span>
            {band && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }} />
                Disagreement
              </span>
            )}
            {/* Legend truthfulness: "Event" appears only when a marker is
                actually plotted in this chart's date range. */}
            {plottedMarkerCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden style={{ color: "var(--gold)" }}>◆</span>
                Event
              </span>
            )}
          </span>
          <span>Up = more valuable</span>
        </div>
      </div>
    );
  }

  return (
    <figure className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <figcaption className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-[var(--ink-3)]">Up = more valuable</span>
      </figcaption>

      {/* interpretation strip, the layer FantasyPros' own chart doesn't carry */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
        <SignalChip signal={signal} />
        {signal && evidence && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            title={evidence.note}
            style={
              evidence.confirmed
                ? { background: "rgba(21,128,61,0.12)", color: "var(--pos)" }
                : { background: "var(--background)", color: "var(--ink-3)", border: "1px solid var(--border)" }
            }
          >
            {evidence.label}
          </span>
        )}
        <span className="text-xs text-[var(--ink-2)]">
          {interpretation ?? "Movement and signal appear once a second daily snapshot exists."}
        </span>
      </div>

      <div className="mb-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ background: "var(--navy)" }} />
          Market (ADP)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--gold) 0 4px, transparent 4px 7px)" }}
          />
          Experts (ECR)
        </span>
        {plottedMarkerCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden style={{ color: "var(--gold)" }}>◆</span>
            Event
          </span>
        )}
      </div>

      {plot}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-3)]">
        <span>
          {days.length === 1
            ? `Tracking since ${trackingSince}, one day stored; no history is implied before it.`
            : `Tracking daily since ${trackingSince}.`}
        </span>
        {band && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }} />
            Shaded band = live disagreement
          </span>
        )}
      </div>

      <details className="mt-2 text-xs text-[var(--ink-3)]">
        <summary className="cursor-pointer">Data table</summary>
        <table className="mt-1 w-full text-left">
          <thead><tr><th className="pr-4">Date</th><th className="pr-4">ADP</th><th>ECR</th></tr></thead>
          <tbody>
            {days.map((p) => (
              <tr key={p.date}><td className="pr-4">{p.date}</td><td className="pr-4">{p.hostRank ?? "–"}</td><td>{p.ecr ?? "–"}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
      {!hasEcr && (
        <p className="mt-1 text-xs text-[var(--ink-3)]">
          ECR line appears once a matched expert rank is stored for this player.
        </p>
      )}
    </figure>
  );
}
