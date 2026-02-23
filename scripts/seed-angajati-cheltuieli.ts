/**
 * Adaugă în sistem angajații care trebuie să apară la Cheltuieli > Agent:
 * Raluca, Madalina, Daniel, Iulian, Dana, Kuke, Marian, Laurentiu, Alexandra.
 * Rulează: npx tsx scripts/seed-angajati-cheltuieli.ts
 */
import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const ANGAJATI = [
  { firstName: "Raluca", lastName: "Angajat" },
  { firstName: "Madalina", lastName: "Angajat" },
  { firstName: "Daniel", lastName: "Angajat" },
  { firstName: "Iulian", lastName: "Angajat" },
  { firstName: "Dana", lastName: "Angajat" },
  { firstName: "Kuke", lastName: "Angajat" },
  { firstName: "Marian", lastName: "Angajat" },
  { firstName: "Laurentiu", lastName: "Angajat" },
  { firstName: "Alexandra", lastName: "Angajat" },
];

async function seed() {
  const defaultPassword = "Parola123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  for (const a of ANGAJATI) {
    const email = `${a.firstName.toLowerCase()}@metallicgroup.ro`;
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      console.log(`Există deja: ${a.firstName} ${a.lastName} (${email})`);
      continue;
    }
    await db.insert(users).values({
      email,
      passwordHash,
      firstName: a.firstName,
      lastName: a.lastName,
      role: "AGENT",
      active: true,
    });
    console.log(`Adăugat: ${a.firstName} ${a.lastName} (${email})`);
  }

  console.log("Gata. Parola implicită pentru conturile noi: Parola123!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
