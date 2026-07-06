import { db } from "@/db";
import { scans } from "@/db/schema";
import { evaluateProfile, normalizeProfile, summarize } from "@/lib/eligibility";
import type { ScanResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const profile = normalizeProfile(body);

    const matches = evaluateProfile(profile);
    const { eligibleCount, totalEstimatedAnnual } = summarize(matches);

    // Best-effort persistence — do not block the response if it fails.
    try {
      await db.insert(scans).values({
        profile,
        matched: matches
          .filter((m) => m.eligible)
          .map((m) => ({
            slug: m.program.slug,
            estimatedAnnual: m.estimatedAnnual,
          })),
        totalEstimatedAnnual: totalEstimatedAnnual.toFixed(2),
        eligibleCount,
      });
    } catch (e) {
      console.error("Failed to persist scan", e);
    }

    const response: ScanResponse = {
      matches,
      totalEstimatedAnnual,
      eligibleCount,
      profile,
    };
    return Response.json(response);
  } catch (err) {
    console.error("Scan failed", err);
    return Response.json({ error: "Gagal memproses imbasan." }, { status: 500 });
  }
}
