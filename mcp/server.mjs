#!/usr/bin/env node
/**
 * draft-ticker-mcp: a read-only Model Context Protocol server exposing
 * Draft Ticker's market layer to an agent over stdio. Demo artifact.
 *
 * ISOLATION: this project imports nothing from draft-ticker-fp. Every rule
 * below is a COPY of the product's logic (source file noted per function)
 * and can drift from the source of truth. Reads public URLs only; writes
 * nothing anywhere.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BLOB = "https://0l6toeq0g7ryhjpa.public.blob.vercel-storage.com";
const REPO = "https://raw.githubusercontent.com/Keats4/draft-ticker-fp/master";

// Published bars, copied from lib/math.ts THRESHOLDS and lib/universe.ts.
const HOST_RANK_MOVE = 3;
const ECR_MOVE = 2;
const TOP_N = 200;
const MIN_SOURCE_COUNT = 4;
const CATALYST_LOOKBACK_DAYS = 7; // lib/evidence.ts
const TRACKED = new Set(["QB", "RB", "WR", "TE"]);

const round1 = (n) => Math.round(n * 10) / 10;

// ---- fetch layer: cache-busted every read (the CDN has served stale
// copies before), with a short in-memory TTL so one conversation's tool
// calls do not refetch.
const cache = new Map();
async function getJson(url, { ttlMs = 60_000, optional = false } = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data;
  const bust = `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await fetch(bust, { cache: "no-store" });
  if (!res.ok) {
    if (optional) return null;
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  const data = await res.json();
  cache.set(url, { at: Date.now(), data });
  return data;
}

// ---- shared window clamp, copied from lib/snapshot.ts loadSharedWindow:
// the movement window is the span BOTH series cover, oldest shared date to
// newest shared date. Dates are enumerated from the public history file
// (the blob list API needs a token; the history file does not) and each
// candidate ECR file is probed, since ECR days can be missing.
async function loadWindow() {
  const history = await getJson(`${BLOB}/host-rank-history.json`);
  const hostDates = [...new Set(history.map((r) => r.date))].sort();
  const shared = [];
  for (const d of hostDates) {
    const ecr = await getJson(`${BLOB}/ecr/${d}.json`, { optional: true });
    if (ecr) shared.push(d);
  }
  if (shared.length < 2) throw new Error("fewer than two shared dates stored");
  const start = shared[0];
  const end = shared[shared.length - 1];
  const [hostFirst, hostLatest, ecrFirst, ecrLatest] = await Promise.all([
    getJson(`${BLOB}/host-rank/${start}.json`),
    getJson(`${BLOB}/host-rank/${end}.json`),
    getJson(`${BLOB}/ecr/${start}.json`),
    getJson(`${BLOB}/ecr/${end}.json`),
  ]);
  return { start, end, hostFirst, hostLatest, ecrFirst, ecrLatest };
}

// ---- shared host delta, copied from lib/market.ts sharedHostDelta: the
// price is a mean over a varying board set, so the delta is computed only
// over host boards present on BOTH days; fewer than four shared boards
// yields null, never a raw difference.
function sharedHostDelta(current, previous) {
  if (!previous) return null;
  const cur = current.experts ?? {};
  const prev = previous.experts ?? {};
  const shared = Object.keys(prev).filter((h) => cur[h] !== undefined);
  if (shared.length < MIN_SOURCE_COUNT) return null;
  const mean = (m) => shared.reduce((s, h) => s + m[h], 0) / shared.length;
  return round1(mean(prev) - mean(cur));
}

// ---- signal branch order, copied from lib/math.ts signalLabel, including
// the Broad agreement / Both holding split.
function signalLabel({ hostRankDelta, ecrDelta, gap }) {
  if (hostRankDelta == null || ecrDelta == null) return null;
  const m = Math.abs(hostRankDelta) >= HOST_RANK_MOVE;
  const x = Math.abs(ecrDelta) >= ECR_MOVE;
  const same = hostRankDelta * ecrDelta > 0;
  if (m && x && same) {
    return Math.abs(hostRankDelta) >= Math.abs(ecrDelta) * 1.5
      ? "Market moving faster"
      : "Broad agreement";
  }
  if (m && x) {
    const prior = gap != null ? gap + hostRankDelta - ecrDelta : null;
    const narrowing = prior != null && Math.abs(gap) < Math.abs(prior);
    return narrowing ? "Market and experts converging" : "Market and experts diverging";
  }
  if (m && !x) {
    const closing = gap != null && Math.abs(gap) < Math.abs(gap + hostRankDelta);
    return closing ? "Market catching up to experts" : "Market moving faster";
  }
  if (!m && x) return "Experts moving first";
  return "Both holding";
}

// ---- evidence window, copied from lib/evidence.ts: a verified, non-sample
// catalyst counts when it falls inside the window or the seven-day lookback
// before it. Temporal association, never causation.
function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function inMoveWindow(catalystDate, startDate, endDate) {
  return catalystDate >= addDays(startDate, -(CATALYST_LOOKBACK_DAYS - 1)) && catalystDate <= endDate;
}

// ---- archetype rules v2, copied from lib/archetype.ts buildArchetypes:
// overrides first, then Injured, Promoted, the RB and WR price-gap roles,
// then Rookie. Display only in the product; reported as context here.
const SERIOUS_INJURY = new Set(["IR", "Out", "PUP", "NFI", "Doubtful", "Suspended", "COV"]);
const GAPS = { RB_ROLE: 30, WR_ROLE: 20, WR_ALPHA_PRICE: 24 };
function buildArchetypes(players, overridesBySleeper) {
  const rooms = new Map();
  for (const p of players) {
    if (p.team === "FA") continue;
    const k = `${p.team}|${p.position}`;
    (rooms.get(k) ?? rooms.set(k, []).get(k)).push(p);
  }
  for (const g of rooms.values()) g.sort((a, b) => a.adp - b.adp);
  const injured = new Set();
  for (const p of players) {
    const ov = p.sleeperId ? overridesBySleeper.get(p.sleeperId) : undefined;
    const isInjured = ov
      ? ov.tag === "Injured"
      : !!(p.injury_status && SERIOUS_INJURY.has(String(p.injury_status).trim()));
    if (isInjured) injured.add(p.id);
  }
  const promotedBy = new Map();
  for (const g of rooms.values()) {
    for (const inj of g) {
      if (!injured.has(inj.id)) continue;
      const heir = g.find(
        (t) => t.adp > inj.adp && !injured.has(t.id) && !(t.sleeperId && overridesBySleeper.has(t.sleeperId))
      );
      if (heir && !promotedBy.has(heir.id)) promotedBy.set(heir.id, inj);
    }
  }
  const out = new Map();
  for (const p of players) {
    const ov = p.sleeperId ? overridesBySleeper.get(p.sleeperId) : undefined;
    if (ov) {
      if (ov.tag) out.set(p.id, ov.tag);
      continue;
    }
    if (p.injury_status && SERIOUS_INJURY.has(String(p.injury_status).trim())) {
      out.set(p.id, "Injured");
      continue;
    }
    let role = null;
    const room = p.team === "FA" ? undefined : rooms.get(`${p.team}|${p.position}`);
    if (room && promotedBy.get(p.id)) role = "Promoted";
    if (!role && room && p.position === "RB") {
      const idx = room.indexOf(p);
      const leader = room[0];
      if (idx === 0) {
        const next = room.length > 1 ? room[1].adp - p.adp : Infinity;
        role = next >= GAPS.RB_ROLE ? "Lead back" : "Committee";
      } else {
        const behind = p.adp - leader.adp;
        if (idx === 1) role = behind >= GAPS.RB_ROLE ? "Handcuff" : "Committee";
        else if (behind < GAPS.RB_ROLE) role = "Committee";
      }
    } else if (!role && p.position === "WR" && p.adp <= GAPS.WR_ALPHA_PRICE) {
      role = "Alpha receiver";
    } else if (!role && room && p.position === "WR") {
      const idx = room.indexOf(p);
      if (idx === 0 && (room.length === 1 || room[1].adp - p.adp >= GAPS.WR_ROLE)) role = "Alpha receiver";
    }
    if (!role && p.years_exp === 0) role = "Rookie";
    if (role) out.set(p.id, role);
  }
  return out;
}

// ---- calendar phase from dates, copied from lib/phases.ts: dates are the
// only thing that decides which phase is current; the trust reading is
// silent at medium.
const TRUST_LABEL = { low: "Low", med: null, high: "High", vhigh: "Very high" };
function currentPhase(phases, todayIso) {
  const hit = phases.find((p) => todayIso >= p.start && todayIso <= p.end);
  if (hit) return { phase: hit, inGap: false };
  const past = phases.filter((p) => p.end < todayIso);
  return { phase: past[past.length - 1] ?? null, inGap: true };
}

// ---- assemble market rows, copied from lib/market.ts buildMarketRows:
// universe filter (top 200 by both, at least four boards), gap only inside
// it, signal only when comparable.
async function loadMarket() {
  const [win, catalystsFile, phasesFile, overridesFile, playerMap] = await Promise.all([
    loadWindow(),
    getJson(`${REPO}/data/catalysts.json`),
    getJson(`${REPO}/data/calendar_phases.json`),
    getJson(`${REPO}/data/archetype_overrides.json`),
    getJson(`${REPO}/data/player_map.json`),
  ]);
  const overridesBySleeper = new Map((overridesFile.overrides ?? []).map((o) => [o.sleeper_id, o]));
  const mapEntries = Object.values(playerMap);
  const sleeperByFp = new Map(mapEntries.filter((e) => e.fp_id != null).map((e) => [e.fp_id, e]));
  const prevById = new Map(win.hostFirst.rows.map((p) => [p.player_id, p]));
  const ecrNow = new Map(win.ecrLatest.rows.map((r) => [r.player_id, r.rank_ecr]));
  const ecrPrev = new Map(win.ecrFirst.rows.map((r) => [r.player_id, r.rank_ecr]));

  const ordered = win.hostLatest.rows
    .filter((p) => TRACKED.has(p.player_position_id))
    .sort((a, b) => a.rank_ave - b.rank_ave);

  const rows = ordered.map((p, i) => {
    const ord = i + 1;
    const entry = sleeperByFp.get(p.player_id);
    const ecr = ecrNow.get(p.player_id) ?? null;
    const prevEcr = ecrPrev.get(p.player_id) ?? null;
    const inUniverse = ord <= TOP_N && p.source_count >= MIN_SOURCE_COUNT;
    const comparable = inUniverse && ecr != null && ecr <= TOP_N;
    const gap = comparable ? round1(p.rank_ave - ecr) : null;
    const hostRankDelta = sharedHostDelta(p, prevById.get(p.player_id) ?? null);
    const ecrDelta = ecr != null && prevEcr != null ? round1(prevEcr - ecr) : null;
    const signal = comparable ? signalLabel({ hostRankDelta, ecrDelta, gap }) : null;
    return {
      fpId: p.player_id,
      sleeperId: entry?.sleeper_id ?? null,
      name: p.player_name,
      position: p.player_position_id,
      team: p.player_team_id,
      adp: p.rank_ave,
      ord,
      ecr,
      gap,
      hostRankDelta,
      ecrDelta,
      signal,
      years_exp: entry?.years_exp ?? null,
      injury_status: entry?.injury_status ?? null,
    };
  });

  const archetypes = buildArchetypes(
    rows.map((r) => ({
      id: r.fpId,
      sleeperId: r.sleeperId,
      position: r.position,
      team: r.team,
      adp: r.adp,
      years_exp: r.years_exp,
      injury_status: r.injury_status,
    })),
    overridesBySleeper
  );

  const verified = (catalystsFile.entries ?? []).filter((c) => c.verified && !c.sample);
  const inWindow = verified
    .filter((c) => inMoveWindow(c.date, win.start, win.end))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const eventsBySleeper = new Map();
  for (const c of inWindow) {
    const k = c.player.sleeper_id;
    (eventsBySleeper.get(k) ?? eventsBySleeper.set(k, []).get(k)).push(c);
  }
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  const { phase, inGap } = currentPhase(phasesFile.phases, todayIso);
  return { win, rows, archetypes, inWindow, eventsBySleeper, phase, inGap };
}

const evidenceState = (events) =>
  events && events.length > 0
    ? "verified event in window"
    : "unexplained (watch, do not act)";

const shape = (r, mkt) => ({
  name: r.name,
  position: r.position,
  team: r.team,
  window: `${mkt.win.start} to ${mkt.win.end}`,
  price_move_picks: r.hostRankDelta,
  expert_move_ranks: r.ecrDelta,
  signal: r.signal,
  evidence: evidenceState(r.sleeperId ? mkt.eventsBySleeper.get(r.sleeperId) : null),
  archetype: mkt.archetypes.get(r.fpId) ?? null,
});

// ---- the server ----
const server = new McpServer({ name: "draft-ticker", version: "0.1.0" });

server.registerTool(
  "get_market_movers",
  {
    description:
      "Players whose price movement cleared Draft Ticker's published bar (3 picks) over the current shared window, with the move, the expert move, the signal label, the evidence state and the archetype. Structured facts only; the evidence state reports temporal association, never causation.",
    inputSchema: {},
  },
  async () => {
    const mkt = await loadMarket();
    const movers = mkt.rows
      .filter((r) => r.hostRankDelta != null && Math.abs(r.hostRankDelta) >= HOST_RANK_MOVE && r.ord <= TOP_N && r.signal != null)
      .sort((a, b) => Math.abs(b.hostRankDelta) - Math.abs(a.hostRankDelta))
      .map((r) => shape(r, mkt));
    return { content: [{ type: "text", text: JSON.stringify({ window: `${mkt.win.start} to ${mkt.win.end}`, count: movers.length, movers }, null, 2) }] };
  }
);

server.registerTool(
  "get_player_market_context",
  {
    description:
      "Full market context for one player by name: move, expert move, signal, evidence state, archetype, ADP-ECR gap, the current calendar phase with its trust reading, and any verified events inside the move window with dates and source URLs.",
    inputSchema: { name: z.string().describe("Player name, case-insensitive, partial ok") },
  },
  async ({ name }) => {
    const mkt = await loadMarket();
    const q = name.trim().toLowerCase();
    const r =
      mkt.rows.find((x) => x.name.toLowerCase() === q) ??
      mkt.rows.find((x) => x.name.toLowerCase().includes(q));
    if (!r) return { content: [{ type: "text", text: JSON.stringify({ error: `no tracked player matches "${name}"` }) }] };
    const events = (r.sleeperId ? mkt.eventsBySleeper.get(r.sleeperId) : null) ?? [];
    const trust = mkt.phase ? TRUST_LABEL[mkt.phase.signal_level] ?? null : null;
    const out = {
      ...shape(r, mkt),
      adp: r.adp,
      ecr: r.ecr,
      gap: r.gap,
      gap_reading: r.gap == null ? null : r.gap > 0 ? "discount to the expert rank" : r.gap < 0 ? "premium over the expert rank" : "level",
      calendar_phase: mkt.phase ? { title: mkt.phase.title, trust: trust, note: trust === null ? "trust renders nothing at medium" : mkt.phase.card_line, in_gap: mkt.inGap } : null,
      verified_events_in_window: events.map((c) => ({ date: c.date, label: c.short_label ?? null, summary: c.summary, source_url: c.source_url })),
    };
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }
);

server.registerTool(
  "get_recent_events",
  {
    description:
      "Verified events inside the current move window (including the seven-day lookback), newest first: player, date, short label and primary source URL.",
    inputSchema: {},
  },
  async () => {
    const mkt = await loadMarket();
    const events = mkt.inWindow.map((c) => ({
      player: c.player.name,
      date: c.date,
      label: c.short_label ?? null,
      source_url: c.source_url,
    }));
    return { content: [{ type: "text", text: JSON.stringify({ window: `${mkt.win.start} to ${mkt.win.end}`, count: events.length, events }, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
