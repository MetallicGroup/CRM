/**
 * Suma cheltuielilor care nu se împart la nimeni (fără agent, fără sediu)
 * din ianuarie și februarie.
 * Rulează: npx tsx scripts/undistributed-expenses.ts
 * Necesită DATABASE_URL în .env sau în mediu.
 */
import { db } from "../server/db";
import { cheltuieliAgent } from "../shared/schema";
import { and, isNull, inArray, eq, sql } from "drizzle-orm";

async function main() {
  const years = [2025, 2026];
  for (const an of years) {
    const rows = await db
      .select({
        luna: cheltuieliAgent.luna,
        total: sql<string>`COALESCE(SUM(CAST(${cheltuieliAgent.suma} AS NUMERIC)), 0)`,
      })
      .from(cheltuieliAgent)
      .where(
        and(
          isNull(cheltuieliAgent.agentId),
          isNull(cheltuieliAgent.sediuId),
          eq(cheltuieliAgent.an, an),
          inArray(cheltuieliAgent.luna, [1, 2])
        )
      )
      .groupBy(cheltuieliAgent.luna);

    const ian = rows.find((r) => r.luna === 1);
    const feb = rows.find((r) => r.luna === 2);
    const sIan = parseFloat(ian?.total ?? "0");
    const sFeb = parseFloat(feb?.total ?? "0");
    console.log(`An ${an}:`);
    console.log(`  Ianuarie:  ${sIan.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON`);
    console.log(`  Februarie: ${sFeb.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON`);
    console.log(`  Total:     ${(sIan + sFeb).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
