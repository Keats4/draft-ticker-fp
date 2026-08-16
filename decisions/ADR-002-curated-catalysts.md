# ADR-002: Curated catalysts, not automated news analysis

Date: 2026-08-10 · Status: Accepted (per BUILD_BRIEF) · **Amended by ADR-004 (2026-08-12)**

## Context

Players move in drafts because something happened, a depth-chart change,
an injury, first-team reps. The product wants to show *why* a player moved
next to *how much* he moved. Two ways to get that: ingest and analyze news
automatically, or curate catalysts by hand for the players that matter.

## Decision

Catalysts live in a reviewed file: player, date, category, summary, source
URL, and a verified flag. No scraper, no news API, no NLP pipeline.
Unverified items either carry a visible unverified flag or do not ship.

> **Amended 2026-08-12 (ADR-004).** This ADR originally said a human curates
> 8-12 players' catalysts by hand. Sourcing is now agent-assisted: research
> agents find candidate events and confirm each page's date, and a human then
> opens the source and confirms the event before `verified: true` is set.
> Attribution and human verification are unchanged; only the finding step
> changed. See ADR-004 for the three-part definition.

## Why not automated news

- Attribution quality is the product. A wrong "why" is worse than no
  "why", and automated event extraction is wrong too often to sit next to
  numbers we call verified.
- News APIs and scrapers add cost, rate limits, licensing questions, and
  a pipeline to babysit, all for coverage of hundreds of players nobody is
  looking at. The Market page surfaces a handful of movers; hand-curating
  those is an hour a week.
- A curated file with source URLs is auditable line by line. The
  methodology page can point at it without caveats.

## Costs accepted

- Coverage is intentionally thin: most players have no catalyst entry and
  the UI shows a fallback line instead of a reason.
- Curation is manual labor and can lag the news by a day.

## Revisit when

Coverage needs exceed ~25 players per week sustained, or a licensed,
attributable news source with reliable player tagging becomes available
and the eval framework (EVALS.md) exists to grade explanation grounding.
