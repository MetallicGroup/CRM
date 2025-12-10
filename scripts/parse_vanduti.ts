import * as fs from 'fs';
import AdmZip from 'adm-zip';

const filePath = 'attached_assets/marian_toma_vanduti_1765354579546.xlsx';
const agentId = 'ag_marian_t';

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
  
  // Show header and first rows
  console.log('Header row:', data[1]);
  console.log('\nRow 2:', data[2]);
  console.log('\nRow 3:', data[3]);
  
  const maxRow = Math.max(...Object.keys(data).map(Number));
  console.log(`\nTotal rânduri: ${maxRow - 1}`);
  
} catch (e) {
  console.error('Error:', e);
}
