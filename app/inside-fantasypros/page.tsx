import Link from "next/link";
import PlayerChart, { type ChartMarker, type ChartPoint } from "@/components/PlayerChart";

export const dynamic = "force-static";
export const metadata = { title: "Inside FP · Draft Ticker" };

// Illustrative series for the section-1 demo (NOT live data).
const DEMO_POINTS: ChartPoint[] = [
  { date: "07-03", adp: 95, ecr: 92 },
  { date: "07-10", adp: 94, ecr: 92 },
  { date: "07-17", adp: 80, ecr: 90 },
  { date: "07-24", adp: 80, ecr: 89 },
  { date: "07-31", adp: 79, ecr: 88 },
  { date: "08-07", adp: 78, ecr: 88 },
];
const DEMO_MARKERS: ChartMarker[] = [
  { date: "07-17", label: "First-team reps reported (illustrative)", sample: true },
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }}>
      {children}
    </span>
  );
}

function Ships({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-[var(--ink-3)]">
      <span className="font-semibold uppercase tracking-wide">How it ships:</span> {children}
    </p>
  );
}

export default function InsideFP() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Inside FantasyPros</h1>
      <p className="mt-1 text-sm text-[var(--ink-3)]">Written for a FantasyPros product reviewer.</p>

      <section className="mt-5 space-y-3 text-[var(--ink-2)]">
        <p>
          Draft Ticker is built on the official FantasyPros API as a working
          exploration of one idea: what an interpretation layer adds to data
          FantasyPros already collects and charts. Your player pages already
          plot the intrayear ECR-vs-ADP series, two lines and a 5-day moving
          average. This is a demonstration of what reading that series looks
          like: movement screening, who-moved-first signals, catalyst
          annotation, calendar context, and explanations held to an eval bar.
        </p>
        <p className="font-medium text-[var(--foreground)]">
          FantasyPros charts the series; this is what reading it looks like.
        </p>
      </section>

      {/* 1. Reading the chart you already have */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">1 · Reading the chart you already have</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          The same two-series chart on your player pages, with the layer added
          on top: a rule-based signal that names who moved first, catalyst
          markers on the dates that moved the price, a plain “what it means”
          line, and an evidence tier, “catalyst-confirmed” when a verified event
          sits in the window of the move, “unexplained” otherwise (watch, don’t
          act). The chart stops being an exhibit and starts making a claim it can
          back or admit it can’t.
        </p>
        <Ships>internal beta → registered beta → premium with a metered free preview.</Ships>
        <div className="mt-3">
          <div className="mb-2"><Badge>Concept preview · illustrative data</Badge></div>
          <PlayerChart
            points={DEMO_POINTS}
            markers={DEMO_MARKERS}
            trackingSince="the 2025 preseason (illustrative)"
            signal="Market moving faster"
            interpretation="Market jumped ~14 picks on 7/17 while experts moved ~2, repricing him ahead of consensus."
            evidence={{ confirmed: true, label: "Catalyst-confirmed", note: "verified event in the window of the move" }}
          />
        </div>
      </section>

      {/* 2. Expert Edge in My Playbook */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">2 · Expert Edge in My Playbook</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          A weekly personalized module: for a synced roster and waiver pool, the
          spots where expert values most disagree with market prices, three
          buys, three sells, one line of reasoning each. It turns the same
          disagreement signal into a decision surface tied to the user’s own team.
        </p>
        <Ships>internal beta → registered beta → premium with a metered free preview.</Ships>
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold">This week in your Playbook</span>
            <Badge>Illustrative</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--pos)" }}>Buy, experts above market</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li>Player A · <span className="text-[var(--ink-3)]">experts 12 spots higher than his cost, a late-round value.</span></li>
                <li>Player B · <span className="text-[var(--ink-3)]">rising 6 picks/week, experts holding, get ahead of it.</span></li>
                <li>Player C · <span className="text-[var(--ink-3)]">ranked ahead of ADP three weeks running.</span></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--neg)" }}>Sell, market above experts</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li>Player D · <span className="text-[var(--ink-3)]">cost a full round above expert rank, still climbing.</span></li>
                <li>Player E · <span className="text-[var(--ink-3)]">market moved first; experts never followed.</span></li>
                <li>Player F · <span className="text-[var(--ink-3)]">held on your bench but expert value fading.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Market Price Index */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">3 · The Market Price Index</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          A first-party market-price primitive: one transparent, year-round
          number for a player, priced by the liquid market of the moment, draft ADP in the offseason, in-season ownership once real usage
          replaces speculation, with FAAB clearing prices as the tape. KeepTradeCut
          proved a year-round price works for dynasty; nobody owns that primitive
          for redraft. This would be first-party and native to the data you
          already publish.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <span className="font-medium text-[var(--foreground)]">Sequencing, stated plainly:</span> v1
          is transparent rotation, one price source at a time, always disclosed,
          no weights. A blended composite is v2, gated on a season of validation
          data to earn the weights. The product never shows an opaque score as
          current design.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          In season the same grammar reads ownership, starts, FAAB, and adds
          instead of ADP and ECR: the in-season signal family (named in the
          README roadmap). Every signal is a graded hypothesis: a v2 scoring
          layer grades each reading against subsequent price action and on-field
          usage, giving the family a public track record, named unbuilt, because
          honest scoring needs a season of outcomes.
        </p>
        <p className="mt-2 text-xs text-[var(--ink-3)]">
          KeepTradeCut is referenced with attribution as the dynasty analog; no
          KTC data is ingested.
        </p>
        <Ships>internal beta → registered beta → premium with a metered free preview.</Ships>
        <p className="mt-3">
          <Link href="/market-price-index" className="text-sm underline">
            See the two-regime concept page →
          </Link>
        </p>
      </section>

      {/* Closing */}
      <section className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-lg font-semibold">Why these three</h2>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          All three sit on one primitive: a stored, interpreted value series. Once
          you can store the series, screen it, explain it, and price it year-round,
          the reading, the personalized module, and the index are the same engine
          pointed at different surfaces. The eval harness is the quality bar, every advice surface is gated on grounding and directionality before it
          ships, so the interpretation is trustworthy, not just present.
        </p>
      </section>

      <p className="mt-8 text-xs text-[var(--ink-3)]">
        Draft Ticker is a working prototype on the FantasyPros API. <Link href="/methodology" className="underline">Methodology</Link>.
      </p>
    </main>
  );
}
