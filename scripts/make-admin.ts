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

async function makeAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL nu este setat!");
    process.exit(1);
  }

  const searchName = "Dragos";
  
  console.log(`Căutând utilizatorul cu nume "${searchName}"...`);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
  const client = await pool.connect();
  
  try {
    // Search for user by first name or last name containing "Dragos"
    const searchResult = await client.query(
      `SELECT id, email, first_name, last_name, role, active 
       FROM users 
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1`,
      [`%${searchName}%`]
    );
    
    if (searchResult.rows.length === 0) {
      console.log(`\n❌ Nu s-a găsit niciun utilizator cu nume "${searchName}"`);
      return;
    }
    
    if (searchResult.rows.length > 1) {
      console.log(`\n⚠️  S-au găsit ${searchResult.rows.length} utilizatori:`);
      searchResult.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - Rol: ${user.role}`);
      });
      console.log("\nTe rog să fii mai specific (folosește email-ul exact).");
      return;
    }
    
    const user = searchResult.rows[0];
    
    if (user.role === "ADMIN") {
      console.log(`\n✅ Utilizatorul ${user.first_name} ${user.last_name} (${user.email}) este deja ADMIN!`);
      return;
    }
    
    // Update user role to ADMIN
    const updateResult = await client.query(
      `UPDATE users 
       SET role = 'ADMIN' 
       WHERE id = $1 
       RETURNING id, email, first_name, last_name, role, active`,
      [user.id]
    );
    
    if (updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      console.log("\n✅ Rol actualizat cu succes!");
      console.log(`Email: ${updated.email}`);
      console.log(`Nume: ${updated.first_name} ${updated.last_name}`);
      console.log(`Rol anterior: ${user.role}`);
      console.log(`Rol nou: ${updated.role}`);
      console.log(`Active: ${updated.active}`);
    }
  } catch (error) {
    console.error("Eroare la actualizarea rolului:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

makeAdmin().catch(console.error);
