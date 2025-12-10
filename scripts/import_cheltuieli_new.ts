import XLSX from 'xlsx';
import { pool } from '../server/db';

interface CheltuialaAgent {
  agentId: string;
  categoryId: number;
  subcategoryId: number;
  suma: number;
  descriere: string;
  data: string;
  luna: number;
  an: number;
}

interface CheltuialaSediu {
  sediuId: number;
  categoryId: number;
  subcategoryId: number;
  suma: number;
  descriere: string;
  data: string;
  luna: number;
  an: number;
}

const AGENT_MAP: Record<string, string> = {};
const SEDIU_MAP: Record<string, number> = {};

const CATEGORY_MAP: Record<string, { catId: number; subId: number }> = {
  'combustibil': { catId: 1, subId: 1 },
  'service': { catId: 1, subId: 2 },
  'revizii': { catId: 1, subId: 2 },
  'asigurare': { catId: 1, subId: 3 },
  'leasing': { catId: 1, subId: 4 },
  'rovinieta': { catId: 1, subId: 5 },
  'rovigneta': { catId: 1, subId: 5 },
  'itp': { catId: 1, subId: 6 },
  'parcare': { catId: 1, subId: 7 },
  
  'salariu': { catId: 2, subId: 8 },
  'salariu brut': { catId: 2, subId: 8 },
  'bonuri masa': { catId: 2, subId: 9 },
  'bonuri de masa': { catId: 2, subId: 9 },
  'tichete': { catId: 2, subId: 9 },
  'comision': { catId: 2, subId: 10 },
  'bonus': { catId: 2, subId: 10 },
  'prime': { catId: 2, subId: 10 },
  
  'marketing': { catId: 3, subId: 11 },
  'publicitate': { catId: 3, subId: 11 },
  'contabilitate': { catId: 3, subId: 12 },
  'protectie muncii': { catId: 3, subId: 13 },
  'ssm': { catId: 3, subId: 13 },
  'mentenanta site': { catId: 3, subId: 14 },
  'it': { catId: 3, subId: 14 },
  'abonamente': { catId: 3, subId: 15 },
  'telefon': { catId: 3, subId: 15 },
  'subscriptii': { catId: 3, subId: 15 },
  
  'chirie': { catId: 4, subId: 16 },
  'utilitati': { catId: 4, subId: 17 },
  'curent': { catId: 4, subId: 17 },
  'gaz': { catId: 4, subId: 17 },
  'apa': { catId: 4, subId: 17 },
  'consumabile': { catId: 4, subId: 18 },
  'materiale': { catId: 4, subId: 18 },
  'curatenie': { catId: 4, subId: 19 },
  'intretinere': { catId: 4, subId: 20 },
  'reparatii': { catId: 4, subId: 20 },
};

