#!/usr/bin/env node
/**
 * Builds the Sleeper-canonical player mapping table. FantasyPros player_id is
 * the only foreign key that matters now: the host rank (price) series and the
 * ECR series share it, so the map exists solely to reach sleeper_id, which is
 * what catalysts, featured and archetypes key on. Never auto-picks an
 * ambiguous match: anything uncertain lands in data/mapping_review.json for
 * human review.
 *
 * Usage: node scripts/build_player_map.mjs
 * Reads:  fixtures/sleeper_players.json, fixtures/fp_ecr.json, fixtures/fp_host_rank.json
 * Writes: data/player_map.json, data/mapping_review.json, data/archetype_review.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’\-]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

// position aliases across sources
const pos = (p) => ({ PK: "K", DST: "DEF", FB: "RB" })[p] ?? p;
// team abbreviation variants across sources (deterministic, not guesses)
const teamAlias = (t) => ({ JAC: "JAX", WSH: "WAS", OAK: "LV", SD: "LAC", STL: "LAR" })[t] ?? t;

const sleeper = JSON.parse(readFileSync("fixtures/sleeper_players.json", "utf8"));
// FantasyPros players: the union of the ECR fixture and the host rank fixture,
// keyed by player_id (both carry player_yahoo_id). Host rank rows take
// precedence because that board is what the product prices.
const fpEcr = JSON.parse(readFileSync("fixtures/fp_ecr.json", "utf8")).players;
const fpHostRank = JSON.parse(readFileSync("fixtures/fp_host_rank.json", "utf8")).players;
const hostRankIds = new Set(fpHostRank.map((p) => p.player_id));
const fpById = new Map();
for (const p of fpEcr) fpById.set(p.player_id, p);
for (const p of fpHostRank) fpById.set(p.player_id, p);
const fp = [...fpById.values()];

// ---- index Sleeper (canonical) ----
const FANTASY_POS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const byYahoo = new Map();
const byNameTeamPos = new Map();
const byNamePos = new Map();
const sleeperById = new Map();

const push = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);

for (const [id, p] of Object.entries(sleeper)) {
  if (!p || typeof p !== "object") continue;
  const position = pos(p.position);
  if (!FANTASY_POS.has(position)) continue;
  const name = p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  const entry = {
    sleeper_id: id,
    name,
    team: p.team ?? null,
    pos: position,
    yahoo_id: p.yahoo_id ?? null,
    status: p.status ?? null,
    search_rank: p.search_rank ?? null,
    years_exp: p.years_exp ?? null,
    age: p.age ?? null,
    injury_status: p.injury_status ?? null,
  };
  sleeperById.set(id, entry);
  if (entry.yahoo_id != null) push(byYahoo, String(entry.yahoo_id), entry);
  const n = norm(name);
  if (entry.team) push(byNameTeamPos, `${n}|${entry.team}|${position}`, entry);
  push(byNamePos, `${n}|${position}`, entry);
}

const review = {
  generated_at: null, // stamped by caller commit; kept stable for diffs
  fp_unmatched: [],
  fp_ambiguous: [],
  team_mismatch: [],
};

function resolve(cands, source, label) {
  if (cands.length === 1) return cands[0];
  if (cands.length > 1) {
    review[`${source}_ambiguous`].push({
      name: label,
      candidates: cands.map((c) => ({
        sleeper_id: c.sleeper_id,
        team: c.team,
        status: c.status,
      })),
    });
  }
  return null;
}

// ---- FP -> Sleeper ----
const fpToSleeper = new Map(); // fp player_id -> {sleeper_id, method}
for (const p of fp) {
  const position = pos(p.player_position_id);
  const label = `${p.player_name} (${position} ${p.player_team_id})`;
  // DEF: map by team abbreviation (Sleeper DEF player_id === team abbr)
  if (position === "DEF") {
    const hit = sleeperById.get(teamAlias(p.player_team_id));
    if (hit && hit.pos === "DEF") {
      fpToSleeper.set(p.player_id, { sleeper_id: hit.sleeper_id, method: "team-def" });
    } else review.fp_unmatched.push(label);
    continue;
  }
  // 1) yahoo id
  if (p.player_yahoo_id) {
    const hits = byYahoo.get(String(p.player_yahoo_id)) ?? [];
    const hit = resolve(hits, "fp", label);
    if (hit) {
      fpToSleeper.set(p.player_id, { sleeper_id: hit.sleeper_id, method: "yahoo_id" });
      continue;
    }
    if (hits.length > 1) continue; // went to review
  }
  // 2) name+team+pos
  const n = norm(p.player_name);
  let hits = byNameTeamPos.get(`${n}|${teamAlias(p.player_team_id)}|${position}`) ?? [];
  let hit = resolve(hits, "fp", label);
  if (hit) {
    fpToSleeper.set(p.player_id, { sleeper_id: hit.sleeper_id, method: "name-team-pos" });
    continue;
  }
  if (hits.length > 1) continue;
  // 3) name+pos (unique only), team drift logged
  hits = byNamePos.get(`${n}|${position}`) ?? [];
  hit = resolve(hits, "fp", label);
  if (hit) {
    fpToSleeper.set(p.player_id, { sleeper_id: hit.sleeper_id, method: "name-pos" });
    review.team_mismatch.push({ source: "fp", name: label, sleeper_team: hit.team });
    continue;
  }
  if (hits.length === 0) review.fp_unmatched.push(label);
}

// ---- combine into canonical map ----
const map = {};
const entryFor = (s) => ({
  sleeper_id: s.sleeper_id,
  name: s.name,
  team: s.team,
  pos: s.pos,
  years_exp: s.years_exp,
  age: s.age,
  injury_status: s.injury_status,
});
for (const [fpId, { sleeper_id, method }] of fpToSleeper) {
  const s = sleeperById.get(sleeper_id);
  map[sleeper_id] ??= entryFor(s);
  map[sleeper_id].fp_id = fpId;
  map[sleeper_id].fp_method = method;
}

// ---- apply human-approved overrides (after automatic matching) ----
let overridesApplied = 0;
try {
  const ov = JSON.parse(readFileSync("data/manual_map_overrides.json", "utf8"));
  for (const [fpId, rule] of Object.entries(ov.fp_to_sleeper ?? {})) {
    const s = sleeperById.get(rule.sleeper_id);
    if (!s) continue;
    map[rule.sleeper_id] ??= entryFor(s);
    map[rule.sleeper_id].fp_id = Number(fpId);
    map[rule.sleeper_id].fp_method = "manual-override";
    // clear from review
    const fpRow = fpById.get(Number(fpId));
    if (fpRow) {
      const label = `${fpRow.player_name} (${pos(fpRow.player_position_id)} ${fpRow.player_team_id})`;
      review.fp_unmatched = review.fp_unmatched.filter((x) => x !== label);
    }
    overridesApplied++;
  }
} catch (e) { console.log("no overrides file:", e.message); }

mkdirSync("data", { recursive: true });
// ---- archetype tags (mirror lib/archetype.ts; keep in sync) ----
function archetypeOf(m) {
  const { pos, years_exp, age, injury_status } = m;
  const SERIOUS = new Set(["IR","Out","PUP","NFI","Doubtful","Suspended","COV"]); // mirror lib/archetype.ts
  if (injury_status && SERIOUS.has(String(injury_status).trim()))
    return { tag: "Injury-Return", reason: `injury_status="${injury_status}"` };
  if (years_exp === 0) {
    if (pos === "WR") return { tag: "Rookie WR", reason: "years_exp=0 WR" };
    if (pos === "RB") return { tag: "Rookie RB", reason: "years_exp=0 RB" };
    return { tag: "Rookie", reason: `years_exp=0 ${pos}` };
  }
  if (years_exp === 1) return { tag: "Sophomore", reason: "years_exp=1" };
  if ((years_exp === 2 || years_exp === 3) && !(age != null && age >= 30))
    return { tag: "Ascending", reason: `years_exp=${years_exp}` };
  if ((years_exp === 4 || years_exp === 5) && !(age != null && age >= 30))
    return { tag: "Prime", reason: `years_exp=${years_exp} age=${age}` };
  if ((years_exp != null && years_exp >= 6) || (age != null && age >= 30))
    return { tag: "Veteran", reason: years_exp >= 6 ? `years_exp=${years_exp}` : `age=${age}` };
  return null;
}
const archReview = [];
for (const e of Object.values(map)) {
  const a = archetypeOf(e);
  if (a) { e.archetype = a.tag; e.archetype_reason = a.reason; }
  else if (e.fp_id != null && hostRankIds.has(e.fp_id)) {
    // only players actually shown (on the host rank board) matter for review
    archReview.push({ sleeper_id: e.sleeper_id, name: e.name, pos: e.pos, years_exp: e.years_exp, age: e.age });
  }
}
writeFileSync("data/archetype_review.json", JSON.stringify({ count: archReview.length, unclassified: archReview }, null, 1));
console.log(`archetype: ${archReview.length} in-pool players unclassified (see data/archetype_review.json)`);

writeFileSync("data/player_map.json", JSON.stringify(map, null, 1));
writeFileSync("data/mapping_review.json", JSON.stringify(review, null, 1));

// ---- report ----
const mappedHostRank = fpHostRank.filter((p) => fpToSleeper.has(p.player_id) || Object.values(map).some((m) => m.fp_id === p.player_id)).length;
console.log(`sleeper fantasy-pos players indexed: ${sleeperById.size}`);
console.log(`fp mapped:  ${fpToSleeper.size}/${fp.length} (+${overridesApplied} override)`);
console.log(`host rank board rows with a sleeper_id: ${mappedHostRank}/${fpHostRank.length}`);
console.log(
  `review: fp_unmatched=${review.fp_unmatched.length} fp_ambiguous=${review.fp_ambiguous.length} ` +
    `team_mismatch=${review.team_mismatch.length}`
);
