import * as fs from 'fs';
import AdmZip from 'adm-zip';

try {
  const xlsx = fs.readFileSync('attached_assets/croitoru_vanduti_1765352624394.xlsx');
  const zip = new AdmZip(xlsx);
  const entries = zip.getEntries();
  
  const sheetEntry = entries.find((e: any) => e.entryName.includes('sheet1.xml'));
  const stringsEntry = entries.find((e: any) => e.entryName.includes('sharedStrings.xml'));
  
  if (!sheetEntry) {
    console.log('No sheet1.xml found');
    console.log('Entries:', entries.map((e: any) => e.entryName));
    process.exit(1);
  }
  
  let strings: string[] = [];
  if (stringsEntry) {
    const stringsXml = stringsEntry.getData().toString('utf8');
    const matches = stringsXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
    for (const m of matches) {
      strings.push(m[1]);
    }
  }
  
  const sheetXml = sheetEntry.getData().toString('utf8');
  const rowMatches = sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
  let rowCount = 0;
  const rows: string[][] = [];
  
  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    const cellMatches = rowContent.matchAll(/<c[^>]*>[\s\S]*?<\/c>/g);
    const row: string[] = [];
    
    for (const cellMatch of cellMatches) {
      const cellXml = cellMatch[0];
      const isString = cellXml.includes('t="s"');
      const valueMatch = cellXml.match(/<v>([^<]*)<\/v>/);
      
      if (valueMatch) {
        if (isString && strings[parseInt(valueMatch[1])]) {
          row.push(strings[parseInt(valueMatch[1])]);
        } else {
          row.push(valueMatch[1]);
        }
      }
    }
    
    if (row.length > 0) {
      rows.push(row);
      rowCount++;
    }
  }
  
  console.log(`Total rânduri cu date: ${rowCount}`);
  console.log('\nPrimele 20 rânduri:');
  rows.slice(0, 20).forEach((row, i) => {
    console.log(`${i+1}: ${row.slice(0, 5).join(' | ')}`);
  });
  
} catch (e) {
  console.error('Error:', e);
}
