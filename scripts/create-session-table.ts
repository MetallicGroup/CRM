
import { Pool } from '@neondatabase/serverless';
import ws from "ws";

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
    const client = await pool.connect();
    try {
        console.log("Creating user_sessions table...");
        const sql = `
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);

      ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "user_sessions_pkey";
      ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

      DROP INDEX IF EXISTS "IDX_session_expire";
      CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");
    `;
        await client.query(sql);
        console.log("Table 'user_sessions' created successfully.");
    } catch (error) {
        console.error("Error creating session table:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
