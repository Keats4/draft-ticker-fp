# Data sources

Last reviewed: 2026-08-18. Every source in use is listed with what we take
from it, how it is captured, and its limits. Sources evaluated and not used
are listed with the reason, so the decision is inspectable.

## In use

### FantasyPros: consensus average host rank (the price)

- **What:** the mean of a player's rank across up to five league host
  boards, captured for PPR. An average rank, not a draft position.
- **How:** official FantasyPros API with an issued key, the same key as ECR.
  `experts=show` adds the per-host rank map and per-host publish times,
  which is where the coverage count and the publish window come from.
  Captured daily at 13:00 UTC by the snapshot cron; the typed snapshot, the
  raw payload exactly as received, and a consolidated history are stored as
  dated blob files.
- **Hosts:** only two of the five are identifiable, RTSports and Sleeper;
  the other three are unnamed by the API.
- **Coverage by format:** five hosts for PPR, three for half-PPR, two for
  standard.
- **Timing:** one host publishes roughly 25 hours behind the others, in
  every format.
- **Limits:** an average over a varying board set, so a host adding or
  dropping a player moves the number without anyone repricing him; movement
  is therefore measured over shared hosts only (`lib/market.ts`).

### FantasyPros: Expert Consensus Rankings (ECR)

- **What:** Draft PPR consensus rank, expert min/max/avg/std.
- **How:** same official API, same key, captured daily by the same cron and
  stored as its own dated snapshot. The capture date is shown wherever ECR
  appears. No scraping, per FantasyPros terms.
- **Limits:** limited public tier (`public_api_limited: true`) may cap
  fields or call volume.

### Sleeper: player identity and metadata

- **What:** canonical player IDs, names, teams, positions, age, experience,
  injury status, and cross-IDs.
- **How:** public players endpoint, pulled on demand (Sleeper asks for at
  most one call per day; we comply). 12,218 players captured 2026-08-10.
- **Limits:** some cross-IDs are null, so joins need the name+team+position
  fallback with logged review.

## History is accumulated, not fetched

No source publishes historical daily values for either series. The history
exists only because the cron captures both series every day: it begins on
the date of the first capture and grows one day at a time. The raw payload
is stored untouched so the typed series can always be rebuilt from source.

## Retired

Fantasy Football Calculator ADP powered the build before 2026-08-16.
Retired with the source swap; its stored snapshots remain in blob storage
and are not read by any page.

## Evaluated, not used

| Source | What it offers | Why not |
| --- | --- | --- |
| ESPN | ADP + ranks from the largest platform | No official public API; community wrappers require user authentication and belong inside platform-sync features, not this pipeline. |
| Yahoo | ADP + ranks, official API | Official OAuth API exists but the auth flow and app review are out of scope; candidate for a later integration. |
| KeepTradeCut (KTC) | Dynasty crowd values | No API; their FAQ permits reference with attribution, not ingestion. Referenced with attribution only, never scraped. |
| The Odds API | Betting lines as a leading indicator | A new paid dependency and a modeling question (lines → fantasy value) this build doesn't answer. Deferred. |

## Rules that apply to every source

- Real API responses are saved to /fixtures before any feature is built
  against them.
- Live pages never mix fixture and real data unlabeled; every surface shows
  the capture time of the newest real row.
- No source is scraped. If an official path doesn't exist, the source is
  referenced with attribution or skipped.
