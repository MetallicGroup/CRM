import * as fs from 'fs';
import AdmZip from 'adm-zip';

const filePath = 'attached_assets/dragos_clienti_1765356353633.xlsx';
const agentId = 'ag_dragos';

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
  
  function parseMoney(val: string): string {
    if (!val) return '';
    const num = parseFloat(val.replace(/LEI/gi, '').replace(/\s+/g, '').replace(/,/g, ''));
    return isNaN(num) ? '' : num.toFixed(2);
  }
  
  const clients: any[] = [];
  const maxRow = Math.max(...Object.keys(data).map(Number));
  const phoneCount = new Map<string, number>();
  let totalValue = 0;
  
  for (let i = 2; i <= maxRow; i++) {
    const row = data[i];
    if (!row) continue;
    if (!row.A && !row.D && !row.H && !row.G) continue;
    
    let nume = (row.A || '').trim() || `Fără nume (rând ${i})`;
    let basePhone = (row.D || '').replace(/[^\d+]/g, '');
    if (!basePhone || basePhone.length < 5) basePhone = `N/A-${i}`;
    
    const count = phoneCount.get(basePhone) || 0;
    const telefon = count === 0 ? basePhone : `${basePhone}-${count}`;
    phoneCount.set(basePhone, count + 1);
    
    const sursaRaw = (row.F || '').toLowerCase();
    let sursa = 'ALTELE';
    if (sursaRaw.includes('facebook')) sursa = 'FACEBOOK';
    else if (sursaRaw.includes('google')) sursa = 'GOOGLE';
    else if (sursaRaw.includes('olx')) sursa = 'RECLAME';
    else if (sursaRaw.includes('recomandare')) sursa = 'RECOMANDARE';
    
    const catRaw = (row.I || '').toLowerCase();
    let categorie = catRaw.includes('gard') ? 'GARD' : catRaw.includes('acop') ? 'ACOPERIS' : undefined;
    
    const comisionRaw = row.Y || row.Z || '';
    let procentComision = comisionRaw.includes('3') ? '3' : comisionRaw.includes('2') ? '2' : comisionRaw.includes('1') ? '1' : undefined;
    
    let valoareRaw = row.H || row.G || '';
    const valoareOferta = parseMoney(valoareRaw);
    totalValue += parseFloat(valoareOferta) || 0;
    
    // All clients are VANDUT
    clients.push({
      nume, telefon, email: '', judet: row.B || '', localitate: row.C || '',
      sursa, categorieProdus: categorie, valoareOferta,
      pretAchizitie: '', stadiuOferta: 'VANDUT',
      dataVanzarii: excelDateToISO(row.V || ''), dataLivrarii: excelDateToISO(row.X || ''),
      dataOfertarii: '', procentComision, comisionOferta: parseMoney(row.AA || ''),
      suprafataMp: row.L || '', mlRulouProd: '',
      observatiiClient: '', comentariiDupaContact: '',
    });
  }
  
  console.log(`Total clienți: ${clients.length}`);
  console.log(`Valoare totală: ${totalValue.toFixed(2)} RON`);
  
  fs.writeFileSync('/tmp/mapped_clients.json', JSON.stringify({ rows: clients, agentId, duplicateStrategy: 'skip' }));
} catch (e) { console.error('Error:', e); }
