import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import bcrypt from "bcrypt";
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

async function createAgent() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL nu este setat!");
    process.exit(1);
  }

  const email = "razvan@metallicgroup.ro";
  const password = "razvan123";
  const firstName = "Razvan";
  const lastName = "Rosu"; // Based on reference in routes.ts
  
  console.log(`Creating agent user: ${email}...`);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
  const client = await pool.connect();
  
  try {
    // Check if user already exists
    const checkResult = await client.query('SELECT id, email, role, active FROM users WHERE email = $1', [email]);
    
    if (checkResult.rows.length > 0) {
      console.log(`\n⚠️  Utilizatorul cu email-ul ${email} există deja!`);
      console.log(`Email: ${checkResult.rows[0].email}`);
      console.log(`Rol: ${checkResult.rows[0].role}`);
      console.log(`Active: ${checkResult.rows[0].active}`);
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert new user
    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, active`,
      [email, passwordHash, firstName, lastName, "AGENT", true]
    );
    
    if (insertResult.rows.length > 0) {
      const newUser = insertResult.rows[0];
      console.log("\n✅ Cont de agent creat cu succes!");
      console.log(`Email: ${newUser.email}`);
      console.log(`Parolă: ${password}`);
      console.log(`Nume: ${newUser.first_name} ${newUser.last_name}`);
      console.log(`Rol: ${newUser.role}`);
      console.log(`Active: ${newUser.active}`);
    }
  } catch (error) {
    console.error("Eroare la crearea utilizatorului:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAgent().catch(console.error);
