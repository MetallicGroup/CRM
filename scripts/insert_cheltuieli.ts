import * as fs from 'fs';
import { pool } from '../server/db';

async function insertCheltuieli() {
  const cheltuieliAgent = JSON.parse(fs.readFileSync('/tmp/cheltuieli_agent.json', 'utf8'));
  const cheltuieliSediu = JSON.parse(fs.readFileSync('/tmp/cheltuieli_sediu.json', 'utf8'));
  
  console.log(`Inserting ${cheltuieliAgent.length} cheltuieli agent...`);
  
  let agentCount = 0;
  for (const c of cheltuieliAgent) {
    const date = new Date(c.data);
    const luna = date.getMonth() + 1;
    const an = date.getFullYear();
    
    try {
      await pool.query(`
        INSERT INTO cheltuieli_agent (agent_id, category_id, subcategory_id, suma, descriere, data_cheltuiala, luna, an)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [c.agentId, c.categoryId, c.subcategoryId, c.suma, c.descriere, c.data, luna, an]);
      agentCount++;
    } catch (e: any) {
      console.error(`Error inserting agent expense:`, e.message);
    }
  }
  
  console.log(`Inserted ${agentCount} cheltuieli agent`);
  
  console.log(`\nInserting ${cheltuieliSediu.length} cheltuieli sediu...`);
  
  let sediuCount = 0;
  for (const c of cheltuieliSediu) {
    const date = new Date(c.data);
    const luna = date.getMonth() + 1;
    const an = date.getFullYear();
    
    try {
      await pool.query(`
        INSERT INTO cheltuieli_sediu (sediu_id, category_id, subcategory_id, suma, descriere, data_cheltuiala, luna, an)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [c.sediuId, c.categoryId, c.subcategoryId, c.suma, c.descriere, c.data, luna, an]);
      sediuCount++;
    } catch (e: any) {
      console.error(`Error inserting sediu expense:`, e.message);
    }
  }
  
  console.log(`Inserted ${sediuCount} cheltuieli sediu`);
  
  await pool.end();
}

insertCheltuieli();
