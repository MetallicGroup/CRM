import 'dotenv/config';
import { db } from '../server/db';
import { users, clients } from '../shared/schema';
import { eq, and, or, like } from 'drizzle-orm';

async function transferClients() {
  try {
    console.log('🔍 Căutând agenții Alexandru și Dragos...\n');

    // Găsește Alexandru (poate fi Alexandru Alexandru sau Alexandru Croitoru)
    const alexandruUsers = await db.select().from(users).where(
      or(
        and(
          like(users.firstName, '%Alexandru%'),
          like(users.lastName, '%Alexandru%')
        ),
        and(
          like(users.firstName, '%Alexandru%'),
          like(users.lastName, '%Croitoru%')
        )
      )
    );

    if (alexandruUsers.length === 0) {
      console.error('❌ Nu s-a găsit agentul Alexandru!');
      process.exit(1);
    }

    const alexandru = alexandruUsers[0];
    console.log(`✅ Găsit Alexandru: ${alexandru.firstName} ${alexandru.lastName} (ID: ${alexandru.id})`);

    // Găsește Dragos (poate fi Dragos Dragos sau Dragos Frangache)
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

    // Găsește clienții lui Alexandru cu stadiul TRIMISA
    console.log('🔍 Căutând clienții lui Alexandru cu stadiul TRIMISA...\n');
    
    const clientsToTransfer = await db.select().from(clients).where(
      and(
        eq(clients.agentId, alexandru.id),
        eq(clients.stadiuOferta, 'TRIMISA' as any)
      )
    );

    console.log(`📊 Găsiți ${clientsToTransfer.length} clienți cu stadiul TRIMISA pentru Alexandru`);

    if (clientsToTransfer.length === 0) {
      console.log('⚠️  Nu există clienți de transferat!');
      process.exit(0);
    }

    // Limitează la 100 de clienți
    const clientsToTransferLimited = clientsToTransfer.slice(0, 100);
    console.log(`📝 Se vor transfera ${clientsToTransferLimited.length} clienți către Dragos\n`);

    // Transferă clienții
    let transferred = 0;
    for (const client of clientsToTransferLimited) {
      await db.update(clients)
        .set({ 
          agentId: dragos.id,
          updatedAt: new Date()
        })
        .where(eq(clients.id, client.id));
      transferred++;
    }

    console.log(`✅ Transfer complet! ${transferred} clienți au fost transferați de la ${alexandru.firstName} ${alexandru.lastName} către ${dragos.firstName} ${dragos.lastName}`);
    console.log(`\n📊 Statistici:`);
    console.log(`   - Clienți găsiți: ${clientsToTransfer.length}`);
    console.log(`   - Clienți transferați: ${transferred}`);
    console.log(`   - Clienți rămași la Alexandru: ${clientsToTransfer.length - transferred}\n`);

  } catch (error) {
    console.error('❌ Eroare la transferul clienților:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

transferClients();
