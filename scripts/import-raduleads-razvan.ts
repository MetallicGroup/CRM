import "dotenv/config";
import fs from "fs";
import Papa from "papaparse";
import { and, like } from "drizzle-orm";
import { db } from "../server/db";
import { clients, users } from "../shared/schema";

const CSV_PATH =
  process.argv[2] ||
  "/Users/danudaniel/Downloads/Radu Garduri_Leads_2026-05-10_2026-05-26 - Sheet1.csv";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "").trim();
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("0")) return "+4" + digits;
  if (digits.length === 9) return "+40" + digits;
  return digits.startsWith("4") ? "+" + digits : digits;
}

async function findRazvanId(): Promise<string> {
  const rows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(and(like(users.firstName, "%Razvan%"), like(users.lastName, "%Rosu%")));

  if (rows.length === 0) {
    throw new Error("Nu s-a găsit agentul Razvan Rosu în baza de date.");
  }
  const razvan = rows[0];
  console.log(`Agent: ${razvan.firstName} ${razvan.lastName} (${razvan.id})`);
  return razvan.id;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Fișier negăsit: ${CSV_PATH}`);
  }

  const agentId = await findRazvanId();
  const content = fs.readFileSync(CSV_PATH, "utf8");

  const parsed = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
    header: false,
  });

  if (parsed.errors.length > 0) {
    console.warn("Avertismente CSV:", parsed.errors.slice(0, 5));
  }

  const rows = parsed.data;
  const dataRows = rows.slice(1); // skip header

  let imported = 0;
  let skipped = 0;
  const phoneSeen = new Map<string, number>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    const nume = (row[0] || "").trim().replace(/_/g, " ");
    let telefon = normalizePhone(row[1] || "");
    const localitate = (row[5] || "").trim().replace(/_/g, " ") || null;

    if (!nume && !telefon) continue;
    if (!telefon || telefon.length < 8) {
      telefon = `N/A-lead-${i + 2}`;
    }

    const baseKey = telefon.replace(/-\d+$/, "");
    const dup = phoneSeen.get(baseKey) || 0;
    if (dup > 0) telefon = `${baseKey}-${dup}`;
    phoneSeen.set(baseKey, dup + 1);

    const finalNume = nume || `Lead fără nume (rând ${i + 2})`;

    try {
      await db.insert(clients).values({
        nume: finalNume,
        telefon,
        localitate,
        judet: null,
        email: null,
        agentId,
        sursa: "FACEBOOK",
        stadiuOferta: "NECONTACTAT",
        categorieProdus: "GARD",
        contactat: false,
        observatiiClient: "Import leads Radu Garduri 2026-05-10 – 2026-05-26",
      });
      imported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Sărit rând ${i + 2} (${finalNume}): ${msg}`);
      skipped++;
    }
  }

  console.log(`\nFinalizat: ${imported} clienți importați, ${skipped} săriți.`);
  console.log(`Total rânduri procesate: ${dataRows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
