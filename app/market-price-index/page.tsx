import Link from "next/link";

export const dynamic = "force-static";
export const metadata = { title: "Market Price Index (Concept) · Draft Ticker" };

/** Concept preview. The full designed treatment (FAAB earnings-style ticks,
 *  divergence callout, regime-handoff annotation, action-layer copy) is the
 *  next build. This page states the concept honestly and shows a simple
 *  two-regime band so the vision is legible. All data illustrative. */
const W = 720, H = 240, PAD = 36;
// illustrative year: value line (lower number = more valuable), inverted axis
const YEAR = [
  { m: "Jan", v: 96 }, { m: "Feb", v: 95 }, { m: "Mar", v: 92 }, { m: "Apr", v: 88 },
  { m: "May", v: 84 }, { m: "Jun", v: 82 }, { m: "Jul", v: 74 }, { m: "Aug", v: 70 },
  { m: "Sep", v: 66 }, { m: "Oct", v: 72 }, { m: "Nov", v: 61 }, { m: "Dec", v: 58 },
];

export default function MarketPriceIndex() {
  const lo = 55, hi = 100;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (YEAR.length - 1);
  const y = (v: number) => PAD + ((v - lo) / (hi - lo)) * (H - 2 * PAD);
  const handoffX = x(8); // Sep = Week 1 handoff
  const linePath = "M" + YEAR.map((p, i) => `${x(i)},${y(p.v)}`).join(" L");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 rounded-md border px-4 py-2 text-sm" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}>
        <span className="font-semibold">Concept preview · illustrative data.</span>{" "}
        Not a live surface. The full designed treatment ships next.
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Market Price Index</h1>
      <p className="mt-2 text-[var(--ink-2)]">
        One transparent, year-round number for a player’s market price, priced
        by the liquid market of the moment. KeepTradeCut owns the year-round
        price for dynasty; nobody owns it for redraft. This is that primitive,
        first-party and native to the series FantasyPros already publishes.
      </p>
      <p className="mt-2 font-medium text-[var(--foreground)]">
        The signal engine doesn’t change in September; the market it reads does.
      </p>

      <figure className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Illustrative year-long market price with two regimes" className="w-full">
          {/* regime bands */}
          <rect x={PAD} y={PAD} width={handoffX - PAD} height={H - 2 * PAD} fill="var(--gold-bg)" opacity="0.6" />
          <rect x={handoffX} y={PAD} width={W - PAD - handoffX} height={H - 2 * PAD} fill="#eef2f7" />
          <text x={(PAD + handoffX) / 2} y={PAD + 14} textAnchor="middle" fontSize="11" fill="var(--ink-2)" fontWeight="600">Draft Market</text>
          <text x={(PAD + handoffX) / 2} y={PAD + 28} textAnchor="middle" fontSize="9" fill="var(--ink-3)">priced by: ADP · Jan–Aug</text>
          <text x={(handoffX + W - PAD) / 2} y={PAD + 14} textAnchor="middle" fontSize="11" fill="var(--ink-2)" fontWeight="600">In-Season Market</text>
          <text x={(handoffX + W - PAD) / 2} y={PAD + 28} textAnchor="middle" fontSize="9" fill="var(--ink-3)">priced by: ownership % · Sep–Dec</text>
          {/* handoff divider */}
          <line x1={handoffX} x2={handoffX} y1={PAD} y2={H - PAD} stroke="var(--navy)" strokeWidth="1" strokeDasharray="4 3" />
          <text x={handoffX + 4} y={H - PAD - 4} fontSize="9" fill="var(--navy)">Week 1 handoff</text>
          {/* value line */}
          <path d={linePath} fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" />
          {/* FAAB clearing-price tick, earnings-date style (in-season, illustrative) */}
          <g transform={`translate(${x(9)}, ${y(YEAR[9].v)})`}>
            <rect x={-4} y={-4} width={8} height={8} fill="var(--gold)" stroke="var(--surface)" strokeWidth="1.5" />
            <line x1={0} y1={6} x2={0} y2={H - PAD - y(YEAR[9].v)} stroke="var(--gold)" strokeWidth="1" strokeDasharray="2 2" />
            <text x={0} y={H - PAD - y(YEAR[9].v) + 12} textAnchor="middle" fontSize="8" fill="var(--gold)" fontWeight="600">FAAB $34</text>
          </g>
          {YEAR.map((p, i) => (
            <text key={p.m} x={x(i)} y={H - PAD + 14} textAnchor="middle" fontSize="9" fill="var(--ink-3)">{p.m}</text>
          ))}
        </svg>
        <figcaption className="mt-2 text-xs text-[var(--ink-3)]">
          Illustrative. A persistent “priced by: [regime]” label rides the line; in the
          in-season band, FAAB clearing prices render as dated, earnings-style ticks, and
          divergences (high roster %, low start % → “held but not trusted”) surface as callouts.
        </figcaption>
      </figure>

      {/* two divergence callouts (illustrative), each carries an evidence tier */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Held but not trusted</p>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--background)", color: "var(--ink-3)", border: "1px solid var(--border)" }}>
              Unexplained, watch
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            High roster %, low start %: the ecosystem won’t drop him but won’t
            play him, conviction without commitment. No verified catalyst in the
            window, so this is a read to watch, not act on.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Paid before priced</p>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "rgba(21,128,61,0.12)", color: "var(--pos)" }}>
              Verified event in window
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            A FAAB print (the gold tick) clears far above the standing ownership
            price, the transaction tape leading the stock price, here backed by a
            documented event. Last night’s auctions repriced him before the slow
            market did.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>Draft market · Jan–Aug</p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">Priced by ADP. Action layer: <span className="font-medium text-[var(--foreground)]">your mocks are stale.</span></p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">In-season market · Sep–Dec</p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">Priced by ownership %, FAAB as the tape. Action layer: <span className="font-medium text-[var(--foreground)]">check your leagues.</span></p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">How the number is built</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          v1 is transparent rotation: one price source at a time, always disclosed
          on the line, no weights. A blended composite is v2, gated on a season
          of validation data to earn the weights. There is never an opaque score
          presented as current design; the price always says what it is priced by.
        </p>
        <p className="mt-3 text-xs text-[var(--ink-3)]">
          KeepTradeCut is referenced with attribution as the dynasty analog; no KTC data is ingested.
        </p>
      </section>

      <p className="mt-8 text-xs text-[var(--ink-3)]">
        <Link href="/inside-fantasypros" className="underline">Inside FP</Link> ·{" "}
        <Link href="/methodology" className="underline">Methodology</Link>
      </p>
    </main>
  );
}
