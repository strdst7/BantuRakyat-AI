import { NextResponse } from "next/server";
import { db } from "@/db";
import { fuelPrices } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// Fetches latest fuel prices from data.gov.my (cataloged on PasarAPI.xyz)
// Falls back to cached DB data if API is unreachable
export async function GET() {
  try {
    // Try to fetch fresh data from data.gov.my API
    const res = await fetch("https://api.data.gov.my/data-catalogue?id=fuelprice&limit=1&sort=date@desc", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[0];
        // Cache to DB
        await db.insert(fuelPrices).values({
          date: latest.date,
          ron95: latest.ron95 || null,
          ron97: latest.ron97 || null,
          diesel: latest.diesel || null,
          dieselEastMsia: latest.diesel_eastmsia || null,
        }).onConflictDoNothing();

        return NextResponse.json({
          source: "live",
          date: latest.date,
          ron95: latest.ron95,
          ron97: latest.ron97,
          diesel: latest.diesel,
          dieselEastMsia: latest.diesel_eastmsia,
        });
      }
    }
  } catch (e) {
    console.warn("Failed to fetch live fuel prices, using cache");
  }

  // Fallback: use cached data
  const cached = await db.select().from(fuelPrices).orderBy(desc(fuelPrices.fetchedAt)).limit(1);

  if (cached.length > 0) {
    return NextResponse.json({
      source: "cached",
      date: cached[0].date,
      ron95: cached[0].ron95,
      ron97: cached[0].ron97,
      diesel: cached[0].diesel,
      dieselEastMsia: cached[0].dieselEastMsia,
    });
  }

  return NextResponse.json({
    source: "fallback",
    date: "2026-01-01",
    ron95: 2.05,
    ron97: 3.47,
    diesel: 2.15,
    dieselEastMsia: 2.15,
  });
}
