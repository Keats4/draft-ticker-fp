# Data sources

Last reviewed: 2026-08-11. Every source in use is listed with what we take
from it, how it is captured, and its limits. Sources we evaluated and chose
not to use are listed with the reason, so the decision is inspectable.

## In use

### Fantasy Football Calculator: ADP
- **What:** Average Draft Position from real mock drafts (PPR, 12-team, 2026).
- **How:** Public JSON API, captured daily at 6:00 AM PT by the snapshot
  cron; stored as dated files (see decisions/ADR-001).
- **Limits:** One mock-draft market, not all drafters; roughly the top 258
  players; no intraday granularity.

### FantasyPros: Expert Consensus Rankings (ECR)
- **What:** Draft PPR consensus rank, expert min/max/avg/std, tiers.
- **How:** Official FantasyPros API with an issued key (limited public
  tier, response flags `public_api_limited: true`). Key lives in
  environment variables only. Current capture: 2026-08-10; daily automated
  capture planned. No scraping, per FantasyPros terms.
- **Limits:** Limited tier may cap fields or call volume; ECR movement
  comparisons require a second capture date before they render.
- **Note:** FantasyPros publishes a daily ECR-vs-ADP time-series chart on
  their own player pages, they render the raw series and leave it as an
  exhibit. Draft Ticker consumes the same consensus and adds what sits on
  top of it: movement screening, who-moved-first signals, catalyst
  annotation, calendar context, and evaluated explanations. We do not claim
  to be the only source of the series; we are the interpretation layer.

### Sleeper: player identity and metadata
- **What:** Canonical player IDs, names, teams, positions, age, experience,
  injury status, and cross-IDs (yahoo, espn, sportradar, gsis, rotowire).
- **How:** Public players endpoint, pulled on demand (Sleeper asks for at
  most one call per day; we comply). 12,218 players captured 2026-08-10.
- **Limits:** Some cross-IDs are null (e.g., missing yahoo_id on active
  players), so joins need the name+team+position fallback with logged
  review, see BUILD_BRIEF player identity rule.

## Evaluated, not used

| Source | What it offers | Why not |
| --- | --- | --- |
| ESPN | ADP + ranks from the largest platform | No official public API; community wrappers require user authentication and belong inside platform-sync features, not an MVP data pipeline. |
| Yahoo | ADP + ranks, official API | Official OAuth API exists but the auth flow and app review are out of MVP scope; candidate for a post-MVP integration. |
| KeepTradeCut (KTC) | Dynasty crowd values | No API; their FAQ permits reference with attribution, not ingestion. Dynasty preview (stage 15) will hand-reference 5–10 values with attribution, never a scraper. |
| The Odds API | Betting lines as a leading indicator of player value | Genuinely interesting signal, but a new paid dependency and a modeling question (lines → fantasy value) the MVP doesn't answer. Deferred. |

## Rules that apply to every source

- Real API responses are saved to /fixtures before any feature is built
  against them.
- Live pages never mix fixture and real data unlabeled; every surface
  shows the capture time of the newest real row.
- No source is scraped. If an official path doesn't exist, the source is
  referenced (with attribution) or skipped.
