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
  
  function excelDateToISO(serial: string): string {
    const num = parseFloat(serial);
    if (isNaN(num) || num < 40000 || num > 50000) return '';
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  function parseMoney(val: string): string {
    if (!val) return '';
    const cleaned = val.replace(/LEI/gi, '').replace(/\s+/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : num.toFixed(2);
  }
  
  const clients: any[] = [];
  const maxRow = Math.max(...Object.keys(data).map(Number));
  let withoutPhone = 0;
  
  for (let i = 2; i <= maxRow; i++) {
    const row = data[i];
    if (!row || !row.A) continue;
    
    let telefon = (row.D || '').replace(/[^\d+]/g, '');
    if (!telefon || telefon.length < 5) {
      telefon = `N/A-${i}`;
      withoutPhone++;
    }
    
    // Map sursa from column G
    const sursaRaw = (row.G || '').toLowerCase();
    let sursa = 'ALTELE';
    if (sursaRaw.includes('facebook')) sursa = 'FACEBOOK';
    else if (sursaRaw.includes('google')) sursa = 'GOOGLE';
    else if (sursaRaw.includes('site')) sursa = 'SITE';
    else if (sursaRaw.includes('olx')) sursa = 'RECLAME';
    else if (sursaRaw.includes('recomandare')) sursa = 'RECOMANDARE';
    else if (sursaRaw.includes('birou')) sursa = 'ALTELE';
    
    // Map categorie from column J
    const catRaw = (row.J || '').toLowerCase();
    let categorie: string | undefined = undefined;
    if (catRaw.includes('gard')) categorie = 'GARD';
    else if (catRaw.includes('acop')) categorie = 'ACOPERIS';
    
    // Comision from AA
    let procentComision: string | undefined = undefined;
    const comisionRaw = row.AA || '';
    if (comisionRaw.includes('1')) procentComision = '1';
    else if (comisionRaw.includes('2')) procentComision = '2';
    else if (comisionRaw.includes('3')) procentComision = '3';
    
    const client = {
      nume: row.A || '',
      telefon: telefon,
      email: '',
      judet: row.B || '',
      localitate: row.C || '',
      sursa: sursa,
      categorieProdus: categorie,
      valoareOferta: parseMoney(row.I || ''),
      pretAchizitie: '',
      stadiuOferta: 'VANDUT',
      dataVanzarii: excelDateToISO(row.W || ''),
      dataLivrarii: excelDateToISO(row.Y || ''),
      dataOfertarii: '',
      procentComision: procentComision,
      comisionOferta: parseMoney(row.AB || ''),
      suprafataMp: row.M || '',
      mlRulouProd: '',
      observatiiClient: '',
      comentariiDupaContact: '',
    };
    
    clients.push(client);
  }
  
  console.log(`Total clienți: ${clients.length}`);
  console.log(`Fără telefon valid: ${withoutPhone}`);
  console.log('\nPrimii 5 clienți:');
  clients.slice(0, 5).forEach((c, i) => {
    console.log(`${i+1}: ${c.nume} | ${c.telefon} | ${c.valoareOferta} RON | ${c.categorieProdus} | ${c.dataVanzarii}`);
  });
  
  fs.writeFileSync('/tmp/mapped_clients.json', JSON.stringify({ 
    rows: clients, 
    agentId: agentId,
    duplicateStrategy: 'skip'
  }));
  
  console.log('\nSalvat: /tmp/mapped_clients.json');
  
} catch (e) {
  console.error('Error:', e);
}
