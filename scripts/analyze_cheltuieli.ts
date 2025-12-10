import * as fs from 'fs';
import AdmZip from 'adm-zip';

const filePath = 'attached_assets/cheltuieli_1765359441489.xlsx';

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
  
  const maxRow = Math.max(...Object.keys(data).map(Number));
  
  // Collect unique values for each column
  const tipCheltuiala = new Set<string>();
  const cheltuieliShowroom = new Set<string>();
  const cheltuieliAuto = new Set<string>();
  const cheltuieliGenerale = new Set<string>();
  const cheltuieliAgenti = new Set<string>();
  const cheltuieliBuget = new Set<string>();
  const agenti = new Set<string>();
  const judete = new Set<string>();
  
  for (let i = 2; i <= maxRow; i++) {
    const row = data[i];
    if (!row || !row.A) continue;
    
    if (row.E) tipCheltuiala.add(row.E);
    if (row.F) cheltuieliShowroom.add(row.F);
    if (row.G) cheltuieliAuto.add(row.G);
    if (row.I) cheltuieliGenerale.add(row.I);
    if (row.J) cheltuieliAgenti.add(row.J);
    if (row.K) cheltuieliBuget.add(row.K);
    if (row.D) agenti.add(row.D);
    if (row.B) judete.add(row.B);
  }
  
  console.log('Tip Cheltuiala (E):', [...tipCheltuiala]);
  console.log('\nCheltuieli Showroom (F):', [...cheltuieliShowroom]);
  console.log('\nCheltuieli Auto (G):', [...cheltuieliAuto]);
  console.log('\nCheltuieli Generale (I):', [...cheltuieliGenerale]);
  console.log('\nCheltuieli Agenti (J):', [...cheltuieliAgenti]);
  console.log('\nCheltuieli Buget (K):', [...cheltuieliBuget]);
  console.log('\nAgenti (D):', [...agenti]);
  console.log('\nJudete (B):', [...judete]);
  
  // Count valid rows
  let validRows = 0;
  for (let i = 2; i <= maxRow; i++) {
    if (data[i] && data[i].A) validRows++;
  }
  console.log(`\nTotal rânduri valide: ${validRows}`);
  
} catch (e) { console.error('Error:', e); }
