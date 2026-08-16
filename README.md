# Draft Ticker

FantasyPros already collects, stores, and even charts this series, a daily
ECR-vs-ADP chart sits on their own player pages. They render it and stop
there. Draft Ticker adds the interpretation layer on top: movement screening,
who-moved-first signals, catalyst annotation, calendar context, and evaluated
explanations: the research desk they never built on their own chart. Built
for redraft players preparing for a scheduled draft.

**Live:** https://draft-ticker.vercel.app

## How data flows

A Vercel cron hits `/api/cron/snapshot` daily at 13:00 UTC (6am PT). It
fetches real ADP from Fantasy Football Calculator (PPR, 12-team), stores
`snapshots/YYYY-MM-DD.json` in Vercel Blob, and appends the day's rows to
a consolidated `history.json`. The Market page always renders the newest
snapshot; every page shows when its data was captured. See
`decisions/ADR-001-snapshot-storage.md` for why files instead of a database.

`/api/snapshots` lists stored days (used for the morning cron check).

## Sources

- Fantasy Football Calculator, ADP (live API)
- FantasyPros, ECR via official API (captured daily by the cron)
- Sleeper, player IDs and metadata (canonical ID space)

Real API responses are saved in `/fixtures` and features are built against
those fixtures first. Live pages never mix fixture and real data unlabeled.

## Market Price Index (concept)

KeepTradeCut owns the year-round price for dynasty; nobody owns it for redraft.
The Index is a first-party market-price primitive: one transparent number for a
player, priced by the liquid market of the moment, draft ADP in the offseason,
in-season ownership once real usage replaces speculation, with FAAB clearing
prices as the tape.

Sequencing is explicit. **v1 is transparent rotation**: one price source at a
time, always disclosed, no weights. A **blended composite is v2**, gated on a
season of validation data to earn the weights; an opaque score is never
presented as current design.

Two regimes: **Draft Market** (Jan–Aug, priced by ADP) and **In-Season Market**
(Sep–Dec, priced by ownership %), handed off at Week 1. Concept page:
`/market-price-index`; pitch: `/inside-fantasypros`.

## In-season roadmap

The market never closes; the price just rotates. In season, ownership % becomes
the price, FAAB clearing bids are the tape, divergences (high roster %, low
start % -> "held but not trusted") are signals, and weekly expert re-ranks are
the continuous second series against it. Same engine, store the series, screen
it, explain it, price it. Pointed at a different liquid market.

### In-season signal family

The signal grammar doesn't change in September; the market it reads does: two
series, who moved first, stated thresholds, one plain line. Two of the eight are
illustrated on the concept page with worked examples (held-but-not-trusted,
paid-before-priced). That page is badged "Concept preview · illustrative data", the figures on it are worked examples, not live readings.
The remaining six, named:

| Signal | Read | Consumer line |
| --- | --- | --- |
| Trusted by the few | modest roster %, very high start % among rosterers | the people who own him already know, check if your league doesn't |
| Crowd moving, experts unmoved | adds spiking while ECR holds flat | most-added player of the day; the experts haven't blinked |
| Experts moving first | ECR/ROS rank rising while adds stay quiet | the rankings moved before your league did; the window is open |
| Churn without consensus | high drops + high adds at once | half the ecosystem is wrong about him, the catalyst log says which half |
| Shrinking but loyal core | roster % decaying, start % high among holders | the ones who kept him keep starting him |
| Fading bid | FAAB prints collapsing week-over-week | the price of hope is dropping |

Every signal carries an **evidence tier**: catalyst-confirmed when a verified
catalyst sits in the window of the move, unexplained otherwise (watch, don't act), shipped on draft-season signals now. And every signal is a **graded
hypothesis**: v2 scores each reading against subsequent price action and on-field
usage, giving the signal family a public track record (a September build, honest
scoring needs a season of outcomes).


## Develop

```
npm install --include=dev
npm run dev
```

Secrets live in `.env.local` (never committed): `FANTASYPROS_API_KEY`,
`CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` (managed by Vercel).
