import 'dotenv/config';
import { db } from '../server/db';
import { users, clients } from '../shared/schema';
import { eq, and, or, like, gte } from 'drizzle-orm';

async function transferClientsBack() {
  try {
    console.log('🔍 Căutând agenții Alexandru și Dragos...\n');

    // Găsește Alexandru
    const alexandruUsers = await db.select().from(users).where(
      or(
        and(
          like(users.firstName, '%Alexandru%'),
          like(users.lastName, '%Croitoru%')
        ),
        and(
          like(users.firstName, '%Alexandru%'),
          like(users.lastName, '%Alexandru%')
        )
      )
    );

    if (alexandruUsers.length === 0) {
      console.error('❌ Nu s-a găsit agentul Alexandru!');
      process.exit(1);
    }

    const alexandru = alexandruUsers[0];
    console.log(`✅ Găsit Alexandru: ${alexandru.firstName} ${alexandru.lastName} (ID: ${alexandru.id})`);

    // Găsește Dragos
    const dragosUsers = await db.select().from(users).where(
      and(
        like(users.firstName, '%Dragos%'),
        or(
          like(users.lastName, '%Dragos%'),
          like(users.lastName, '%Frangache%')
        )
      )
    );

    if (dragosUsers.length === 0) {
      console.error('❌ Nu s-a găsit agentul Dragos!');
      process.exit(1);
    }

    const dragos = dragosUsers[0];
    console.log(`✅ Găsit Dragos: ${dragos.firstName} ${dragos.lastName} (ID: ${dragos.id})\n`);

    // Data de referință: 1 ianuarie 2026
    const referenceDate = new Date('2026-01-01T00:00:00.000Z');
    console.log(`📅 Căutând clienți cu Data Ofertării >= ${referenceDate.toISOString().split('T')[0]}...\n`);

    // Găsește clienții lui Dragos cu dataOfertarii >= 1 ianuarie 2026
    const clientsToTransfer = await db.select().from(clients).where(
      and(
        eq(clients.agentId, dragos.id),
        gte(clients.dataOfertarii, referenceDate)
      )
    );

    console.log(`📊 Găsiți ${clientsToTransfer.length} clienți la Dragos cu Data Ofertării >= 1 ianuarie 2026`);

    if (clientsToTransfer.length === 0) {
      console.log('⚠️  Nu există clienți de transferat înapoi!');
      process.exit(0);
    }

    // Transferă clienții înapoi la Alexandru
    console.log(`\n📝 Se vor transfera ${clientsToTransfer.length} clienți înapoi la Alexandru...\n`);

    let transferred = 0;
    for (const client of clientsToTransfer) {
      await db.update(clients)
        .set({ 
          agentId: alexandru.id,
          updatedAt: new Date()
        })
        .where(eq(clients.id, client.id));
      transferred++;
    }

    console.log(`✅ Transfer complet! ${transferred} clienți au fost transferați înapoi de la ${dragos.firstName} ${dragos.lastName} către ${alexandru.firstName} ${alexandru.lastName}`);
    console.log(`\n📊 Statistici:`);
    console.log(`   - Clienți găsiți cu Data Ofertării >= 1 ianuarie 2026: ${clientsToTransfer.length}`);
    console.log(`   - Clienți transferați înapoi: ${transferred}\n`);

  } catch (error) {
    console.error('❌ Eroare la transferul clienților:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

transferClientsBack();
