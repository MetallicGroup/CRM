import XLSX from 'xlsx';

const file = 'attached_assets/croitoru_vanduti_bun_1765355442205.xlsx';
const workbook = XLSX.readFile(file);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (data.length === 0) continue;
  
  const headers = data[0];
  console.log('Headers:', JSON.stringify(headers));
  
  // Show first 10 data rows for analysis
  console.log('\nFirst 10 rows:');
  for (let i = 1; i <= 10 && i < data.length; i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
}
