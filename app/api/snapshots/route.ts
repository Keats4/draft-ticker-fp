import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import {
  loadLatestTwoEcrSnapshots,
  loadLatestTwoSnapshots,
  signatureAdp,
  signatureEcr,
} from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/** Health output: stored snapshots + a LOUD staleness check comparing the
 *  two most recent stored days of each stream by value signature. If a
 *  day is value-identical to the one before it, a warning is surfaced here
 *  instead of the staleness passing silently. */
export async function GET() {
  try {
    const [adpList, ecrList, twoAdp, twoEcr] = await Promise.all([
      list({ prefix: "snapshots/" }),
      list({ prefix: "ecr/" }),
      loadLatestTwoSnapshots(),
      loadLatestTwoEcrSnapshots(),
    ]);

    const snapshots = adpList.blobs
      .map((b) => ({
        date: b.pathname.replace("snapshots/", "").replace(".json", ""),
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
    if (twoAdp.latest && twoAdp.previous &&
        signatureAdp(twoAdp.latest.rows) === signatureAdp(twoAdp.previous.rows)) {
      warnings.push(
        `STALE ADP: ${twoAdp.latest.date} is value-identical to ${twoAdp.previous.date} (no ADP movement, check the source).`
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
