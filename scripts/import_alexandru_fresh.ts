import XLSX from 'xlsx';
import { pool } from '../server/db';
import crypto from 'crypto';

const CATEGORY_MAP: Record<string, string> = {
  'GARD': 'GARD',
  'GARD METALIC': 'GARD',
  'GARDURI': 'GARD',
  'ACOPERIS': 'ACOPERIS',
  'ACOPERISURI': 'ACOPERIS',
  'TABLA ACOPERIS': 'ACOPERIS',
  'FATADA': 'FATADA',
  'SISTEM PLUVIAL': 'SISTEM_PLUVIAL',
  'JGHEABURI': 'SISTEM_PLUVIAL',
  'FERESTRE MANSARDA': 'FERESTRE_MANSARDA',
  'FERESTRE': 'FERESTRE_MANSARDA',
  'SAGEAC': 'SAGEAC',
  'ACCESORII': 'ACCESORII',
  'ELEMENTE SPECIALE': 'ELEMENTE_SPECIALE',
  'VENTILATII': 'VENTILATII',
  'RULOURI': 'RULOURI_EXTERIOARE',
  'RULOURI EXTERIOARE': 'RULOURI_EXTERIOARE'
};

const SURSA_MAP: Record<string, string> = {
  'FACEBOOK': 'FACEBOOK',
  'FB': 'FACEBOOK',
  'GOOGLE': 'GOOGLE',
  'SITE': 'SITE',
  'WEBSITE': 'SITE',
  'RECOMANDARE': 'RECOMANDARE',
  'CLIENT VECHI': 'RECOMANDARE',
  'CLIENT VECHI ( COMPLETARE )': 'RECOMANDARE',
  'BIROU': 'ALTELE',
  'OLX': 'ALTELE',
  'MONTATORI / COLABORATORI': 'ALTELE',
  'MONTATOR': 'ALTELE',
  'TARG': 'TARG',
  'RECLAME': 'RECLAME',
  'ALTELE': 'ALTELE'
};

