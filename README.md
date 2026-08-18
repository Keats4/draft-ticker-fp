# Draft Ticker

FantasyPros publishes what a player is worth today. Draft Ticker reads how
that answer is changing.

**Live:** https://draft-ticker-fp.vercel.app

## The two series

The expert line is FantasyPros ECR (Draft PPR consensus). The price line is
FantasyPros' consensus average host rank: the mean of a player's rank across
up to five league host boards. It is an average rank, not a draft position.
Both series come from the official FantasyPros API on one key. Nothing is
scraped.

## What the layer adds

- **Movement screening** against published thresholds: a host rank move
  counts at ≥3 spots, an expert move at ≥2 ranks. The thresholds render in
  the UI legend, and the code marks them reasoned rather than fitted.
- **A six-state classification of which side moved first**: Market moving
  faster, Market catching up to experts, Experts moving first, Market and
  experts converging, Market and experts diverging, Broad agreement. Signals
  are computed only inside the comparison universe: top 200 by both series,
  with a coverage bar of at least four of the five host boards.
- **Dated, sourced catalysts** with an evidence tier that says plainly when
  a move has no documented cause: catalyst-confirmed when a verified event
  sits in the window of the move, unexplained otherwise (watch, don't act).
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
- Findings recorded from the earlier, retired series have not been
  re-measured on this one; `RESEARCH_LOG.md` says which is which.

## Reading further

- [The live site](https://draft-ticker-fp.vercel.app) ·
  [Methodology](https://draft-ticker-fp.vercel.app/methodology) ·
  [Inside FantasyPros](https://draft-ticker-fp.vercel.app/inside-fantasypros)
- `EVALS.md`, the grading bar for generated explanations
- `RESEARCH_LOG.md`, findings and their provenance
- `decisions/`, ADR-001 through ADR-005

## Develop

```
npm install --include=dev
npm run dev
```

Secrets live in `.env.local` (never committed): `FANTASYPROS_API_KEY`,
`CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`.
