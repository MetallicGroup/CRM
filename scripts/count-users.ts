import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env file manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "..", ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  // .env file might not exist, that's okay
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL nu este setat!");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
  const client = await pool.connect();
  
  try {
    const res = await client.query('SELECT email, role, active FROM users ORDER BY email');
    const allUsers = res.rows;
    const totalCount = allUsers.length;
    
    const byRole = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const activeCount = allUsers.filter(u => u.active).length;
    const inactiveCount = allUsers.filter(u => !u.active).length;
    
    console.log("\n=== NUMĂR CONTURI CRM ===\n");
    console.log(`Total conturi: ${totalCount}`);
    console.log(`  - Active: ${activeCount}`);
    console.log(`  - Inactive: ${inactiveCount}`);
    console.log("\nDupă rol:");
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count}`);
    });
    console.log("\n");
    
  } catch (error) {
    console.error("Eroare la numărarea utilizatorilor:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
