import "dotenv/config";
import fs from "fs";
import XLSX from "xlsx";
import { and, eq, like } from "drizzle-orm";
import { db } from "../server/db";
import { clients, users } from "../shared/schema";

const XLSX_PATH =
  process.argv[2] ||
  "/Users/danudaniel/Downloads/Foaie de calcul fără titlu.xlsx";

function normalizePhone(raw: string): string {
  let s = (raw || "").trim();
  if (s.startsWith("p:")) s = s.slice(2);
  const digits = s.replace(/[^\d+]/g, "").trim();
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
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Fișier negăsit: ${XLSX_PATH}`);
  }

  const agentId = await findRazvanId();
  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][];

  const dataRows = data.slice(1);
  let imported = 0;
  let skipped = 0;
  let duplicateInFile = 0;
  const phoneSeen = new Map<string, number>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    const nume = String(row[0] || "").trim();
    let telefon = normalizePhone(String(row[1] || ""));

    if (!nume && !telefon) continue;
    if (!telefon || telefon.length < 8) {
      telefon = `N/A-lead-xlsx-${i + 2}`;
    }

    const baseKey = telefon.replace(/-\d+$/, "");
    const dupInFile = phoneSeen.get(baseKey) || 0;
    if (dupInFile > 0) {
      telefon = `${baseKey}-${dupInFile}`;
      duplicateInFile++;
    }
    phoneSeen.set(baseKey, dupInFile + 1);

    const finalNume = nume || `Lead fără nume (rând ${i + 2})`;

    const existing = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.telefon, baseKey))
      .limit(1);

    if (existing.length > 0 && telefon === baseKey) {
      skipped++;
      continue;
    }

    try {
      await db.insert(clients).values({
        nume: finalNume,
        telefon,
        localitate: null,
        judet: null,
        email: null,
        agentId,
        sursa: "FACEBOOK",
        stadiuOferta: "NECONTACTAT",
        categorieProdus: "GARD",
        contactat: false,
        observatiiClient: "Import leads Excel Foaie de calcul fără titlu",
      });
      imported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Sărit rând ${i + 2} (${finalNume}): ${msg}`);
      skipped++;
    }
  }

  console.log(`\nFinalizat: ${imported} clienți importați, ${skipped} săriți (existau deja în CRM).`);
  console.log(`Duplicate telefon în fișier: ${duplicateInFile}`);
  console.log(`Total rânduri procesate: ${dataRows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
