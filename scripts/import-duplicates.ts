import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { clients } from '../shared/schema';
import { eq } from 'drizzle-orm';

const FILES_TO_PROCESS = [
  'attached_assets/marian_toma_vandutis_1765877281369.xlsx',
  'attached_assets/costache_vanduti_bun_1765877281383.xlsx',
  'attached_assets/radu_vanduti_bun_1765877281383.xlsx',
  'attached_assets/alexandra_vanzari_1765877281383.xlsx',
  'attached_assets/oana_clienti_1765877281383.xlsx',
  'attached_assets/croitoru_vanduti_bun_1765877281383.xlsx',
  'attached_assets/marian_toma_vanduti_1765877281384.xlsx',
];

const AGENT_MAPPING: Record<string, string> = {
  'marian_toma': 'ag_marian_t',
  'costache': 'ag_marian_c',
  'radu': 'ag_radu_d',
  'alexandra': 'ag_alexandra',
  'oana': 'ag_oana',
  'croitoru': 'ag_alexandru_c',
};

function getAgentIdFromFilename(filename: string): string {
  const baseName = path.basename(filename).toLowerCase();
  for (const [key, agentId] of Object.entries(AGENT_MAPPING)) {
    if (baseName.includes(key)) {
      return agentId;
    }
  }
  return '';
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  if (typeof value === 'string') {
    const parts = value.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0]);
      let month = parseInt(parts[1]) - 1;
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }
  return null;
}

function parseNumber(value: any): string {
  if (!value) return '';
  const str = String(value).replace(/LEI/gi, '').replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? '' : String(num);
}

function normalizePhone(phone: any): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

function getValue(row: Record<string, any>, keys: string[]): any {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== '') return val;
    const lowerKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
    if (lowerKey && row[lowerKey] !== undefined && row[lowerKey] !== '') return row[lowerKey];
  }
  return '';
}

interface ExistingClient {
  telefon: string;
  nume: string;
  valoareOferta: string | null;
  dataVanzarii: Date | null;
}