function parseDate(val: any): string | null {
  if (!val) return null;
  
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  if (typeof val === 'string') {
    const parts = val.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  
  return null;
}

function parseValue(val: any): string {
  if (!val) return '0';
  const str = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? '0' : num.toFixed(2);
}

function normalizeCategory(val: any): string | null {
  if (!val) return null;
  const upper = String(val).toUpperCase().trim();
  return CATEGORY_MAP[upper] || null;
}

function normalizeSursa(val: any): string {
  if (!val) return 'ALTELE';
  const upper = String(val).toUpperCase().trim();
  for (const [key, value] of Object.entries(SURSA_MAP)) {
    if (upper.includes(key)) return value;
  }
  return 'ALTELE';
}

async function importAlexandru() {
  const file = 'attached_assets/croitoru_vanduti_bun_1765355442205.xlsx';
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  const agentId = 'ag_alexandru_c';
  console.log(`Importing for agent: ${agentId}`);
  
  const headers = data[0];
  const colMap: Record<string, number> = {};
  headers.forEach((h: any, i: number) => {
    if (!h) return;
    const lower = String(h).toLowerCase().trim();
    if (lower.includes('nume') && lower.includes('client')) colMap.nume = i;
    if (lower.includes('judet')) colMap.judet = i;
    if (lower.includes('adresa')) colMap.adresa = i;
    if (lower.includes('telefon')) colMap.telefon = i;
    if (lower.includes('data') && lower.includes('ofert')) colMap.dataOfertarii = i;
    if (lower.includes('sursa')) colMap.sursa = i;
    if (lower.includes('ml')) colMap.mlRulou = i;
    if (lower.includes('valoare') && lower.includes('oferta')) colMap.valoareOferta = i;
    if (lower.includes('categorie') && lower.includes('produs')) colMap.categorie = i;
    if (lower === 'brand') colMap.brand = i;
    if (lower === 'model') colMap.model = i;
    if (lower.includes('suprafata')) colMap.suprafata = i;
    if (lower.includes('culoare')) colMap.culoare = i;
    if (lower.includes('grosime')) colMap.grosime = i;
    if (lower.includes('finisaj')) colMap.finisaj = i;
    if (lower.includes('stadiu') && lower.includes('oferta')) colMap.stadiuOferta = i;
    if (lower.includes('data') && lower.includes('vanzarii')) colMap.dataVanzarii = i;
    if (lower.includes('stadiu') && lower.includes('comanda')) colMap.stadiuComanda = i;
    if (lower.includes('procent') && lower.includes('comision')) colMap.comision = i;
  });
  
  console.log('Column mapping:', colMap);
  
  const phonesSeen = new Set<string>();
  let inserted = 0;
  let errors = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;
    
    const nume = row[colMap.nume] ? String(row[colMap.nume]).trim() : `Client ${i}`;
    let telefon = row[colMap.telefon] ? String(row[colMap.telefon]).replace(/[^0-9]/g, '') : `N/A-${i}`;
    
    if (!telefon || telefon.length < 5) telefon = `N/A-${i}`;
    
    if (phonesSeen.has(telefon)) {
      let suffix = 1;
      while (phonesSeen.has(`${telefon}-${suffix}`)) suffix++;
      telefon = `${telefon}-${suffix}`;
    }
    phonesSeen.add(telefon);
    
    const judet = row[colMap.judet] ? String(row[colMap.judet]).trim() : null;
    const sursa = normalizeSursa(row[colMap.sursa]);
    const categorie = normalizeCategory(row[colMap.categorie]);
    const brand = row[colMap.brand] ? String(row[colMap.brand]).trim() : null;
    const model = row[colMap.model] ? String(row[colMap.model]).trim() : null;
    const valoareOferta = parseValue(row[colMap.valoareOferta]);
    const suprafata = row[colMap.suprafata] ? String(row[colMap.suprafata]) : null;
    const culoare = row[colMap.culoare] ? String(row[colMap.culoare]) : null;
    const grosime = row[colMap.grosime] ? String(row[colMap.grosime]) : null;
    const finisaj = row[colMap.finisaj] ? String(row[colMap.finisaj]) : null;
    const dataOfertarii = parseDate(row[colMap.dataOfertarii]);
    const dataVanzarii = parseDate(row[colMap.dataVanzarii]);
    
    let stadiuOferta = 'NOU';
    const rawStatus = row[colMap.stadiuOferta] ? String(row[colMap.stadiuOferta]).toUpperCase().trim() : '';
    if (rawStatus.includes('VANDUT') || rawStatus.includes('VANZARE')) stadiuOferta = 'VANDUT';
    else if (rawStatus.includes('PIERDUT')) stadiuOferta = 'PIERDUT';
    else if (rawStatus.includes('OFERTAT')) stadiuOferta = 'OFERTAT';
    else if (rawStatus.includes('CONTACTAT')) stadiuOferta = 'CONTACTAT';
    
    let stadiuComanda = null;
    const rawComanda = row[colMap.stadiuComanda] ? String(row[colMap.stadiuComanda]).toUpperCase().trim() : '';
    if (rawComanda.includes('LIVRAT')) stadiuComanda = 'LIVRAT';
    else if (rawComanda.includes('PRODUS')) stadiuComanda = 'PRODUS';
    else if (rawComanda.includes('PRODUCTIE')) stadiuComanda = 'IN_PRODUCTIE';
    else if (rawComanda.includes('LISTAT')) stadiuComanda = 'LISTAT';
    else if (rawComanda.includes('COMANDAT')) stadiuComanda = 'COMANDAT';
    
    const clientId = `cli_${crypto.randomUUID().slice(0, 8)}`;
    
    try {
      await pool.query(`
        INSERT INTO clients (
          id, agent_id, nume, telefon, judet, sursa,
          categorie_produs, brand, model, valoare_oferta,
          suprafata_mp, culoare, grosime, finisaj,
          stadiu_oferta, stadiu_comanda, data_ofertarii, data_vanzarii
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18
        )
      `, [
        clientId, agentId, nume, telefon, judet, sursa,
        categorie, brand, model, valoareOferta,
        suprafata, culoare, grosime, finisaj,
        stadiuOferta, stadiuComanda, dataOfertarii, dataVanzarii
      ]);
      inserted++;
    } catch (e: any) {
      errors++;
      if (errors < 5) console.error(`Error inserting row ${i}:`, e.message);
    }
  }
  
  console.log(`\n=== Import complete ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  
  const stats = await pool.query(`
    SELECT categorie_produs, COUNT(*) as cnt, SUM(CAST(valoare_oferta AS DECIMAL)) as total
    FROM clients 
    WHERE agent_id = $1 
    GROUP BY categorie_produs 
    ORDER BY cnt DESC
  `, [agentId]);
  
  console.log('\nCategory distribution for Alexandru:');
  for (const row of stats.rows) {
    console.log(`  ${row.categorie_produs || 'NULL'}: ${row.cnt} clients, ${parseFloat(row.total || 0).toFixed(2)} RON`);
  }
  
  await pool.end();
}

importAlexandru();
