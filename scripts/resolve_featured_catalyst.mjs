#!/usr/bin/env node
/** Apply-time: fill catalysts.json sample-0003 with the computed featured
 *  player (widest |ADP−ECR| gap in the top-100 ADP), from live snapshots.
 *  Deterministic rule, not a hand-pick. */
import { readFileSync, writeFileSync } from "node:fs";

const base = "https://0l6toeq0g7ryhjpa.public.blob.vercel-storage.com/";
const idx = await fetch("https://draft-ticker.vercel.app/api/snapshots").then(
  (r) => r.json()
);
const date = idx.snapshots[0].date;
const [snap, ecr] = await Promise.all([
  fetch(`${base}snapshots/${date}.json`).then((r) => r.json()),
  fetch(`${base}ecr/${date}.json`).then((r) => r.json()),
]);

const map = JSON.parse(readFileSync("data/player_map.json", "utf8"));
const byFfc = {};
for (const e of Object.values(map)) if (e.ffc_id != null) byFfc[e.ffc_id] = e;
const fpById = new Map(ecr.rows.map((r) => [r.player_id, r]));

let best = null;
for (const p of snap.rows.slice(0, 100)) {
  if (!["QB", "RB", "WR", "TE"].includes(p.position)) continue; // match market page rule
  const e = byFfc[p.player_id];
  const fp = e?.fp_id != null ? fpById.get(e.fp_id) : null;
  if (!fp) continue;
  const gap = Math.round((p.adp - fp.rank_ecr) * 10) / 10;
  if (!best || Math.abs(gap) > Math.abs(best.gap)) {
    best = { gap, name: p.name, sleeper_id: e.sleeper_id };
  }
}
if (!best) throw new Error("no featured candidate found");

const cat = JSON.parse(readFileSync("data/catalysts.json", "utf8"));
for (const entry of cat.entries) {
  if (entry.id === "sample-0003") {
    entry.player = { sleeper_id: best.sleeper_id, name: best.name };
  }
}
writeFileSync("data/catalysts.json", JSON.stringify(cat, null, 1));
console.log(
  `featured: ${best.name} (gap ${best.gap}, sleeper ${best.sleeper_id})`
);
