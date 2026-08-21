#!/usr/bin/env node
/**
 * Catalyst source checker. A review tool, not a verdict machine.
 *
 * For every entry in data/catalysts.json (live and bench), fetches each URL
 * in sources[] (or source_url when no sources[] block exists) through
 * Firecrawl and reports, per entry: whether the page is reachable, whether
 * the publication date on the page matches the date recorded against that
 * source, whether the event described in the summary appears on the page,
 * and whether the short label is supported by the page.
 *
 * HARD RULE: this script never writes to catalysts.json and never sets,
 * clears, or reads the `verified` flag as an input to anything. Verification
 * stays human. This checks whether a citation holds up; it does not confer
 * trust.
 *
 * Support checking is deterministic token matching (names, numbers,
 * distinctive event words), not semantic judgment. "Partially supported"
 * means a human should look, not that the entry is wrong.
 *
 * Usage:  node scripts/check_catalyst_sources.mjs
 *         (reads FIRECRAWL_API_KEY from the environment or .env.local)
 * Reads:  data/catalysts.json (read only)
 * Writes: source-check-report.md (gitignored) and a stdout summary
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ---- key: environment first, .env.local fallback ----
let KEY = process.env.FIRECRAWL_API_KEY;
if (!KEY && existsSync(".env.local")) {
  const m = /^FIRECRAWL_API_KEY\s*=\s*"?([^"\n]+)"?/m.exec(readFileSync(".env.local", "utf8"));
  if (m) KEY = m[1].trim();
}
if (!KEY) {
  console.error("FIRECRAWL_API_KEY not set (environment or .env.local). Nothing fetched.");
  process.exit(1);
}

// ---- date handling: everything becomes YYYY-MM-DD or null ----
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const pad = (n) => String(n).padStart(2, "0");
const day = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** Every calendar day found in a string, in order. Handles "August 17,
 *  2026", "Aug 17, 2026 at 02:15 PM", "8/17/2026", "2026-08-17" and ISO
 *  timestamps. Returns [] when nothing parses, which is a finding, not an
 *  error. */
function daysIn(text) {
  if (!text) return [];
  const out = [];
  for (const m of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})/g)) out.push(day(m[1], +m[2], +m[3]));
  for (const m of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})/gi))
    out.push(day(m[3], MONTHS[m[1].toLowerCase().slice(0, 4)] ?? MONTHS[m[1].toLowerCase().slice(0, 3)], +m[2]));
  for (const m of text.matchAll(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(20\d{2})/gi))
    out.push(day(m[3], MONTHS[m[2].toLowerCase().slice(0, 3)], +m[1]));
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})/g)) out.push(day(m[3], +m[1], +m[2]));
  return [...new Set(out)];
}

/** Dates a page displays, by channel. Metadata first, then the body's first
 *  chunk (bylines live near the top; deep-body dates are usually other
 *  articles), then the URL path. */
function pageDates(url, meta, markdown) {
  const fromMeta = daysIn(
    [meta?.publishedTime, meta?.["article:published_time"], meta?.["article:modified_time"], meta?.["og:updated_time"], meta?.date]
      .filter(Boolean).join(" ")
  );
  const fromBody = daysIn((markdown ?? "").slice(0, 4000));
  const fromUrl = daysIn(url.replace(/\/(20\d{2})\/(\d{2})\//, "/$1-$2-01/"));
  return { fromMeta, fromBody, fromUrl, all: [...new Set([...fromMeta, ...fromBody, ...fromUrl])] };
}

// ---- token support: deterministic, inspectable ----
const STOP = new Set("the a an and or of in on with for to his him he at is was were are be been after before against into from that this it as by per over out not no yet".split(" "));
function salientTokens(text) {
  const tokens = new Set();
  for (const m of text.matchAll(/\$?\d[\d,.]*/g)) tokens.add(m[0].replace(/[.,]$/, ""));
  for (const w of text.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/)) {
    if (w.length >= 4 && !STOP.has(w)) tokens.add(w);
  }
  return [...tokens];
}
function support(text, page) {
  const hay = page.toLowerCase();
  const tokens = salientTokens(text);
  if (tokens.length === 0) return { score: 1, missing: [] };
  const missing = tokens.filter((t) => !hay.includes(t.toLowerCase()));
  return { score: (tokens.length - missing.length) / tokens.length, missing };
}

// ---- fetch through Firecrawl, one call per unique URL ----
const cache = new Map();
async function scrape(url) {
  if (cache.has(url)) return cache.get(url);
  let result = { ok: false, status: null, markdown: "", meta: null, error: null };
  for (let attempt = 0; attempt < 4 && !result.ok; attempt++) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 30000 }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success && body?.data) {
        result = { ok: true, status: res.status, markdown: body.data.markdown ?? "", meta: body.data.metadata ?? {}, error: null };
      } else {
        result = { ok: false, status: res.status, markdown: "", meta: null, error: body?.error ?? `HTTP ${res.status}` };
      }
    } catch (e) {
      result = { ok: false, status: null, markdown: "", meta: null, error: String(e.message ?? e) };
    }
    if (!result.ok) {
      // The free tier allows roughly ten requests a minute. Honor the
      // server's stated retry window instead of hammering it.
      const ra = /retry after (\d+)s/i.exec(result.error ?? "");
      await new Promise((r) => setTimeout(r, ra ? (Number(ra[1]) + 2) * 1000 : 8000));
    }
  }
  cache.set(url, result);
  await new Promise((r) => setTimeout(r, 6500));
  return result;
}

