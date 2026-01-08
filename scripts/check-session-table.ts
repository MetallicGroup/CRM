
import { Pool } from '@neondatabase/serverless';
import ws from "ws";

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
    const client = await pool.connect();
    try {
        console.log("Checking if user_sessions table exists...");
        const res = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_sessions')");
        console.log("Table exists:", res.rows[0].exists);

        if (res.rows[0].exists) {
            console.log("Checking table schema...");
            const schemaRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_sessions'");
            console.log("Table schema:", JSON.stringify(schemaRes.rows, null, 2));

            console.log("Checking row count...");
            const countRes = await client.query("SELECT COUNT(*) FROM user_sessions");
            console.log("Session count:", countRes.rows[0].count);
        } else {
            console.log("Table 'user_sessions' is missing!");
        }
    } catch (error) {
        console.error("Error checking session table:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
