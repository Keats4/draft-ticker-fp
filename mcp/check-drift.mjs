#!/usr/bin/env node
/**
 * Drift check: fails (exit 1) if the threshold values ported into
 * server.mjs no longer match the source of truth in ../lib/math.ts and
 * ../lib/universe.ts (plus the evidence lookback in ../lib/evidence.ts).
 *
 * Values only. Branch logic drift is not detectable here; if lib/math.ts
 * changes its branch order, server.mjs must be re-ported by hand.
 *
 * Usage: node mcp/check-drift.mjs   (from the repository root)
 *    or: npm run check-drift        (from mcp/)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), "utf8");

const grab = (src, pattern, label) => {
  const m = pattern.exec(src);
  if (!m) throw new Error(`could not find ${label}`);
  return Number(m[1]);
};

const math = read("../lib/math.ts");
const universe = read("../lib/universe.ts");
const evidence = read("../lib/evidence.ts");
const windowSrc = read("../lib/window.ts");
const server = read("./server.mjs");

const truth = {
  HOST_RANK_MOVE: grab(math, /HOST_RANK_MOVE:\s*(\d+(?:\.\d+)?)/, "lib/math.ts HOST_RANK_MOVE"),
  ECR_MOVE: grab(math, /ECR_MOVE:\s*(\d+(?:\.\d+)?)/, "lib/math.ts ECR_MOVE"),
  TOP_N: grab(universe, /TOP_N:\s*(\d+)/, "lib/universe.ts TOP_N"),
  MIN_SOURCE_COUNT: grab(universe, /MIN_SOURCE_COUNT:\s*(\d+)/, "lib/universe.ts MIN_SOURCE_COUNT"),
  CATALYST_LOOKBACK_DAYS: grab(evidence, /CATALYST_LOOKBACK_DAYS\s*=\s*(\d+)/, "lib/evidence.ts CATALYST_LOOKBACK_DAYS"),
  MOVE_WINDOW_DAYS: grab(windowSrc, /MOVE_WINDOW_DAYS\s*=\s*(\d+)/, "lib/window.ts MOVE_WINDOW_DAYS"),
};
const ported = {
  HOST_RANK_MOVE: grab(server, /const HOST_RANK_MOVE\s*=\s*(\d+(?:\.\d+)?)/, "server.mjs HOST_RANK_MOVE"),
  ECR_MOVE: grab(server, /const ECR_MOVE\s*=\s*(\d+(?:\.\d+)?)/, "server.mjs ECR_MOVE"),
  TOP_N: grab(server, /const TOP_N\s*=\s*(\d+)/, "server.mjs TOP_N"),
  MIN_SOURCE_COUNT: grab(server, /const MIN_SOURCE_COUNT\s*=\s*(\d+)/, "server.mjs MIN_SOURCE_COUNT"),
  CATALYST_LOOKBACK_DAYS: grab(server, /const CATALYST_LOOKBACK_DAYS\s*=\s*(\d+)/, "server.mjs CATALYST_LOOKBACK_DAYS"),
  MOVE_WINDOW_DAYS: grab(server, /const MOVE_WINDOW_DAYS\s*=\s*(\d+)/, "server.mjs MOVE_WINDOW_DAYS"),
};

let failed = false;
for (const key of Object.keys(truth)) {
  const ok = truth[key] === ported[key];
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "DRIFT"} ${key}: source ${truth[key]} vs ported ${ported[key]}`);
}
if (failed) {
  console.error("\nDrift detected: re-port the values in mcp/server.mjs from the source files.");
  process.exit(1);
}
console.log("\nNo value drift. Branch logic is not checked; re-port by hand if lib/math.ts changes.");
