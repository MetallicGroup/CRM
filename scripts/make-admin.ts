import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function makeAdmin() {
    const email = 'madalina@metallicgroup.ro';
    try {
        console.log(`Updating user ${email} to ADMIN...`);
        const result = await db.update(users)
            .set({ role: 'ADMIN' })
            .where(eq(users.email, email))
            .returning();

        if (result.length > 0) {
            console.log('Update successful:', JSON.stringify({
                id: result[0].id,
                email: result[0].email,
                role: result[0].role
            }, null, 2));
        } else {
            console.log('User not found.');
        }
    } catch (error) {
        console.error('Error updating user:', error);
    } finally {
        process.exit(0);
    }
}

makeAdmin();
