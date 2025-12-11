import XLSX from 'xlsx';
import { db } from '../server/db';
import { clients } from '../shared/schema';

const AGENT_ID = 'ag_radu_d';
const FILE_PATH = 'attached_assets/radu_vanduti_bun_1765444139383.xlsx';

function parseEuropeanDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
}

function determineBrand(value: string): string {
  const val = value?.toUpperCase() || '';
  if (val.includes('MX') || val.includes('ZEBRA') || val.includes('METALLIC')) return 'MX';
  if (val.includes('CARETTA')) return 'CARETTA';
  if (val.includes('WETTERBEST')) return 'WETTERBEST';
  if (val.includes('BILKA')) return 'BILKA';
  if (val.includes('FAKRO')) return 'FAKRO';
  return 'MX';
}

function determineCategory(brand: string): "GARD" | "ACOPERIS" {
  if (brand === 'MX' || brand === 'ZEBRA') return 'GARD';
  return 'ACOPERIS';
}

async function importRadu() {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(FILE_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
  
  const headers = data[0];
  console.log('Headers:', headers);
  
  let imported = 0;
  let skipped = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    const nume = String(row[0] || '').trim();
    if (!nume) continue;
    
    const telefon = String(row[1] || '000').trim() || '000';
    const localitate = String(row[2] || '').trim();
    const judet = String(row[3] || 'București').trim() || 'București';
    const produs = String(row[4] || '').trim();
    const brand = determineBrand(produs || 'MX');
    const categorie = determineCategory(brand);
    
    // Values in columns G or H (index 6 or 7)
    const valoareG = parseFloat(String(row[6] || '0').replace(/[^\d.-]/g, '')) || 0;
    const valoareH = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0;
    const valoareOferta = String(valoareG || valoareH || 0);
    
    // Achizitie in column I or J (index 8 or 9)
    const achizitieI = parseFloat(String(row[8] || '0').replace(/[^\d.-]/g, '')) || 0;
    const achizitieJ = parseFloat(String(row[9] || '0').replace(/[^\d.-]/g, '')) || 0;
    const pretAchizitie = String(achizitieI || achizitieJ || 0);
    
    // Date - find column with date format
    let dataVanzarii = new Date();
    for (let c = 0; c < row.length; c++) {
      const cellValue = String(row[c] || '');
      if (cellValue.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/)) {
        const parsed = parseEuropeanDate(cellValue);
        if (parsed && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
          dataVanzarii = parsed;
          break;
        }
      }
    }
    
    try {
      await db.insert(clients).values({
        nume,
        telefon,
        localitate: localitate || null,
        judet: judet || 'București',
        email: null,
        agentId: AGENT_ID,
        sursa: 'ALTELE',
        stadiuOferta: 'VANDUT',
        categorieProdus: categorie,
        brand,
        model: produs || null,
        valoareOferta,
        pretAchizitie,
        dataVanzarii,
        observatiiClient: 'Import Excel - Radu Dincă'
      });
      imported++;
    } catch (err: any) {
      console.log(`Skip row ${i}: ${err.message}`);
      skipped++;
    }
  }
  
  console.log(`\nImport complete: ${imported} clients imported, ${skipped} skipped`);
}

importRadu().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
