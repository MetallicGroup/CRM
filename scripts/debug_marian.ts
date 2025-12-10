import * as fs from 'fs';
import AdmZip from 'adm-zip';

const filePath = 'attached_assets/marian_toma_vanduti_1765354579546.xlsx';

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
    for (const m of matches) {
      strings.push(m[1]);
    }
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
      if (isString && strings[parseInt(valueMatch[1])]) {
        data[row][col] = strings[parseInt(valueMatch[1])];
      } else {
        data[row][col] = valueMatch[1];
      }
    }
  }
  
  const maxRow = Math.max(...Object.keys(data).map(Number));
  console.log(`Total rânduri în Excel (fără header): ${maxRow - 1}`);
  
  // Count rows with and without name in column A
  let withName = 0;
  let withoutName = 0;
  const missingRows: number[] = [];
  
  for (let i = 2; i <= maxRow; i++) {
    const row = data[i];
    if (row && row.A && row.A.trim()) {
      withName++;
    } else {
      withoutName++;
      missingRows.push(i);
      // Show what data exists in this row
      if (row) {
        console.log(`Row ${i} fără nume:`, row);
      }
    }
  }
  
  console.log(`\nCu nume în coloana A: ${withName}`);
  console.log(`Fără nume în coloana A: ${withoutName}`);
  console.log(`Rânduri fără nume: ${missingRows.join(', ')}`);
  
} catch (e) {
  console.error('Error:', e);
}
