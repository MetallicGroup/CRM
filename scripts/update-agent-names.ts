import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, or, and, like } from 'drizzle-orm';

async function updateAgentNames() {
  try {
    console.log('🔄 Actualizare nume agenți...\n');

    // Lista agenților care trebuie să fie în filtre
    const allowedAgents = [
      { firstName: 'Dragos', lastName: 'Frangache' },
      { firstName: 'Oana', lastName: 'Moneaga' },
      { firstName: 'Alexandru', lastName: 'Croitoru' },
      { firstName: 'Marian', lastName: 'Toma' },
      { firstName: 'Marian', lastName: 'Costache' },
      { firstName: 'Razvan', lastName: 'Rosu' },
      { firstName: 'Marcu', lastName: 'Iulian' }
    ];

    // Actualizează Alexandru Alexandru → Alexandru Croitoru
    console.log('📝 Actualizare Alexandru Alexandru → Alexandru Croitoru...');
    const alexandruOld = await db.select().from(users).where(
      and(
        like(users.firstName, '%Alexandru%'),
        like(users.lastName, '%Alexandru%')
      )
    );

    if (alexandruOld.length > 0) {
      for (const user of alexandruOld) {
        await db.update(users)
          .set({ 
            firstName: 'Alexandru',
            lastName: 'Croitoru'
          })
          .where(eq(users.id, user.id));
        console.log(`   ✅ Actualizat: ${user.firstName} ${user.lastName} → Alexandru Croitoru`);
      }
    } else {
      console.log('   ℹ️  Nu s-a găsit "Alexandru Alexandru" (poate e deja actualizat)');
    }

    // Actualizează Oana Oana → Oana Moneaga
    console.log('\n📝 Actualizare Oana Oana → Oana Moneaga...');
    const oanaOld = await db.select().from(users).where(
      and(
        like(users.firstName, '%Oana%'),
        like(users.lastName, '%Oana%')
      )
    );

    if (oanaOld.length > 0) {
      for (const user of oanaOld) {
        await db.update(users)
          .set({ 
            firstName: 'Oana',
            lastName: 'Moneaga'
          })
          .where(eq(users.id, user.id));
        console.log(`   ✅ Actualizat: ${user.firstName} ${user.lastName} → Oana Moneaga`);
      }
    } else {
      console.log('   ℹ️  Nu s-a găsit "Oana Oana" (poate e deja actualizat)');
    }

    // Actualizează Dragos Dragos → Dragos Frangache
    console.log('\n📝 Actualizare Dragos Dragos → Dragos Frangache...');
    const dragosOld = await db.select().from(users).where(
      and(
        like(users.firstName, '%Dragos%'),
        like(users.lastName, '%Dragos%')
      )
    );

    if (dragosOld.length > 0) {
      for (const user of dragosOld) {
        await db.update(users)
          .set({ 
            firstName: 'Dragos',
            lastName: 'Frangache'
          })
          .where(eq(users.id, user.id));
        console.log(`   ✅ Actualizat: ${user.firstName} ${user.lastName} → Dragos Frangache`);
      }
    } else {
      console.log('   ℹ️  Nu s-a găsit "Dragos Dragos" (poate e deja actualizat)');
    }

    // Verifică și actualizează toți agenții din listă pentru a fi siguri că au numele corecte
    console.log('\n📝 Verificare și actualizare nume pentru toți agenții din listă...');
    for (const agent of allowedAgents) {
      const found = await db.select().from(users).where(
        and(
          like(users.firstName, `%${agent.firstName}%`),
          like(users.lastName, `%${agent.lastName}%`)
        )
      );

      if (found.length > 0) {
        for (const user of found) {
          if (user.firstName !== agent.firstName || user.lastName !== agent.lastName) {
            await db.update(users)
              .set({ 
                firstName: agent.firstName,
                lastName: agent.lastName
              })
              .where(eq(users.id, user.id));
            console.log(`   ✅ Actualizat: ${user.firstName} ${user.lastName} → ${agent.firstName} ${agent.lastName}`);
          }
        }
      }
    }

    console.log('\n✅ Actualizare nume agenți completă!\n');

  } catch (error) {
    console.error('❌ Eroare la actualizarea numelor agenților:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updateAgentNames();
