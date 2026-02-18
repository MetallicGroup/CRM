import "dotenv/config";
import { db } from "../server/db";
import { users, clients } from "../shared/schema";
import { and, eq, like, or } from "drizzle-orm";

async function transferRazvanStatusClients() {
  try {
    console.log("🔍 Căutând agenții Alexandru și Razvan...\n");

    // Găsește Alexandru (Alexandru Alexandru sau Alexandru Croitoru)
    const alexandruUsers = await db
      .select()
      .from(users)
      .where(
        or(
          and(
            like(users.firstName, "%Alexandru%"),
            like(users.lastName, "%Alexandru%")
          ),
          and(
            like(users.firstName, "%Alexandru%"),
            like(users.lastName, "%Croitoru%")
          )
        )
      );

    if (alexandruUsers.length === 0) {
      console.error("❌ Nu s-a găsit agentul Alexandru!");
      process.exit(1);
    }

    const alexandru = alexandruUsers[0];
    console.log(
      `✅ Găsit Alexandru: ${alexandru.firstName} ${alexandru.lastName} (ID: ${alexandru.id})`
    );

    // Găsește Razvan Rosu
    const razvanUsers = await db
      .select()
      .from(users)
      .where(
        and(
          like(users.firstName, "%Razvan%"),
          like(users.lastName, "%Rosu%")
        )
      );

    if (razvanUsers.length === 0) {
      console.error("❌ Nu s-a găsit agentul Razvan Rosu!");
      process.exit(1);
    }

    const razvan = razvanUsers[0];
    console.log(
      `✅ Găsit Razvan: ${razvan.firstName} ${razvan.lastName} (ID: ${razvan.id})\n`
    );

    // Caută clienții lui Alexandru cu stadiul ofertei = RAZVAN
    console.log(
      "🔍 Căutând clienții lui Alexandru cu stadiu ofertă = RAZVAN...\n"
    );

    const clientsToTransfer = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.agentId, alexandru.id),
          // stadiuOferta este enum în DB, dar aici folosim string-ul direct
          eq(clients.stadiuOferta, "RAZVAN" as any)
        )
      );

    console.log(
      `📊 Găsiți ${clientsToTransfer.length} clienți la Alexandru cu stadiul RAZVAN`
    );

    if (clientsToTransfer.length === 0) {
      console.log("⚠️  Nu există clienți de transferat!");
      process.exit(0);
    }

    console.log(
      `\n📝 Se vor transfera ${clientsToTransfer.length} clienți de la Alexandru la Razvan...\n`
    );

    let transferred = 0;
    for (const client of clientsToTransfer) {
      await db
        .update(clients)
        .set({
          agentId: razvan.id,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, client.id));
      transferred++;
    }

    console.log("✅ Transfer complet!");
    console.log("📊 Statistici:");
    console.log(`   - Clienți găsiți cu stadiu RAZVAN la Alexandru: ${clientsToTransfer.length}`);
    console.log(`   - Clienți transferați către Razvan: ${transferred}\n`);
  } catch (error) {
    console.error("❌ Eroare la transferul clienților:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

transferRazvanStatusClients();

