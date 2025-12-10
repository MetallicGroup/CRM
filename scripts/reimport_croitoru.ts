import XLSX from 'xlsx';
import { pool } from '../server/db';

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

const STATUS_MAP: Record<string, string> = {
  'VANDUT': 'VANDUT',
  'VANZARE': 'VANDUT',
  'NOU': 'NOU',
  'CONTACTAT': 'CONTACTAT',
  'OFERTAT': 'OFERTAT',
  'FOLLOW-UP': 'FOLLOW_UP',
  'FOLLOW UP': 'FOLLOW_UP',
  'PROSPECT': 'PROSPECT',
  'CUSTODIE': 'CUSTODIE',
  'PIERDUT': 'PIERDUT',
  'INFORMATII': 'INFORMATII'
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

function normalizeStatus(val: any): string {
  if (!val) return 'NOU';
  const upper = String(val).toUpperCase().trim();
  return STATUS_MAP[upper] || 'NOU';
}

async function reimportCroitoru() {
  const file = 'attached_assets/croitoru_vanduti_bun_1765355442205.xlsx';
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  const agentResult = await pool.query(`SELECT id FROM users WHERE first_name ILIKE '%Alexandru%' OR last_name ILIKE '%Croitoru%' LIMIT 1`);
  if (agentResult.rows.length === 0) {
    console.error('Agent Alexandru Croitoru not found!');
    return;
  }
  const agentId = agentResult.rows[0].id;
  console.log(`Agent ID: ${agentId}`);
  
  const headers = data[0];
  console.log('Headers:', headers);
  
  const colMap: Record<string, number> = {};
  headers.forEach((h: any, i: number) => {
    if (!h) return;
    const lower = String(h).toLowerCase().trim();
    if (lower.includes('nume')) colMap.nume = i;
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
  
  let updated = 0;
  let errors = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;
    
    const telefon = row[colMap.telefon];
    if (!telefon) continue;
    
    const telefonNormalized = String(telefon).replace(/[^0-9]/g, '');
    
    const categorie = normalizeCategory(row[colMap.categorie]);
    const brand = row[colMap.brand] ? String(row[colMap.brand]).trim() : null;
    const model = row[colMap.model] ? String(row[colMap.model]).trim() : null;
    const valoareOferta = parseValue(row[colMap.valoareOferta]);
    const stadiuOferta = normalizeStatus(row[colMap.stadiuOferta]);
    const suprafata = row[colMap.suprafata] ? String(row[colMap.suprafata]) : null;
    const culoare = row[colMap.culoare] ? String(row[colMap.culoare]) : null;
    const grosime = row[colMap.grosime] ? String(row[colMap.grosime]) : null;
    const finisaj = row[colMap.finisaj] ? String(row[colMap.finisaj]) : null;
    
    try {
      const result = await pool.query(`
        UPDATE clients 
        SET 
          categorie_produs = COALESCE($1, categorie_produs),
          brand = COALESCE($2, brand),
          model = COALESCE($3, model),
          valoare_oferta = COALESCE($4, valoare_oferta),
          stadiu_oferta = COALESCE($5, stadiu_oferta),
          suprafata_mp = COALESCE($6, suprafata_mp),
          culoare = COALESCE($7, culoare),
          grosime = COALESCE($8, grosime),
          finisaj = COALESCE($9, finisaj)
        WHERE agent_id = $10 
          AND (telefon LIKE '%' || $11 || '%' OR telefon LIKE $11 || '%')
      `, [categorie, brand, model, valoareOferta, stadiuOferta, suprafata, culoare, grosime, finisaj, agentId, telefonNormalized]);
      
      if (result.rowCount && result.rowCount > 0) {
        updated += result.rowCount;
      }
    } catch (e: any) {
      errors++;
      if (errors < 5) console.error(`Error updating row ${i}:`, e.message);
    }
  }
  
  console.log(`\n=== Update complete ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  
  const stats = await pool.query(`
    SELECT categorie_produs, COUNT(*) as cnt 
    FROM clients 
    WHERE agent_id = $1 
    GROUP BY categorie_produs 
    ORDER BY cnt DESC
  `, [agentId]);
  
  console.log('\nCategory distribution for Alexandru:');
  for (const row of stats.rows) {
    console.log(`  ${row.categorie_produs || 'NULL'}: ${row.cnt}`);
  }
  
  await pool.end();
}

reimportCroitoru();
