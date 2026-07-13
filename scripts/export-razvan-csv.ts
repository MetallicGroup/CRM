import "dotenv/config";
import fs from "fs";
import { db } from "../server/db";
import { clients, users } from "../shared/schema";
import { and, like, eq, desc } from "drizzle-orm";

const NOW = new Date("2026-07-03T00:00:00+03:00");
const OUT = "attached_assets/razvan-rosu-clienti-2026-07-03.csv";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function fmtLei(v: string | null | undefined): string {
  if (!v) return "";
  const n = parseFloat(v);
  return isNaN(n) ? "" : n.toFixed(2);
}

function clientSince(d: Date | null | undefined): string {
  if (!d) return "";
  const diff = Math.floor((NOW.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "0 zile";
  if (diff < 30) return `${diff} zile`;
  if (diff < 365) return `${Math.floor(diff / 30)} luni`;
  const y = Math.floor(diff / 365);
  const m = Math.floor((diff % 365) / 30);
  return m > 0 ? `${y} ani ${m} luni` : `${y} ani`;
}

function esc(s: string): string {
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const [razvan] = await db
    .select()
    .from(users)
    .where(and(like(users.firstName, "%Razvan%"), like(users.lastName, "%Rosu%")));

  if (!razvan) throw new Error("Razvan Rosu negăsit");

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

  const lines = ["Nr;Nume;Data vanzarii;Suma (LEI);Client de;Stadiu"];
  rows.forEach((r, i) => {
    lines.push(
      [
        String(i + 1),
        esc(r.nume.trim()),
        fmtDate(r.dataVanzarii),
        fmtLei(r.valoareOferta),
        clientSince(r.dataAdaugare),
        r.stadiuOferta || "",
      ].join(";"),
    );
  });

  fs.writeFileSync(OUT, "\uFEFF" + lines.join("\n"), "utf8");
  console.log(`Export: ${OUT} (${rows.length} clienți)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
