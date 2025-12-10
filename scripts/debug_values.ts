import * as fs from 'fs';
import AdmZip from 'adm-zip';

const filePath = 'attached_assets/croitoru_vanduti_bun_1765355442205.xlsx';

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
  
  // Check all columns that might contain value
  console.log('Checking all columns in row 2:');
  Object.entries(data[2]).forEach(([col, val]) => {
    if (val && (val.includes('LEI') || /^\d+(\.\d+)?$/.test(val))) {
      console.log(`  ${col}: ${val}`);
    }
  });
  
  console.log('\nChecking all columns in row 3:');
  Object.entries(data[3]).forEach(([col, val]) => {
    if (val && (val.includes('LEI') || /^\d+(\.\d+)?$/.test(val))) {
      console.log(`  ${col}: ${val}`);
    }
  });
  
  // Sum column H values
  let totalH = 0;
  let countH = 0;
  let missingH: number[] = [];
  
  const maxRow = Math.max(...Object.keys(data).map(Number));
  for (let i = 2; i <= maxRow; i++) {
    const row = data[i];
    if (!row) continue;
    
    const valH = row.H || '';
    if (valH) {
      const num = parseFloat(valH.replace(/LEI/gi, '').replace(/\s+/g, '').replace(/,/g, ''));
      if (!isNaN(num)) {
        totalH += num;
        countH++;
      } else {
        missingH.push(i);
      }
    } else {
      missingH.push(i);
    }
  }
  
  console.log(`\nColumn H total: ${totalH.toFixed(2)} RON (${countH} values)`);
  console.log(`Rows without H value: ${missingH.length}`);
  if (missingH.length > 0 && missingH.length <= 20) {
    console.log(`Missing rows: ${missingH.join(', ')}`);
  }
  
  // Check if there's another column with values
  console.log('\nSample rows without H but with other data:');
  for (const rowIdx of missingH.slice(0, 5)) {
    const row = data[rowIdx];
    if (row) {
      console.log(`Row ${rowIdx}:`, row);
    }
  }
  
} catch (e) {
  console.error('Error:', e);
}
