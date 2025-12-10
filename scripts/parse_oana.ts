import * as fs from 'fs';
import AdmZip from 'adm-zip';

const filePath = 'attached_assets/oana_clienti_1765357024928.xlsx';

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
  
  console.log('Header row:', data[1]);
  console.log('\nRow 2:', data[2]);
  
  const maxRow = Math.max(...Object.keys(data).map(Number));
  console.log(`\nTotal rânduri: ${maxRow - 1}`);
  
  // Calculate total
  function parseMoney(val: string): number {
    if (!val) return 0;
    const num = parseFloat(val.replace(/LEI/gi, '').replace(/\s+/g, '').replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }
  
  let total = 0;
  let count = 0;
  for (let i = 2; i <= maxRow; i++) {
    const row = data[i];
    if (!row) continue;
    const val = parseMoney(row.H || row.G || '');
    if (val > 0) { total += val; count++; }
  }
  console.log(`\nClienți cu valoare: ${count}`);
  console.log(`Valoare totală: ${total.toFixed(2)} RON`);
  
} catch (e) { console.error('Error:', e); }
