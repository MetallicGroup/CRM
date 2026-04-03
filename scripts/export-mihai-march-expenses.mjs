import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

function loadEnvFromRoot() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, "..");
  const envPath = path.join(root, ".env");
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
  return root;
}

function normalizeName(name) {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function main() {
  const root = loadEnvFromRoot();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL missing in .env");
  }

  const month = 3;
  const year = 2026;
  const email = "wagner.mihai@metallicgroup.ro";
  const outPath = path.join(root, "mihai_wagner_cheltuieli_martie_2026.json");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    webSocketConstructor: ws,
  });

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      "SELECT id, first_name, last_name, email FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1",
      [email]
    );
    if (userRes.rows.length === 0) {
      throw new Error(`User not found for email ${email}`);
    }
    const user = userRes.rows[0];

    // Base expenses introduced directly on agent
    const entriesRes = await client.query(
      `SELECT
        ca.id,
        ca.data_cheltuiala,
        ca.suma,
        ca.firma,
        ca.descriere,
        ca.category_id,
        cat.name AS categorie,
        subc.name AS subcategorie,
        CASE
          WHEN ca.category_id = 'cat-cota-parte' THEN 'INDIRECTA'
          ELSE 'DIRECTA'
        END AS tip_cheltuiala_raport
      FROM cheltuieli_agent ca
      LEFT JOIN expense_categories cat ON cat.id = ca.category_id
      LEFT JOIN expense_categories subc ON subc.id = ca.subcategory_id
      WHERE ca.agent_id = $1 AND ca.luna = $2 AND ca.an = $3
      ORDER BY ca.data_cheltuiala ASC`,
      [user.id, month, year]
    );

    // Build showroom allocation for Mihai (same logic as financial report)
    const sediiRes = await client.query("SELECT id, nume FROM sedii");
    const agentsRes = await client.query(
      "SELECT id, first_name, last_name FROM users WHERE role = 'AGENT'"
    );
    const sediuExpensesRes = await client.query(
      `SELECT sediu_id, category_id, suma
       FROM cheltuieli_sediu
       WHERE luna = $1 AND an = $2`,
      [month, year]
    );
    const agentExpensesAllRes = await client.query(
      `SELECT agent_id, sediu_id, category_id, suma
       FROM cheltuieli_agent
       WHERE luna = $1 AND an = $2`,
      [month, year]
    );

    const sediiList = sediiRes.rows;
    const agents = agentsRes.rows;

    const centralSediu = sediiList.find(
      (s) =>
        normalizeName(s.nume) === "sediu central bucuresti" ||
        normalizeName(s.nume) === "sediu central (bucuresti)"
    );
    const constantaSediu = sediiList.find(
      (s) => normalizeName(s.nume) === "showroom constanta"
    );
    const giurgiuSediu = sediiList.find(
      (s) => normalizeName(s.nume) === "showroom giurgiu"
    );
    const teleormanSediu = sediiList.find(
      (s) =>
        normalizeName(s.nume) === "showroom teleorman" ||
        normalizeName(s.nume) === "showroom tr"
    );

    const centralAgents = new Set(
      [
        "daniel daniel",
        "raluca raluca",
        "dana dana",
        "madalina madalina",
        "iulian iulian",
        "mihai wagner",
        "dragos frangache",
        "alexandru croitoru",
        "marian costache",
      ].map(normalizeName)
    );
    const constantaAgents = new Set(["oana frangache", "razvan rosu"].map(normalizeName));
    const giurgiuAgents = new Set(["marian toma"].map(normalizeName));
    const teleormanAgents = new Set(["alexandra"].map(normalizeName));

    const agentSediuMap = {};
    for (const agent of agents) {
      const fullName = normalizeName(`${agent.first_name} ${agent.last_name}`);
      let sediuId = null;
      if (centralSediu && centralAgents.has(fullName)) sediuId = centralSediu.id;
      else if (constantaSediu && constantaAgents.has(fullName)) sediuId = constantaSediu.id;
      else if (giurgiuSediu && giurgiuAgents.has(fullName)) sediuId = giurgiuSediu.id;
      else if (teleormanSediu && (teleormanAgents.has(fullName) || normalizeName(agent.first_name) === "alexandra")) {
        sediuId = teleormanSediu.id;
      }
      if (!sediuId && centralSediu) {
        sediuId = centralSediu.id;
      }
      agentSediuMap[agent.id] = sediuId;
    }

    const sediuCentral = sediiList.find((s) => s.nume === "Sediu central București");
    const aliasToCentralIds = new Set(
      sediiList.filter((s) => s.nume === "Showroom București").map((s) => s.id)
    );
    const normalizeSediuId = (id) => {
      if (!id) return id;
      if (sediuCentral && aliasToCentralIds.has(id)) return sediuCentral.id;
      return id;
    };

    const cheltuieliSediuList = sediuExpensesRes.rows.map((e) => ({
      ...e,
      sediu_id: normalizeSediuId(e.sediu_id),
    }));
    const cheltuieliAgentList = agentExpensesAllRes.rows.map((e) => {
      const inferredSediuId = e.sediu_id || (e.agent_id ? agentSediuMap[e.agent_id] : null);
      return {
        ...e,
        sediu_id: normalizeSediuId(inferredSediuId),
      };
    });

    const agentsByShowroom = {};
    for (const agent of agents) {
      const sid = normalizeSediuId(agentSediuMap[agent.id] || null);
      if (!sid) continue;
      if (!agentsByShowroom[sid]) agentsByShowroom[sid] = [];
      agentsByShowroom[sid].push(agent.id);
    }

    const mihaiSediuId = normalizeSediuId(agentSediuMap[user.id] || null);
    let allocatedShowroom = 0;
    if (mihaiSediuId) {
      let totalGeneraleShowroom = 0;
      for (const e of cheltuieliSediuList) {
        if (e.sediu_id === mihaiSediuId && e.category_id === "cat-generale") {
          totalGeneraleShowroom += parseFloat(e.suma || "0");
        }
      }
      for (const e of cheltuieliAgentList) {
        if (e.sediu_id === mihaiSediuId && e.category_id === "cat-generale") {
          totalGeneraleShowroom += parseFloat(e.suma || "0");
        }
      }
      const countAgents = (agentsByShowroom[mihaiSediuId] || []).length;
      if (countAgents > 0) allocatedShowroom = totalGeneraleShowroom / countAgents;
    }

    // Cota parte share (same rule as financial report: doar agenții desemnați)
    let totalCotaParte = 0;
    for (const e of cheltuieliSediuList) {
      if (e.category_id === "cat-cota-parte") totalCotaParte += parseFloat(e.suma || "0");
    }
    for (const e of cheltuieliAgentList) {
      if (e.category_id === "cat-cota-parte") totalCotaParte += parseFloat(e.suma || "0");
    }

    // Marian Toma: inclus până la martie 2026; din aprilie 2026 încolo nu (ca în getFinancialReport).
    const includeMarianTomaCota =
      year < 2026 || (year === 2026 && month < 4);
    const cotaParteBaseNames = [
      "dragos frangache",
      "oana frangache",
      "marian costache",
      "alexandru croitoru",
      "razvan rosu",
      "mihai wagner",
    ];
    if (includeMarianTomaCota) cotaParteBaseNames.push("marian toma");
    const cotaParteAgentsNames = new Set(cotaParteBaseNames.map(normalizeName));
    const cotaParteAgentIds = [];
    for (const a of agents) {
      const fullName = normalizeName(`${a.first_name} ${a.last_name}`);
      if (cotaParteAgentsNames.has(fullName)) cotaParteAgentIds.push(a.id);
    }
    const shareIndirect = totalCotaParte / (cotaParteAgentIds.length || 1);
    const allocatedCotaParte = cotaParteAgentIds.includes(user.id) ? shareIndirect : 0;
    const totalAllocatedIndirect = allocatedShowroom + allocatedCotaParte;

    const byCategoryRes = await client.query(
      `SELECT
        COALESCE(cat.name, '') AS categorie,
        COALESCE(subc.name, '') AS subcategorie,
        CASE
          WHEN ca.category_id = 'cat-cota-parte' THEN 'INDIRECTA'
          ELSE 'DIRECTA'
        END AS tip_cheltuiala_raport,
        COUNT(*)::int AS nr,
        COALESCE(SUM(CAST(ca.suma AS numeric)), 0)::float8 AS total
      FROM cheltuieli_agent ca
      LEFT JOIN expense_categories cat ON cat.id = ca.category_id
      LEFT JOIN expense_categories subc ON subc.id = ca.subcategory_id
      WHERE ca.agent_id = $1 AND ca.luna = $2 AND ca.an = $3
      GROUP BY cat.name, subc.name, ca.category_id
      ORDER BY total DESC`,
      [user.id, month, year]
    );

    const byTypeRes = await client.query(
      `SELECT
        CASE
          WHEN ca.category_id = 'cat-cota-parte' THEN 'INDIRECTA'
          ELSE 'DIRECTA'
        END AS tip_cheltuiala_raport,
        COUNT(*)::int AS nr,
        COALESCE(SUM(CAST(ca.suma AS numeric)), 0)::float8 AS total
      FROM cheltuieli_agent ca
      WHERE ca.agent_id = $1 AND ca.luna = $2 AND ca.an = $3
      GROUP BY CASE
        WHEN ca.category_id = 'cat-cota-parte' THEN 'INDIRECTA'
        ELSE 'DIRECTA'
      END
      ORDER BY tip_cheltuiala_raport ASC`,
      [user.id, month, year]
    );
    const directByTypeMap = Object.fromEntries(
      byTypeRes.rows.map((r) => [r.tip_cheltuiala_raport, r])
    );
    const directRow = directByTypeMap.DIRECTA || { tip_cheltuiala_raport: "DIRECTA", nr: 0, total: 0 };
    const enrichedByType = [
      directRow,
      {
        tip_cheltuiala_raport: "INDIRECTA",
        nr: (allocatedShowroom ? 1 : 0) + (allocatedCotaParte ? 1 : 0),
        total: Number(totalAllocatedIndirect.toFixed(2)),
      },
    ];

    const totalRes = await client.query(
      `SELECT
        COUNT(*)::int AS nr,
        COALESCE(SUM(CAST(suma AS numeric)), 0)::float8 AS total
      FROM cheltuieli_agent
      WHERE agent_id = $1 AND luna = $2 AND an = $3`,
      [user.id, month, year]
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      month,
      year,
      user,
      total: totalRes.rows[0],
      byType: enrichedByType,
      indirectAllocation: {
        showroomAllocation: Number(allocatedShowroom.toFixed(2)),
        cotaParteAllocation: Number(allocatedCotaParte.toFixed(2)),
        totalIndirectAllocation: Number(totalAllocatedIndirect.toFixed(2)),
        showroomId: mihaiSediuId,
      },
      byCategory: byCategoryRes.rows,
      entries: entriesRes.rows,
    };

    writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`Exported JSON: ${outPath}`);
    console.log(`Entries: ${entriesRes.rows.length}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
