import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/tmp/mapped_clients.json', 'utf8'));
const rows = data.rows;
const agentId = data.agentId;
const batchSize = 100;
const totalBatches = Math.ceil(rows.length / batchSize);

console.log(`Total clients: ${rows.length}`);
console.log(`Batch size: ${batchSize}`);
console.log(`Total batches: ${totalBatches}`);

async function login() {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@metallicgroup.ro', password: 'admin123' })
  });
  const cookies = res.headers.get('set-cookie');
  return cookies;
}

async function importBatch(batch: any[], cookie: string, batchNum: number) {
  const res = await fetch('http://localhost:5000/api/clients/import', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({ rows: batch, agentId, duplicateStrategy: 'create' })
  });
  const result = await res.json();
  console.log(`Batch ${batchNum}/${totalBatches}: success=${result.success}, errors=${result.errors}, skipped=${result.skipped}`);
  return result;
}

async function main() {
  const cookie = await login();
  if (!cookie) {
    console.error('Failed to login');
    return;
  }
  
  let totalSuccess = 0, totalErrors = 0, totalSkipped = 0;
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, rows.length);
    const batch = rows.slice(start, end);
    
    const result = await importBatch(batch, cookie, i + 1);
    totalSuccess += result.success || 0;
    totalErrors += result.errors || 0;
    totalSkipped += result.skipped || 0;
  }
  
  console.log(`\n=== TOTAL ===`);
  console.log(`Success: ${totalSuccess}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Skipped: ${totalSkipped}`);
}

main();
