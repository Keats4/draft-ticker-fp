# Draft Ticker

An interpretation layer on FantasyPros ADP and expert consensus: what moved,
which side moved first, and the documented events near it.

**Live:** https://draft-ticker-fp.vercel.app

## Product thinking

The full reasoning lives in
[docs/PRD.md](docs/PRD.md), a product requirements and decision log covering
the problem and objective, functional requirements and acceptance criteria,
how the interpretation system is validated, the decisions that were reversed
rather than hidden, and the AI layer with its shipping discipline. Start there to
understand why the product is shaped the way it is.

## The two series

The expert line is FantasyPros ECR (Draft PPR consensus). The price line is
FantasyPros' consensus average host rank. Both series come from the official
FantasyPros API on one key.

## What the layer adds

- **Movement screening** against published thresholds: a host rank move
  counts at ≥3 spots, an expert move at ≥2 ranks. The thresholds render in
  the UI legend, and the code marks them reasoned rather than fitted.
- **A seven-state classification of which side moved first**: Market moving
  faster, Market catching up to experts, Experts moving first, Market and
  experts converging, Market and experts diverging, Broad agreement (both
  sides repricing together), and Both holding (neither cleared its bar).
  Signals are computed only inside the comparison universe which is top 200
  by both series.
- **Dated, sourced catalysts** with an evidence tier that says plainly when
  a move has no documented event near it: verified event in window when one
  sits in the window of the move, which also reaches back seven days before
  the window opens, a stated assumption in `lib/evidence.ts`, unexplained
  otherwise (watch, don't act).
- **A twelve-phase market calendar** weighting how much movement is worth by
  time of year.
- **Player archetypes** as context alongside the signal.

## How the data works

A daily cron captures both series plus the raw payload: the typed host rank
snapshot, the ECR snapshot, and the payload exactly as received, stored as
dated files in blob storage, with the day's rows appended to a consolidated
history. Nobody publishes historical daily values for either series, so the
history is accumulated rather than fetched, which is why the series begins
on the date of the first capture and grows one day at a time. The raw
payload exists so the typed series can always be rebuilt from source. See
`decisions/ADR-001-snapshot-storage.md` for why files instead of a database.

## What it is not yet

- The history is days old, so charts are short and moves are small.
- Thresholds are reasoned rather than fitted.
- Calendar phase trust and archetypes are published and displayed but are
  not inputs to the signal computation.
- AI explanation notes are generated and graded but not shipped.
- The in-season half of the Market Price Index is a concept, because roster
  percentage and waiver prices do not exist until Week 1.

## Reading further

- [The live site](https://draft-ticker-fp.vercel.app) ·
  [Methodology](https://draft-ticker-fp.vercel.app/methodology) ·
  [Inside FantasyPros](https://draft-ticker-fp.vercel.app/inside-fantasypros)
- [docs/PRD.md](docs/PRD.md), product requirements and decision log,
  including the major reversals and tradeoffs
- `EVALS.md`, the grading bar for generated explanations
- `RESEARCH_LOG.md`, findings and their provenance
- `decisions/`, ADR-001 through ADR-005

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
