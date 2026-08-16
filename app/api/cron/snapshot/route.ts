import { NextResponse } from "next/server";
import { fetchFpHostRank, FP_HOST_RANK_URL } from "@/lib/sources/fantasypros-host-rank";
import { fetchFpEcr, FP_URL } from "@/lib/sources/fantasypros";
import {
  hostRankStaleness,
  laDate,
  loadLatestTwoEcrSnapshots,
  loadLatestTwoSnapshots,
  saveEcrSnapshot,
  saveSnapshot,
  signatureEcr,
} from "@/lib/snapshot";
import type { EcrSnapshot, Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Daily job: one primary host rank pull + one ECR pull, both stored as
 *  dated snapshots. Host rank is primary and its failure fails the run; an
 *  ECR failure is reported but does not fail the run. Staleness guard: the
 *  primary is stale when no host has published since the prior stored day
 *  (keyed off the latest host publish time, not our captured-at), or when
 *  values are identical anyway. A stale row is still stored, but flagged
 *  LOUDLY in the response rather than passing silently. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = laDate();
  const captured_at = new Date().toISOString();
  const warnings: string[] = [];

  // prior stored snapshots (before today's save), for the staleness check
  const [{ latest: latestHostRank, previous: prevHostRank }, { latest: latestEcr, previous: prevEcr }] =
    await Promise.all([loadLatestTwoSnapshots(), loadLatestTwoEcrSnapshots()]);
  const priorHostRank = latestHostRank && latestHostRank.date !== date ? latestHostRank : prevHostRank;
  const priorEcr = latestEcr && latestEcr.date !== date ? latestEcr : prevEcr;

  let host_rank: Record<string, unknown>;
  try {
    const { meta, players } = await fetchFpHostRank();
    const { stale, reason } = hostRankStaleness({ meta, rows: players }, priorHostRank);
    if (stale)
      warnings.push(
        `STALE HOST RANK: today's FantasyPros pull is stale against ${priorHostRank!.date} (${reason}). Row stored but flagged.`
      );
    const snapshot: Snapshot = {
      date,
      captured_at,
      source: FP_HOST_RANK_URL,
      format: "PPR, average host rank",
      meta,
      rows: players,
    };
    const url = await saveSnapshot(snapshot);
    host_rank = {
      ok: true,
      rows: players.length,
      source_count: meta.source_count,
      earliest_pub_at: meta.earliest_pub_at,
      latest_pub_at: meta.latest_pub_at,
      stale,
      blob_url: url,
    };
  } catch (err) {
    return NextResponse.json(
      { ok: false, date, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  let ecr: Record<string, unknown>;
  try {
    const payload = await fetchFpEcr();
    const stale = priorEcr ? signatureEcr(payload.rows) === signatureEcr(priorEcr.rows) : false;
    if (stale)
      warnings.push(
        `STALE ECR: today's FantasyPros pull is value-identical to ${priorEcr!.date}, experts may not have re-ranked, or the API is serving cached data. Row stored but flagged.`
      );
    const snapshot: EcrSnapshot = {
      date,
      captured_at,
      source: FP_URL,
      total_experts: payload.total_experts,
      public_api_limited: payload.public_api_limited,
      rows: payload.rows,
    };
    const url = await saveEcrSnapshot(snapshot);
    ecr = { ok: true, rows: payload.rows.length, stale, blob_url: url };
  } catch (err) {
    ecr = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({
    ok: true,
    date,
    stale: warnings.length > 0,
    warnings,
    host_rank,
    ecr,
  });
}