async function main() {
  console.log('Loading existing clients from database...');
  const existingClients = await db.select({
    telefon: clients.telefon,
    nume: clients.nume,
    valoareOferta: clients.valoareOferta,
    dataVanzarii: clients.dataVanzarii,
  }).from(clients);
  
  console.log(`Found ${existingClients.length} existing clients\n`);
  
  const existingMap = new Map<string, ExistingClient[]>();
  for (const c of existingClients) {
    const key = c.telefon || '';
    if (!existingMap.has(key)) {
      existingMap.set(key, []);
    }
    existingMap.get(key)!.push(c);
  }
  
  let totalAdded = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];
  const clientsToInsert: any[] = [];
  
  for (const filePath of FILES_TO_PROCESS) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      continue;
    }
    
    const agentId = getAgentIdFromFilename(filePath);
    console.log(`Processing ${filePath} for agent ${agentId}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    
    let added = 0;
    let skipped = 0;
    
    for (const row of data as Record<string, any>[]) {
      const nume = String(getValue(row, ['Nume Client', 'Nume', 'nume', 'Client', 'client'])).trim();
      const telefon = normalizePhone(getValue(row, ['Telefon', 'telefon', 'Tel', 'Phone']));
      
      if (!nume) continue;
      
      const valoareOfertaStr = getValue(row, ['Valoare Oferta', 'Valoare', 'valoare', 'Total']);
      const valoareOferta = parseNumber(valoareOfertaStr);
      const dataVanzarii = parseDate(getValue(row, ['Data vanzarii', 'Data Vanzarii', 'data vanzarii']));
      const dataOfertarii = parseDate(getValue(row, ['Data ofertarii', 'Data Ofertarii', 'data ofertarii']));
      
      const existingList = existingMap.get(telefon) || [];
      let isDuplicate = false;
      
      for (const existing of existingList) {
        const existingDate = existing.dataVanzarii ? new Date(existing.dataVanzarii).toDateString() : '';
        const newDate = dataVanzarii ? dataVanzarii.toDateString() : '';
        
        if (existing.valoareOferta === valoareOferta && existingDate === newDate) {
          isDuplicate = true;
          break;
        }
        if (existing.nume === nume && existing.valoareOferta === valoareOferta) {
          isDuplicate = true;
          break;
        }
      }
      
      if (isDuplicate) {
        skipped++;
        continue;
      }
      
      const categorie = String(getValue(row, ['CATEGORIE PRODUS', 'Categorie', 'categorie', 'Produs'])).toUpperCase();
      const stadiuOfertaRaw = String(getValue(row, ['Stadiu Oferta', 'Stadiu', 'stadiu oferta'])).toLowerCase();
      let stadiuOferta: 'VANDUT' | 'NOUA' = 'VANDUT';
      if (stadiuOfertaRaw.includes('vandut') || stadiuOfertaRaw.includes('vândut')) {
        stadiuOferta = 'VANDUT';
      }
      
      const clientData: Record<string, any> = {
        nume,
        telefon: telefon || '',
        email: String(getValue(row, ['Email', 'email'])) || null,
        localitate: String(getValue(row, ['Adresa', 'Localitate', 'localitate', 'adresa'])) || null,
        judet: String(getValue(row, ['Judet', 'judet', 'Jud'])) || null,
        sursa: 'ALTELE',
        agentId: agentId || null,
        stadiuOferta,
        valoareOferta: valoareOferta || null,
        categorieProdus: categorie.includes('GARD') ? 'GARD' : 'ACOPERIS',
        brand: String(getValue(row, ['Brand', 'brand'])) || null,
        model: String(getValue(row, ['Model', 'model'])) || null,
        suprafataMp: parseNumber(getValue(row, ['Suprafata MP', 'Suprafata', 'suprafata'])) || null,
        culoare: String(getValue(row, ['Culoare', 'culoare'])) || null,
        grosime: String(getValue(row, ['Grosime', 'grosime'])) || null,
        finisaj: String(getValue(row, ['Finisaj', 'finisaj'])) || null,
        procentComision: String(getValue(row, ['Procent Comision', 'procent comision'])).replace('%', '') || null,
      };
      
      if (dataOfertarii) clientData.dataOfertarii = dataOfertarii;
      if (dataVanzarii) clientData.dataVanzarii = dataVanzarii;
      
      clientsToInsert.push(clientData);
      existingMap.get(telefon)?.push({ telefon, nume, valoareOferta, dataVanzarii });
      if (!existingMap.has(telefon)) {
        existingMap.set(telefon, [{ telefon, nume, valoareOferta, dataVanzarii }]);
      }
      
      added++;
      console.log(`  Will add: ${nume} - ${telefon} - ${valoareOferta}`);
    }
    
    totalAdded += added;
    totalSkipped += skipped;
    console.log(`  Result: ${added} to add, ${skipped} skipped\n`);
  }
  
  console.log('\n=== INSERTING INTO DATABASE ===');
  console.log(`Total to insert: ${clientsToInsert.length}`);
  
  let insertedCount = 0;
  for (const clientData of clientsToInsert) {
    try {
      await db.insert(clients).values(clientData);
      insertedCount++;
    } catch (err: any) {
      allErrors.push(`Error: ${err.message}`);
    }
  }
  
  console.log(`Successfully inserted: ${insertedCount}`);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total added: ${insertedCount}`);
  console.log(`Total skipped (already exist): ${totalSkipped}`);
  if (allErrors.length > 0) {
    console.log(`Errors: ${allErrors.length}`);
  }
  
  if (insertedCount > 0) {
    console.log('\nRecalculating profitability...');
    const agents = ['ag_marian_t', 'ag_marian_c', 'ag_radu_d', 'ag_alexandra', 'ag_oana', 'ag_alexandru_c'];
    
    for (let month = 1; month <= 12; month++) {
      for (const agentId of agents) {
        try {
          await fetch('http://localhost:5000/api/profitabilitate/sales/recalculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId, luna: month, an: 2025 }),
          });
        } catch (e) {}
      }
    }
    console.log('Profitability recalculated for 2025');
  }
  
  process.exit(0);
}

main().catch(console.error);
