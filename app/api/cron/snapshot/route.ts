import { NextResponse } from "next/server";
import { fetchFfcAdp, FFC_URL } from "@/lib/sources/ffc";
import { fetchFpEcr, FP_URL } from "@/lib/sources/fantasypros";
import { fetchFpAdp, FP_ADP_URL } from "@/lib/sources/fantasypros-adp";
import {
  laDate,
  loadLatestTwoEcrSnapshots,
  loadLatestTwoSnapshots,
  saveEcrSnapshot,
  saveFpAdpSnapshot,
  saveSnapshot,
  signatureAdp,
  signatureEcr,
} from "@/lib/snapshot";
import type { EcrSnapshot, Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Daily job: one ADP pull + one ECR pull, both stored as dated
 *  snapshots. ADP is primary, an ECR failure is reported but does not
 *  fail the run. Staleness guard: if a fresh pull's value signature is
 *  identical to the prior stored day, the response says so LOUDLY rather
 *  than storing it silently (the row is still stored, but flagged). */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = laDate();
  const captured_at = new Date().toISOString();
  const warnings: string[] = [];

  /**
   * The parallel FantasyPros composite ADP series. Stored, never read by the
   * product. Its whole contract is that it CANNOT affect anything above it:
   * own try/catch, own timeout, failure is a field in the response body and
   * nothing else. FFC and ECR are captured before this runs and are already
   * written by the time it is called.
   */
  const captureFpAdp = async (): Promise<Record<string, unknown>> => {
    try {
      const payload = await fetchFpAdp();
      const url = await saveFpAdpSnapshot({ date, captured_at, source: FP_ADP_URL, payload });
      return {
        ok: true,
        players: payload.players.length,
        sources: payload.total_experts ?? null,
        source_last_updated: payload.last_updated ?? null,
        blob_url: url,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Logged and dropped. A missing day in a series nothing reads yet is a
      // strictly smaller problem than a cron that stops running.
      console.error(`[cron] FantasyPros ADP capture failed, continuing: ${message}`);
      return { ok: false, error: message };
    }
  };

  /**
   * Backfill hook. `?only=fp-adp` captures ONLY the new series and returns
   * before the FFC/ECR flow below is reached, so a manual backfill can never
   * write an off-schedule FFC snapshot. Same CRON_SECRET gate as the full run.
   */
  if (new URL(req.url).searchParams.get("only") === "fp-adp") {
    return NextResponse.json({ ok: true, date, only: "fp-adp", fp_adp: await captureFpAdp() });
  }

  // prior stored snapshots (before today's save), for the staleness check
  const [{ latest: latestAdp, previous: prevAdp }, { latest: latestEcr, previous: prevEcr }] =
    await Promise.all([loadLatestTwoSnapshots(), loadLatestTwoEcrSnapshots()]);
  const priorAdp = latestAdp && latestAdp.date !== date ? latestAdp : prevAdp;
  const priorEcr = latestEcr && latestEcr.date !== date ? latestEcr : prevEcr;

  let adp: Record<string, unknown>;
  try {
    const { meta, players } = await fetchFfcAdp();
    const stale = priorAdp ? signatureAdp(players) === signatureAdp(priorAdp.rows) : false;
    if (stale)
      warnings.push(
        `STALE ADP: today's FFC pull is value-identical to ${priorAdp!.date}, the source may be serving cached data. Row stored but flagged.`
      );
    const snapshot: Snapshot = { date, captured_at, source: FFC_URL, format: "PPR, 12-team", meta, rows: players };
    const url = await saveSnapshot(snapshot);
    adp = { ok: true, rows: players.length, total_drafts: meta.total_drafts, stale, blob_url: url };
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

  // LAST, and last on purpose. Both existing captures are already written.
  const fp_adp = await captureFpAdp();

  return NextResponse.json({
    ok: true,
    date,
    stale: warnings.length > 0,
    warnings,
    adp,
    ecr,
    fp_adp,
  });
}
