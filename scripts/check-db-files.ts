import { db } from "../server/db";
import { clients } from "../shared/schema";
import { desc, isNotNull, or } from "drizzle-orm";

async function checkFiles() {
    try {
        const clientsWithFiles = await db.select()
            .from(clients)
            .where(or(isNotNull(clients.ofertaFilename), isNotNull(clients.ofertaFilename2)))
            .limit(10);

        console.log("Found clients with files:");
        clientsWithFiles.forEach(client => {
            console.log(`ID: ${client.id}, Name: ${client.nume}`);
            console.log(`  Oferta 1: ${client.ofertaFilename}`);
            console.log(`  Oferta 2: ${client.ofertaFilename2}`);
        });
    } catch (e) {
        console.error("Error checking files:", e);
    }
}

checkFiles().then(() => process.exit(0));
