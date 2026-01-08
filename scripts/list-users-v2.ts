
import { Pool } from '@neondatabase/serverless';
import ws from "ws";

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws });
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT email, role FROM users');
        console.log(JSON.stringify(res.rows, null, 2));
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
