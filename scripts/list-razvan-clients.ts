import "dotenv/config";
import { db } from "../server/db";
import { clients, users } from "../shared/schema";
import { and, like, eq, desc } from "drizzle-orm";

const NOW = new Date("2026-07-03T00:00:00+03:00");

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toISOString().slice(0, 10);
}

function fmtLei(v: string | null | undefined): string {
  if (!v) return "-";
  const n = parseFloat(v);
  return isNaN(n) ? "-" : n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function clientSince(d: Date | null | undefined): string {
  if (!d) return "-";
  const diff = Math.floor((NOW.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "0 zile";
  if (diff < 30) return `${diff} zile`;
  if (diff < 365) return `${Math.floor(diff / 30)} luni`;
  const y = Math.floor(diff / 365);
  const m = Math.floor((diff % 365) / 30);
  return m > 0 ? `${y} ani ${m} luni` : `${y} ani`;
}

async function main() {
  const [razvan] = await db
    .select()
    .from(users)
    .where(and(like(users.firstName, "%Razvan%"), like(users.lastName, "%Rosu%")));

  if (!razvan) {
    console.error("Razvan Rosu negăsit");
    process.exit(1);
  }

  const rows = await db
    .select({
      nume: clients.nume,
      dataVanzarii: clients.dataVanzarii,
      dataAdaugare: clients.dataAdaugare,
      valoareOferta: clients.valoareOferta,
      stadiuOferta: clients.stadiuOferta,
    })
    .from(clients)
    .where(eq(clients.agentId, razvan.id))
    .orderBy(desc(clients.dataAdaugare));

  console.log(`Agent: ${razvan.firstName} ${razvan.lastName}`);
  console.log(`Total clienți: ${rows.length}\n`);

  for (const r of rows) {
    console.log(
      `${r.nume}\t${fmtDate(r.dataVanzarii)}\t${fmtLei(r.valoareOferta)} LEI\tde ${clientSince(r.dataAdaugare)}\t[${r.stadiuOferta}]`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