function parseValue(val: any): number {
  if (!val) return 0;
  const str = String(val).replace(/[^\d.,\-]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseDate(val: any): { date: string; luna: number; an: number } | null {
  if (!val) return null;
  
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return {
      date: d.toISOString().split('T')[0],
      luna: d.getMonth() + 1,
      an: d.getFullYear()
    };
  }
  
  return null;
}

function findCategory(subcatName: string): { catId: number; subId: number } | null {
  if (!subcatName) return null;
  const lower = subcatName.toLowerCase().trim();
  
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  
  return null;
}

async function loadMappings() {
  const agents = await pool.query(`SELECT id, first_name, last_name FROM users WHERE role = 'AGENT' OR role = 'ADMIN'`);
  for (const a of agents.rows) {
    const fullName = `${a.first_name} ${a.last_name}`.toLowerCase();
    const firstName = a.first_name.toLowerCase();
    AGENT_MAP[fullName] = a.id;
    AGENT_MAP[firstName] = a.id;
  }
  console.log('Agent mappings:', AGENT_MAP);
  
  const sedii = await pool.query(`SELECT id, nume, judet FROM sedii`);
  for (const s of sedii.rows) {
    const name = s.nume.toLowerCase();
    const judet = s.judet?.toLowerCase() || '';
    SEDIU_MAP[name] = s.id;
    SEDIU_MAP[judet] = s.id;
    if (name.includes('bucuresti') || judet.includes('bucuresti') || judet.includes('ilfov')) {
      SEDIU_MAP['bucuresti'] = s.id;
      SEDIU_MAP['ilfov'] = s.id;
    }
  }
  console.log('Sediu mappings:', SEDIU_MAP);
}

function findSediuByJudet(judet: string): number | null {
  if (!judet) return null;
  const lower = judet.toLowerCase().trim();
  
  if (lower.includes('bucuresti') || lower.includes('ilfov')) {
    return SEDIU_MAP['bucuresti'] || SEDIU_MAP['ilfov'] || 1;
  }
  
  for (const [key, id] of Object.entries(SEDIU_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }
  
  return 1;
}

async function importCheltuieli() {
  await loadMappings();
  
  const file = 'attached_assets/cheltuieli_1765368668667.xlsx';
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  console.log(`Processing ${data.length - 1} rows...`);
  
  const cheltuieliAgent: CheltuialaAgent[] = [];
  const cheltuieliSediu: CheltuialaSediu[] = [];
  let skipped = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) {
      skipped++;
      continue;
    }
    
    const suma = parseValue(row[0]);
    if (suma <= 0) {
      skipped++;
      continue;
    }
    
    const judet = row[1] ? String(row[1]).trim() : null;
    const dateInfo = parseDate(row[2]);
    if (!dateInfo) {
      skipped++;
      continue;
    }
    
    const agentName = row[3] ? String(row[3]).trim().toLowerCase() : null;
    const tipCheltuiala = row[4] ? String(row[4]).trim().toLowerCase() : '';
    
    const subcatShowroom = row[5] ? String(row[5]).trim() : null;
    const subcatAuto = row[6] ? String(row[6]).trim() : null;
    const autoNr = row[7] ? String(row[7]).trim() : null;
    const subcatGenerale = row[8] ? String(row[8]).trim() : null;
    const subcatAgenti = row[9] ? String(row[9]).trim() : null;
    const subcatBuget = row[10] ? String(row[10]).trim() : null;
    
    let category: { catId: number; subId: number } | null = null;
    let descriere = '';
    let isAgentExpense = false;
    let agentId: string | null = null;
    let sediuId: number | null = null;
    
    if (tipCheltuiala.includes('auto') && subcatAuto) {
      category = findCategory(subcatAuto);
      descriere = `${subcatAuto}${autoNr ? ' - ' + autoNr : ''}`;
      
      if (agentName && AGENT_MAP[agentName]) {
        isAgentExpense = true;
        agentId = AGENT_MAP[agentName];
      } else {
        sediuId = findSediuByJudet(judet || '');
      }
    } else if (tipCheltuiala.includes('showroom') && subcatShowroom) {
      category = findCategory(subcatShowroom);
      descriere = subcatShowroom;
      sediuId = findSediuByJudet(judet || '');
      isAgentExpense = false;
    } else if (tipCheltuiala.includes('general') && subcatGenerale) {
      category = findCategory(subcatGenerale);
      descriere = subcatGenerale;
      sediuId = findSediuByJudet(judet || '');
      isAgentExpense = false;
    } else if (tipCheltuiala.includes('agent') && subcatAgenti) {
      category = findCategory(subcatAgenti);
      descriere = subcatAgenti;
      
      if (agentName && AGENT_MAP[agentName]) {
        isAgentExpense = true;
        agentId = AGENT_MAP[agentName];
      } else {
        sediuId = findSediuByJudet(judet || '');
      }
    } else if (tipCheltuiala.includes('buget')) {
      skipped++;
      continue;
    } else {
      const anySubcat = subcatShowroom || subcatAuto || subcatGenerale || subcatAgenti;
      if (anySubcat) {
        category = findCategory(anySubcat);
        descriere = anySubcat;
        sediuId = findSediuByJudet(judet || '');
      }
    }
    
    if (!category) {
      if (tipCheltuiala.includes('auto')) {
        category = { catId: 1, subId: 1 };
        descriere = descriere || 'Cheltuieli auto';
      } else if (tipCheltuiala.includes('showroom')) {
        category = { catId: 4, subId: 20 };
        descriere = descriere || 'Cheltuieli showroom';
      } else {
        category = { catId: 3, subId: 15 };
        descriere = descriere || tipCheltuiala || 'Alte cheltuieli';
      }
    }
    
    if (isAgentExpense && agentId) {
      cheltuieliAgent.push({
        agentId,
        categoryId: category.catId,
        subcategoryId: category.subId,
        suma,
        descriere,
        data: dateInfo.date,
        luna: dateInfo.luna,
        an: dateInfo.an
      });
    } else {
      if (!sediuId) sediuId = 1;
      cheltuieliSediu.push({
        sediuId,
        categoryId: category.catId,
        subcategoryId: category.subId,
        suma,
        descriere,
        data: dateInfo.date,
        luna: dateInfo.luna,
        an: dateInfo.an
      });
    }
  }
  
  console.log(`\nParsed: ${cheltuieliAgent.length} agent expenses, ${cheltuieliSediu.length} sediu expenses`);
  console.log(`Skipped: ${skipped} rows`);
  
  let agentInserted = 0;
  for (const c of cheltuieliAgent) {
    try {
      await pool.query(`
        INSERT INTO cheltuieli_agent (agent_id, category_id, subcategory_id, suma, descriere, data_cheltuiala, luna, an)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [c.agentId, c.categoryId, c.subcategoryId, c.suma.toFixed(2), c.descriere, c.data, c.luna, c.an]);
      agentInserted++;
    } catch (e: any) {
      if (agentInserted < 3) console.error('Agent insert error:', e.message);
    }
  }
  
  let sediuInserted = 0;
  for (const c of cheltuieliSediu) {
    try {
      await pool.query(`
        INSERT INTO cheltuieli_sediu (sediu_id, category_id, subcategory_id, suma, descriere, data_cheltuiala, luna, an)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [c.sediuId, c.categoryId, c.subcategoryId, c.suma.toFixed(2), c.descriere, c.data, c.luna, c.an]);
      sediuInserted++;
    } catch (e: any) {
      if (sediuInserted < 3) console.error('Sediu insert error:', e.message);
    }
  }
  
  console.log(`\n=== Import complete ===`);
  console.log(`Agent expenses inserted: ${agentInserted}`);
  console.log(`Sediu expenses inserted: ${sediuInserted}`);
  
  const stats = await pool.query(`
    SELECT 'Agent' as tip, COUNT(*) as total, SUM(CAST(suma AS DECIMAL)) as suma FROM cheltuieli_agent
    UNION ALL
    SELECT 'Sediu' as tip, COUNT(*) as total, SUM(CAST(suma AS DECIMAL)) as suma FROM cheltuieli_sediu
  `);
  
  console.log('\nTotal in database:');
  for (const row of stats.rows) {
    console.log(`  ${row.tip}: ${row.total} entries, ${parseFloat(row.suma).toFixed(2)} RON`);
  }
  
  await pool.end();
}

importCheltuieli();
