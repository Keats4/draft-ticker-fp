#!/usr/bin/env node
/**
 * Backfill the typed host rank series from the stored raw FantasyPros payloads.
 *
 *   adp-fp/<date>.json        raw payload as captured by the cron
 *                             { date, captured_at, source, payload }
 *   host-rank/<date>.json     typed snapshot, the envelope the live capture
 *                             writes (lib/types.ts Snapshot)
 *   host-rank-history.json    flat per player per day rows, rebuilt from every
 *                             typed file, exactly one row set per date
 *
 * Every typed day is derived from the raw file for that date through the SAME
 * converters the cron uses (lib/sources/fantasypros-host-rank.ts), so the
 * series is internally consistent even where a typed file already existed
 * from a manual run. Existing typed files are overwritten on purpose.
 *
 * Usage (from the repo root, token read from .env.local):
 *   node --experimental-strip-types --env-file=.env.local scripts/backfill_host_rank.mjs --dry-run
 *   node --experimental-strip-types --env-file=.env.local scripts/backfill_host_rank.mjs
 *
 * --experimental-strip-types lets Node import the TypeScript converters
 * directly; the file only carries type-only imports, so nothing else is needed.
 * Nothing here touches the cron, the pages or any other code.
 */
import { list, put } from "@vercel/blob";
import {
  FP_HOST_RANK_URL,
  toHostRankMeta,
  toHostRankPlayers,
} from "../lib/sources/fantasypros-host-rank.ts";

const RAW_PREFIX = "adp-fp/";
const TYPED_PREFIX = "host-rank/";
const HISTORY_PATH = "host-rank-history.json";
const DRY = process.argv.includes("--dry-run");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Run with --env-file=.env.local.");
  process.exit(1);
}

/** Cache busted read: a fresh query string per call, and no-store. The blob
 *  CDN has served stale copies before, so nothing here trusts a plain GET. */
async function readJson(url) {
  const bust = `${url.includes("?") ? "&" : "?"}cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await fetch(url + bust, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function putJson(pathname, data) {
  const blob = await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return blob.url;
}

const dateOf = (pathname, prefix) => pathname.slice(prefix.length).replace(/\.json$/, "");

// ---- 1. raw files -----------------------------------------------------------
const rawBlobs = (await listAll(RAW_PREFIX))
  .filter((b) => /^\d{4}-\d{2}-\d{2}\.json$/.test(b.pathname.slice(RAW_PREFIX.length)))
  .sort((a, b) => (a.pathname < b.pathname ? -1 : 1));

if (rawBlobs.length === 0) {
  console.error(`No raw files under ${RAW_PREFIX}. Nothing to do.`);
  process.exit(1);
}

console.log(`${DRY ? "DRY RUN" : "LIVE RUN"}: ${rawBlobs.length} raw file(s) under ${RAW_PREFIX}`);

// ---- 2. convert each raw payload into the typed envelope ---------------------
const typed = [];
for (const b of rawBlobs) {
  const date = dateOf(b.pathname, RAW_PREFIX);
  const raw = await readJson(b.url);
  if (!raw || !raw.payload || !Array.isArray(raw.payload.players)) {
    throw new Error(`${b.pathname}: unexpected shape (expected { date, captured_at, source, payload.players })`);
  }
  if (raw.date && raw.date !== date) {
    throw new Error(`${b.pathname}: file date ${raw.date} does not match pathname date ${date}`);
  }
  const meta = toHostRankMeta(raw.payload);
  const rows = toHostRankPlayers(raw.payload.players);
  const snapshot = {
    date,
    captured_at: raw.captured_at,
    source: raw.source ?? FP_HOST_RANK_URL,
    format: "PPR, average host rank",
    meta,
    rows,
  };
  typed.push({ date, pathname: `${TYPED_PREFIX}${date}.json`, snapshot, rawPath: b.pathname, rawSize: b.size, rawUploadedAt: b.uploadedAt });
  console.log(
    `  ${date}: raw ${b.pathname} (${b.size} B, uploaded ${b.uploadedAt instanceof Date ? b.uploadedAt.toISOString() : b.uploadedAt})` +
      ` -> ${TYPED_PREFIX}${date}.json  rows=${rows.length}  source_count=${meta.source_count}` +
      `  latest_pub_at=${meta.latest_pub_at}  captured_at=${raw.captured_at}`
  );
}

// ---- 3. history: one row set per date, rebuilt from the typed set -----------
const history = [];
for (const t of typed) {
  for (const p of t.snapshot.rows) {
    history.push({
      date: t.date,
      player_id: p.player_id,
      player_name: p.player_name,
      player_position_id: p.player_position_id,
      player_team_id: p.player_team_id,
      rank_ave: p.rank_ave,
      source_count: p.source_count,
    });
  }
}
console.log(`  ${HISTORY_PATH}: ${history.length} rows across ${typed.length} date(s): ${typed.map((t) => t.date).join(", ")}`);

// Existing typed files that have no raw counterpart are reported, not deleted.
const existingTyped = (await listAll(TYPED_PREFIX)).map((b) => dateOf(b.pathname, TYPED_PREFIX));
const orphan = existingTyped.filter((d) => !typed.some((t) => t.date === d));
if (orphan.length) console.log(`  NOTE: typed file(s) with no raw source, left untouched: ${orphan.join(", ")}`);

if (DRY) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

// ---- 4. write, then read every file back cache busted -----------------------
for (const t of typed) {
  const url = await putJson(t.pathname, t.snapshot);
  const back = await readJson(url);
  const ok =
    back.date === t.date &&
    back.rows.length === t.snapshot.rows.length &&
    back.meta.source_count === t.snapshot.meta.source_count &&
    back.captured_at === t.snapshot.captured_at;
  console.log(`  wrote ${t.pathname}: readback ${ok ? "OK" : "MISMATCH"} rows=${back.rows?.length} source_count=${back.meta?.source_count} captured_at=${back.captured_at}`);
  if (!ok) process.exitCode = 2;
}
const histUrl = await putJson(HISTORY_PATH, history);
const histBack = await readJson(histUrl);
const dates = [...new Set(histBack.map((r) => r.date))].sort();
const perDate = Object.fromEntries(dates.map((d) => [d, histBack.filter((r) => r.date === d).length]));
const dupes = new Set();
const seen = new Set();
for (const r of histBack) {
  const k = `${r.date}:${r.player_id}`;
  if (seen.has(k)) dupes.add(k);
  seen.add(k);
}
console.log(`  wrote ${HISTORY_PATH}: readback ${histBack.length} rows, dates ${dates[0]}..${dates[dates.length - 1]} (${dates.length}), per date ${JSON.stringify(perDate)}, duplicate (date, player) keys: ${dupes.size}`);
if (dupes.size) process.exitCode = 2;

// ---- 5. final state ---------------------------------------------------------
const finalTyped = (await listAll(TYPED_PREFIX)).map((b) => dateOf(b.pathname, TYPED_PREFIX)).sort();
console.log(`Typed days now: ${finalTyped.length} (${finalTyped[0]}..${finalTyped[finalTyped.length - 1]}): ${finalTyped.join(", ")}`);
