# ADR-001: Daily snapshot storage on Vercel Blob, not Postgres

Date: 2026-08-10 · Status: Accepted (approved by Navi)

## Context

The product needs a dataset that grows by one row per player per day
(date, player, average host rank, ECR). Scale: ~550-700 players × ~100 days per season, a few MB per year. Reads are: latest day (Market page), latest two days
(movement), and per-player series (charts).

## Decision

Store data in Vercel Blob as JSON files:

- `snapshots/YYYY-MM-DD.json`, one immutable-in-practice file per day,
  written by the daily cron. Re-running a day overwrites idempotently.
- `history.json`, one consolidated file the cron appends each day
  (same-date rows replaced, never duplicated). Every chart and per-player
  query is a single file read.

## Why not Postgres

At this scale SQL adds provisioning, connection config, and schema
migrations without adding capability: movement math is a two-file diff,
and per-player history is one read of history.json. Blob files are also
directly downloadable, which serves the methodology page's transparency
goal ("here is the actual data, byte for byte").

## When this decision should be revisited

A database earns its keep when any of these arrive:

- multiple scoring formats tracked in parallel (standard / half / PPR),
- intraday snapshots (more than one capture per day),
- multi-year history or cross-season queries,
- history.json approaching tens of MB (single-file append gets slow).

None are in the MVP. If one lands on the roadmap, migrate by replaying
the daily snapshot files into a table, they are the system of record.