// ---- run ----
const file = JSON.parse(readFileSync("data/catalysts.json", "utf8"));
const entries = [
  ...file.entries.map((e) => ({ ...e, _bench: false })),
  ...(file.bench ?? []).map((e) => ({ ...e, _bench: true })),
];

const findings = []; // {entry, severity, lines}
const SEV = { DATE: 0, UNREACHABLE: 1, UNSUPPORTED: 2, CLEAN: 3 };

for (const e of entries) {
  const sources = e.sources?.length
    ? e.sources
    : [{ url: e.source_url, outlet: "(source_url, no sources[] block)", date_text: null, kind: null }];
  const lines = [];
  let severity = SEV.CLEAN;
  const bump = (s) => { severity = Math.min(severity, s); };

  let anyPage = "";
  for (const s of sources) {
    const r = await scrape(s.url);
    if (!r.ok) {
      bump(SEV.UNREACHABLE);
      lines.push(`- UNREACHABLE ${s.url} (${r.error})`);
      continue;
    }
    anyPage += "\n" + r.markdown;
    const pd = pageDates(s.url, r.meta, r.markdown);
    const recorded = daysIn(s.date_text ?? "");
    if (recorded.length === 0) {
      if (pd.all.length === 0) {
        lines.push(`- dateless, recorded as such: ${s.url} (no date in metadata, body, or URL; date_text: ${s.date_text ?? "none"})`);
      } else if (s.date_text) {
        lines.push(`- UPGRADE: page now shows ${pd.all.join(", ")} but record says dateless: ${s.url}`);
        bump(SEV.DATE);
      } else {
        lines.push(`- no recorded date_text; page shows ${pd.all.join(", ")}: ${s.url}`);
      }
    } else if (pd.all.length === 0) {
      bump(SEV.DATE);
      lines.push(`- DATE NOT CONFIRMABLE: record says ${recorded.join("/")} but page displays no date on any channel: ${s.url}`);
    } else if (recorded.some((d) => pd.all.includes(d))) {
      lines.push(`- date ok (${recorded.find((d) => pd.all.includes(d))}): ${s.url}`);
    } else {
      bump(SEV.DATE);
      lines.push(`- DATE MISMATCH: record ${recorded.join("/")} vs page ${pd.all.slice(0, 4).join(", ")}: ${s.url}`);
    }
    const eventGapDays = pd.fromMeta[0] || pd.fromBody[0]
      ? Math.round((Date.parse(pd.fromMeta[0] ?? pd.fromBody[0]) - Date.parse(e.date)) / 86400000)
      : null;
    if (eventGapDays !== null && eventGapDays !== 0)
      lines.push(`  (event date ${e.date} vs page date: ${eventGapDays > 0 ? "+" : ""}${eventGapDays}d publish gap, stated not judged)`);
  }

  if (anyPage) {
    const s1 = support(e.summary ?? "", anyPage);
    if (s1.score < 0.5) { bump(SEV.UNSUPPORTED); lines.push(`- SUMMARY WEAKLY SUPPORTED (${Math.round(s1.score * 100)}%), missing: ${s1.missing.slice(0, 8).join(", ")}`); }
    else if (s1.missing.length) lines.push(`- summary supported ${Math.round(s1.score * 100)}%, unmatched tokens: ${s1.missing.slice(0, 6).join(", ")}`);
    else lines.push("- summary fully supported");
    if (e.short_label) {
      const s2 = support(e.short_label, anyPage);
      if (s2.score < 0.5) { bump(SEV.UNSUPPORTED); lines.push(`- LABEL WEAKLY SUPPORTED (${Math.round(s2.score * 100)}%), missing: ${s2.missing.join(", ")}`); }
      else if (s2.missing.length) lines.push(`- label supported ${Math.round(s2.score * 100)}%, unmatched: ${s2.missing.join(", ")}`);
      else lines.push("- label fully supported");
    }
  }
  findings.push({ e, severity, lines });
}

// ---- report ----
const groups = [
  ["Date mismatches and unconfirmable dates", SEV.DATE],
  ["Unreachable sources", SEV.UNREACHABLE],
  ["Summaries or labels the page does not clearly support", SEV.UNSUPPORTED],
  ["Clean", SEV.CLEAN],
];
let md = `# Catalyst source check\n\nGenerated ${new Date().toISOString().slice(0, 16)}Z · ${entries.length} entries · ${cache.size} unique URLs fetched\n\nA review report, not a verdict. Support figures are token matching, not semantic judgment; read before acting. This script never writes to catalysts.json and never touches the verified flag.\n\n`;
for (const [title, sev] of groups) {
  const hits = findings.filter((f) => f.severity === sev);
  md += `## ${title} (${hits.length})\n\n`;
  for (const f of hits) {
    md += `### ${f.e.id} · ${f.e.player.name} · ${f.e.date} · ${f.e.category}${f.e._bench ? " · BENCH" : ""}\n${f.lines.join("\n")}\n\n`;
  }
}
writeFileSync("source-check-report.md", md);
for (const [title, sev] of groups) console.log(`${title}: ${findings.filter((f) => f.severity === sev).length}`);
console.log("\nFull report: source-check-report.md");
