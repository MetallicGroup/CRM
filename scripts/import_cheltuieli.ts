import * as fs from 'fs';
import AdmZip from 'adm-zip';

const filePath = 'attached_assets/cheltuieli_1765359441489.xlsx';

// Agent name to ID mapping
const agentMap: Record<string, string> = {
  'Iulian Marcu': 'ag_iulian_m',
  'Marian Toma': 'ag_marian_t',
  'Oana': 'ag_oana',
  'Dragos Frangache': 'ag_dragos',
  'Alexandra Rosu': 'ag_alexandra',
  'Cristina Toma': 'ag_cristina_t',
  'Alexandru Croitoru': 'ag_alexandru_c',
  'Marian Costache': 'ag_marian_c',
};

// Sediu name to ID mapping
const sediuMap: Record<string, string> = {
  'Bucuresti': '68d78bfe-29b2-474b-b47a-970c5f891a5b',
  'Constanta': '0e9a8e1b-dd63-430d-ae72-89bb7f018f6c',
  'Teleorman': '3181bfd6-ee2a-42df-a375-2e67cd3d054c',
  'Giurgiu': 'bee67661-1f28-4039-a6b4-0e4b79faa8b8',
  'Bragadiru': '279e6569-c886-4927-8f9b-7ae9420a1c5e',
  'Barlad': 'dc440545-9a8f-4caf-89ed-cd32b68c0fd9',
};

// Category mapping for profitability
const categoryMap: Record<string, { categoryId: string, subcategoryId?: string }> = {
  // Auto
  'Auto|Service': { categoryId: 'cat-auto', subcategoryId: '95bb26dc-5f13-4ded-9d04-8e0b8d5105a9' }, // Revizii
  'Auto|Combustibil': { categoryId: 'cat-auto', subcategoryId: '838bc6c6-83fb-4e1e-b1f1-e770714396a0' },
  'Auto|Asigurare': { categoryId: 'cat-auto', subcategoryId: 'ea32e8a4-8b48-477e-bff2-d4a0c7103149' },
  'Auto|Leasing': { categoryId: 'cat-auto', subcategoryId: 'f7bc70b5-9611-48db-8550-838df8b174a4' },
  'Auto|Rovigneta': { categoryId: 'cat-auto', subcategoryId: 'f1aab9e2-eb23-4a72-831a-4b34154a5a1e' },
  'Auto|Altele': { categoryId: 'cat-auto' },
  
  // Salarii / Angajati
  'Angajati|Salarii': { categoryId: 'cat-salarii', subcategoryId: '4ff12bb9-46b0-4836-b0a3-759f99eeb820' },
  'Angajati|Bonuri de masa': { categoryId: 'cat-salarii', subcategoryId: 'f0489669-e038-4460-bd13-2dfd4a47d46f' },
  'Angajati|Bonus': { categoryId: 'cat-salarii', subcategoryId: '30f21c4f-d32e-42de-9c76-3b4886ad0f48' }, // Comision
  
  // Generale
  'Generale|Contabilitate / Jurist , etc': { categoryId: 'cat-generale', subcategoryId: '1d90adb7-e71d-4965-b979-ddd886da8af8' },
  'Generale|Protectia Muncii / Medicina Muncii': { categoryId: 'cat-generale', subcategoryId: 'fa7d2e33-5732-410f-b5a8-43d04b29294a' },
  'Generale|Marketing': { categoryId: 'cat-generale', subcategoryId: 'eb6d1178-49ee-43ee-8d27-3c704182cb0f' },
  
  // Showroom - goes to sediu expenses
  'Showroom|Marketing': { categoryId: 'cat-generale', subcategoryId: 'eb6d1178-49ee-43ee-8d27-3c704182cb0f' },
  'Showroom|Utilitati': { categoryId: 'cat-generale', subcategoryId: 'sub-alte' },
  'Showroom|Chirie': { categoryId: 'cat-generale', subcategoryId: 'sub-alte' },
  'Showroom|Consumabile': { categoryId: 'cat-generale', subcategoryId: 'sub-materiale' },
  
  // Bugete stat
  'Bugete Stat|': { categoryId: 'cat-bugete' },
  'TVA|': { categoryId: 'cat-bugete' },
};

