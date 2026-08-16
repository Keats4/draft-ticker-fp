import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import {
  hostRankStaleness,
  loadLatestTwoEcrSnapshots,
  loadLatestTwoSnapshots,
  signatureEcr,
} from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/** Health output: stored snapshots + a LOUD staleness check comparing the
 *  two most recent stored days of each stream. The primary host rank series
 *  is stale when the newer day's latest host publish time is not after the
 *  older day's, or the values are identical; ECR is compared by value
 *  signature. A warning is surfaced here instead of passing silently. */
export async function GET() {
  try {
    const [hostRankList, ecrList, twoHostRank, twoEcr] = await Promise.all([
      list({ prefix: "host-rank/" }),
      list({ prefix: "ecr/" }),
      loadLatestTwoSnapshots(),
      loadLatestTwoEcrSnapshots(),
    ]);

    const snapshots = hostRankList.blobs
      .map((b) => ({
        date: b.pathname.replace("host-rank/", "").replace(".json", ""),
        size_bytes: b.size,
        uploaded_at: b.uploadedAt,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const ecr_snapshots = ecrList.blobs
      .map((b) => ({
        date: b.pathname.replace("ecr/", "").replace(".json", ""),
        size_bytes: b.size,
        uploaded_at: b.uploadedAt,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const warnings: string[] = [];
    if (twoHostRank.latest && twoHostRank.previous) {
      const { stale, reason } = hostRankStaleness(twoHostRank.latest, twoHostRank.previous);
      if (stale)
        warnings.push(
          `STALE HOST RANK: ${twoHostRank.latest.date} is stale against ${twoHostRank.previous.date} (${reason}).`
        );
    }
    if (twoEcr.latest && twoEcr.previous &&
        signatureEcr(twoEcr.latest.rows) === signatureEcr(twoEcr.previous.rows)) {
      warnings.push(
        `STALE ECR: ${twoEcr.latest.date} is value-identical to ${twoEcr.previous.date} (experts unchanged, or cached API).`
      );
    }

    return NextResponse.json({
      count: snapshots.length,
      stale: warnings.length > 0,
      warnings,
      latest_pub_at: twoHostRank.latest?.meta.latest_pub_at ?? null,
      snapshots,
      ecr_snapshots,
    });
  } catch {
    return NextResponse.json(
      { count: 0, snapshots: [], error: "blob storage unavailable" },
      { status: 500 }
    );
  }
}
