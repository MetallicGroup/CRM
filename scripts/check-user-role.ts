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

async function checkUserRole() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL nu este setat!");
    process.exit(1);
  }

  const email = "alexandru@metallicgroup.ro";
  
  console.log(`Căutând utilizatorul cu email "${email}"...`);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT id, email, first_name, last_name, role, active 
       FROM users 
       WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log(`\n❌ Nu s-a găsit utilizatorul cu email "${email}"`);
      return;
    }
    
    const user = result.rows[0];
    
    console.log("\n=== DETALII UTILIZATOR ===\n");
    console.log(`Email: ${user.email}`);
    console.log(`Nume: ${user.first_name} ${user.last_name}`);
    console.log(`Rol: ${user.role}`);
    console.log(`Active: ${user.active ? "Da" : "Nu"}`);
    
    if (user.role === "ADMIN") {
      console.log("\n✅ Utilizatorul este ADMIN");
    } else {
      console.log(`\n⚠️  Utilizatorul este ${user.role} (nu este ADMIN)`);
    }
    console.log("\n");
    
  } catch (error) {
    console.error("Eroare la verificarea utilizatorului:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUserRole().catch(console.error);
