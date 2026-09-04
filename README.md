# Draft Ticker

An independent fantasy football market-intelligence product: what moved,
which side moved first, and the documented events near it.

**Live:** https://draft-ticker-fp.vercel.app

## The problem

Most fantasy research tools show current ADP and current rankings as a
snapshot. They answer what a player costs today, but less clearly how that
cost changed, why it changed, and whether the change deserves attention. A
ten-spot move in June looks the same on a rankings page as a ten-spot move
the day after starters played a real game; a move with a confirmed injury
in its window looks the same as one with no documented event near it. Draft
Ticker makes the path of market movement legible: rolling 7-day movement
against expert consensus, dated and sourced events, and a calendar reading
of how much movement is worth at this point in the year.

## Who it is for

A redraft drafter between June and early September, checking in every few
days as their draft approaches. They leave with a short list of real moves,
an answer on each about which side moved first, a sourced event where one
exists and an explicit absence where it does not.

## Product surfaces

- **Market movers** — the rolling 7-day moves that cleared published
  thresholds, with signals, prices, and evidence.
- **Player market history** — per-player price-vs-consensus charts,
  movement summary, signal, and verified events.
- **Market calendar** — twelve authored phases weighting how much movement
  is worth by time of year.
- **AI-assisted explanations** — generated notes graded against a written
  contract before anything ships (see `EVALS.md`); held back when grading
  finds defects.

## The two series

The expert line is Expert Consensus Rankings (Draft PPR). The price line is
a consensus average of host draft boards. Both series are sourced from the
FantasyPros API under an issued key; full provenance in
[DATA_SOURCES.md](DATA_SOURCES.md). Nothing is scraped.

## Product principles

- **Deterministic where a user acts.** Movement thresholds (host rank ≥3,
  expert ≥2), the seven-state who-moved-first classification, the evidence
  tier, and the comparison universe (top 200 by both series) are published
  rules, not model output.
- **AI where language helps.** Models draft explanation and attribution;
  every generated note is graded against named failure modes before it can
  ship.
- **Evidence or honesty.** A move either shows a verified, dated,
  primary-sourced event inside its window (plus a stated seven-day
  lookback), or it says "unexplained" rather than implying a cause.
- **No causal claims, no predictions, no picks.** The evidence tier reports
  coincidence inside a stated window; nothing forecasts a price or tells
  anyone who to draft.

## How the data works

A daily cron captures both series plus the raw payload: the typed host-rank
snapshot, the ECR snapshot, and the payload exactly as received, stored as
dated files in blob storage, with the day's rows appended to a consolidated
history. Nobody publishes historical daily values for either series, so the
history is accumulated rather than fetched — the series begins at its first
capture and grows one day at a time. The raw payload exists so the typed
series can always be rebuilt from source. See
`decisions/ADR-001-snapshot-storage.md` for why files instead of a
database. Movement uses a rolling seven-calendar-date window once enough
shared history exists (`lib/window.ts`).

## Evaluation framework

Generated explanations are graded against a written contract of named
failure modes (`EVALS.md`); a payload defect found in grading kept the
notes unshipped. A news-lookback study was pre-registered before it ran
(`decisions/ADR-004`), failed its own stated bar, and is written up as a
failure in `RESEARCH_LOG.md`. Findings that reversed the original thesis
are recorded, not rewritten.

## Known limitations

- The history is days old, so charts are short and moves are small.
- Thresholds are reasoned rather than fitted.
- Calendar phase trust and archetypes are published and displayed but are
  not inputs to the signal computation.
- AI explanation notes are generated and graded but not shipped.
- The in-season half of the Market Price Index is a concept, because roster
  percentage and waiver prices do not exist until Week 1.

## Reading further

- [The live site](https://draft-ticker-fp.vercel.app) ·
  [Methodology](https://draft-ticker-fp.vercel.app/methodology)
- [docs/PRD.md](docs/PRD.md), product requirements and decision log,
  including the major reversals and tradeoffs
- `EVALS.md`, the grading bar for generated explanations
- `RESEARCH_LOG.md`, findings and their provenance
- `decisions/`, ADR-001 through ADR-004

## Agent access

A local MCP server in [mcp/](mcp/README.md) exposes the market layer,
movers, player context and verified events, to an agent over stdio.

## Develop

```
npm install --include=dev
npm run dev
```

Secrets live in `.env.local` (never committed): `FANTASYPROS_API_KEY`,
`CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`.

---

Draft Ticker is an independent fantasy football project and is not
affiliated with or endorsed by any fantasy sports platform or data
provider.
