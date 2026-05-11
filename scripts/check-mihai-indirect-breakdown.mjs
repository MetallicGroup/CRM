import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  const k = t.slice(0, i);
  const v = t.slice(i + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: ws,
});

const centralNames = [
  "daniel daniel",
  "raluca raluca",
  "dana dana",
  "madalina madalina",
  "iulian iulian",
  "mihai wagner",
  "dragos frangache",
  "alexandru croitoru",
  "marian costache",
];

const cotaNames = [
  "dragos frangache",
  "oana moneaga",
  "marian costache",
  "razvan rosu",
  "alexandru croitoru",
];

const wrapIn = (arr) => arr.map((v) => `'${v}'`).join(", ");

const q = async (sql) => (await pool.query(sql)).rows;

const run = async () => {
  const cotaEntries = await q(`
    SELECT src, id, data_cheltuiala, suma, firma, descriere, category_id, subcategory_id, creator_name
    FROM (
      SELECT
        'cheltuieli_agent'::text AS src,
        ca.id,
        ca.data_cheltuiala,
        ca.suma,
        ca.firma,
        ca.descriere,
        ca.category_id,
        ca.subcategory_id,
        TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS creator_name
      FROM cheltuieli_agent ca
      LEFT JOIN users u ON u.id = ca.agent_id
      WHERE ca.luna = 3 AND ca.an = 2026 AND ca.category_id = 'cat-cota-parte'
      UNION ALL
      SELECT
        'cheltuieli_sediu'::text AS src,
        cs.id,
        cs.data_cheltuiala,
        cs.suma,
        cs.firma,
        cs.descriere,
        cs.category_id,
        cs.subcategory_id,
        s.nume AS creator_name
      FROM cheltuieli_sediu cs
      LEFT JOIN sedii s ON s.id = cs.sediu_id
      WHERE cs.luna = 3 AND cs.an = 2026 AND cs.category_id = 'cat-cota-parte'
    ) t
    ORDER BY data_cheltuiala ASC, id ASC
  `);

  const showroomSediu = await q(`
    SELECT COALESCE(SUM(CAST(suma AS numeric)),0)::float8 AS total
    FROM cheltuieli_sediu
    WHERE luna=3 AND an=2026
      AND category_id='cat-generale'
      AND sediu_id IN ('d0f74c61-a585-47ae-bd06-867ab12ad062','b89c9a41-105b-4195-ad19-46098bbae255')
  `);
  const showroomAgent = await q(`
    SELECT COALESCE(SUM(CAST(ca.suma AS numeric)),0)::float8 AS total
    FROM cheltuieli_agent ca
    LEFT JOIN users u ON u.id = ca.agent_id
    WHERE ca.luna=3 AND ca.an=2026
      AND ca.category_id='cat-generale'
      AND LOWER(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,''))) IN (${wrapIn(centralNames)})
  `);
  const showroomAgentBySediu = await q(`
    SELECT COALESCE(SUM(CAST(suma AS numeric)),0)::float8 AS total
    FROM cheltuieli_agent
    WHERE luna=3 AND an=2026
      AND category_id='cat-generale'
      AND sediu_id IN ('d0f74c61-a585-47ae-bd06-867ab12ad062','b89c9a41-105b-4195-ad19-46098bbae255')
  `);
  const centralAgents = await q(`
    SELECT id, first_name, last_name
    FROM users
    WHERE role='AGENT'
      AND LOWER(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,''))) IN (${wrapIn(centralNames)})
    ORDER BY first_name, last_name
  `);
  const cotaSediu = await q(`
    SELECT COALESCE(SUM(CAST(suma AS numeric)),0)::float8 AS total
    FROM cheltuieli_sediu
    WHERE luna=3 AND an=2026 AND category_id='cat-cota-parte'
  `);
  const cotaAgent = await q(`
    SELECT COALESCE(SUM(CAST(suma AS numeric)),0)::float8 AS total
    FROM cheltuieli_agent
    WHERE luna=3 AND an=2026 AND category_id='cat-cota-parte'
  `);
  const cotaAgents = await q(`
    SELECT id, first_name, last_name
    FROM users
    WHERE role='AGENT'
      AND LOWER(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,''))) IN (${wrapIn(cotaNames)})
    ORDER BY first_name, last_name
  `);

  console.log(
    JSON.stringify(
      {
        showroomSediuGenerale: showroomSediu[0]?.total || 0,
        showroomAgentGenerale: showroomAgent[0]?.total || 0,
        showroomAgentGeneraleBySediu: showroomAgentBySediu[0]?.total || 0,
        centralAgentsCount: centralAgents.length,
        centralAgents,
        cotaSediuTotal: cotaSediu[0]?.total || 0,
        cotaAgentTotal: cotaAgent[0]?.total || 0,
        cotaAgentsCount: cotaAgents.length,
        cotaAgents,
        cotaEntriesCount: cotaEntries.length,
        cotaEntries,
      },
      null,
      2
    )
  );
};

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