try {
  const xlsx = fs.readFileSync(filePath);
  const zip = new AdmZip(xlsx);
  const entries = zip.getEntries();
  
  const sheetEntry = entries.find((e: any) => e.entryName.includes('sheet1.xml'));
  const stringsEntry = entries.find((e: any) => e.entryName.includes('sharedStrings.xml'));
  
  let strings: string[] = [];
  if (stringsEntry) {
    const stringsXml = stringsEntry.getData().toString('utf8');
    const matches = stringsXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
    for (const m of matches) strings.push(m[1]);
  }
  
  const sheetXml = sheetEntry!.getData().toString('utf8');
  const cellMatches = sheetXml.matchAll(/<c\s+r="([A-Z]+)(\d+)"[^>]*>([\s\S]*?)<\/c>/g);
  
  const data: Record<number, Record<string, string>> = {};
  for (const match of cellMatches) {
    const col = match[1];
    const row = parseInt(match[2]);
    const cellContent = match[3];
    const isString = match[0].includes('t="s"');
    const valueMatch = cellContent.match(/<v>([^<]*)<\/v>/);
    if (!data[row]) data[row] = {};
    if (valueMatch) {
      data[row][col] = isString && strings[parseInt(valueMatch[1])] 
        ? strings[parseInt(valueMatch[1])] 
        : valueMatch[1];
    }
  }
  
  function excelDateToISO(serial: string): string {
    const num = parseFloat(serial);
    if (isNaN(num) || num < 40000 || num > 50000) return '';
    return new Date((num - 25569) * 86400 * 1000).toISOString().split('T')[0];
  }
  
  function parseMoney(val: string): number {
    if (!val) return 0;
    const num = parseFloat(val.replace(/LEI/gi, '').replace(/\s+/g, '').replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }
  
  function getSediuFromJudet(judet: string): string | null {
    if (!judet) return null;
    const j = judet.toLowerCase();
    if (j.includes('bucuresti')) return sediuMap['Bucuresti'];
    if (j.includes('constanta')) return sediuMap['Constanta'];
    if (j.includes('teleorman')) return sediuMap['Teleorman'];
    if (j.includes('giurgiu')) return sediuMap['Giurgiu'];
    if (j.includes('bragadiru')) return sediuMap['Bragadiru'];
    if (j.includes('barlad')) return sediuMap['Barlad'];
    return null;
  }
  
  const cheltuieliAgent: any[] = [];
  const cheltuieliSediu: any[] = [];
  const maxRow = Math.max(...Object.keys(data).map(Number));
  
  for (let i = 2; i <= maxRow; i++) {
    const row = data[i];
    if (!row || !row.A) continue;
    
    const suma = parseMoney(row.A);
    if (suma <= 0) continue;
    
    const dataStr = excelDateToISO(row.C);
    if (!dataStr) continue;
    
    const tipCheltuiala = row.E || '';
    const agentName = row.D || '';
    const judet = row.B || '';
    
    // Determine subcategory based on type
    let subcategory = '';
    if (tipCheltuiala.includes('Auto')) subcategory = row.G || '';
    else if (tipCheltuiala.includes('Showroom')) subcategory = row.F || '';
    else if (tipCheltuiala.includes('Angajati')) subcategory = row.J || '';
    else if (tipCheltuiala.includes('Generale')) subcategory = row.I || '';
    else if (tipCheltuiala.includes('Bugete') || tipCheltuiala.includes('TVA')) subcategory = '';
    
    const catKey = `${tipCheltuiala.split(',')[0].trim()}|${subcategory}`;
    const catInfo = categoryMap[catKey] || { categoryId: 'cat-generale', subcategoryId: 'sub-alte' };
    
    const agentId = agentMap[agentName];
    const sediuId = getSediuFromJudet(judet);
    
    // If we have an agent, it's a cheltuiala agent
    if (agentId) {
      cheltuieliAgent.push({
        agentId,
        categoryId: catInfo.categoryId,
        subcategoryId: catInfo.subcategoryId || null,
        suma,
        data: dataStr,
        descriere: `${tipCheltuiala} - ${subcategory}`.trim(),
        autoNr: row.H || null,
      });
    } 
    // Otherwise if we have a sediu, it's a cheltuiala sediu
    else if (sediuId) {
      cheltuieliSediu.push({
        sediuId,
        categoryId: catInfo.categoryId,
        subcategoryId: catInfo.subcategoryId || null,
        suma,
        data: dataStr,
        descriere: `${tipCheltuiala} - ${subcategory}`.trim(),
      });
    }
  }
  
  console.log(`Cheltuieli agent: ${cheltuieliAgent.length}`);
  console.log(`Cheltuieli sediu: ${cheltuieliSediu.length}`);
  console.log(`Total suma agent: ${cheltuieliAgent.reduce((s, c) => s + c.suma, 0).toFixed(2)} RON`);
  console.log(`Total suma sediu: ${cheltuieliSediu.reduce((s, c) => s + c.suma, 0).toFixed(2)} RON`);
  
  // Sample
  console.log('\nSample cheltuieli agent:');
  cheltuieliAgent.slice(0, 3).forEach(c => console.log(c));
  
  console.log('\nSample cheltuieli sediu:');
  cheltuieliSediu.slice(0, 3).forEach(c => console.log(c));
  
  // Save for import
  fs.writeFileSync('/tmp/cheltuieli_agent.json', JSON.stringify(cheltuieliAgent));
  fs.writeFileSync('/tmp/cheltuieli_sediu.json', JSON.stringify(cheltuieliSediu));
  
} catch (e) { console.error('Error:', e); }
