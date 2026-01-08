
import { Pool } from '@neondatabase/serverless';
import ws from "ws";

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
    const client = await pool.connect();
    try {
        console.log("Updating offer_status enum in DB...");

        // 1. Rename old enum if necessary or just drop and recreate if not used much
        // Safer approach for Neon/Postgres: add new values, then rename/cleanup

        const sql = `
      -- 1. Create a temporary type with new values
      DO $$ BEGIN
        CREATE TYPE offer_status_new AS ENUM ('NOUA', 'TRIMISA', 'IN_ASTEPTARE', 'ACCEPTATA', 'VANDUT', 'REFUZAT', 'ANULATA');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- 2. Update the default value of the column temporarily to null or a valid new value
      ALTER TABLE clients ALTER COLUMN stadiu_oferta SET DEFAULT NULL;

      -- 3. Update the column data to match the new enum values
      -- Mapping: NOU -> NOUA, TRIMISA -> TRIMISA, etc.
      ALTER TABLE clients ALTER COLUMN stadiu_oferta TYPE text USING stadiu_oferta::text;
      
      UPDATE clients SET stadiu_oferta = 'NOUA' WHERE stadiu_oferta IN ('NOU', 'NOUA', 'NOUĂ');
      UPDATE clients SET stadiu_oferta = 'TRIMISA' WHERE stadiu_oferta IN ('OFERTAT', 'TRIMISA');
      UPDATE clients SET stadiu_oferta = 'IN_ASTEPTARE' WHERE stadiu_oferta IN ('FOLLOW_UP', 'IN_ASTEPTARE');
      UPDATE clients SET stadiu_oferta = 'REFUZAT' WHERE stadiu_oferta IN ('PIERDUT', 'REFUZAT');

      -- 4. Convert column to use the new type
      ALTER TABLE clients ALTER COLUMN stadiu_oferta TYPE offer_status_new USING stadiu_oferta::offer_status_new;

      -- 5. Drop old type and rename new type
      DROP TYPE offer_status CASCADE;
      ALTER TYPE offer_status_new RENAME TO offer_status;

      -- 6. Restore the default value
      ALTER TABLE clients ALTER COLUMN stadiu_oferta SET DEFAULT 'NOUA';
    `;

        await client.query(sql);
        console.log("Database enum 'offer_status' updated successfully.");
    } catch (error) {
        console.error("Error updating DB enum:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
