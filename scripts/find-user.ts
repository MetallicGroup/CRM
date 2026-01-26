import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, like, or } from 'drizzle-orm';

async function findUser() {
    try {
        console.log('Searching for users with name like Croitoru...');
        const results = await db.select().from(users).where(
            or(
                like(users.firstName, '%Croitoru%'),
                like(users.lastName, '%Croitoru%'),
                like(users.email, '%croitoru%')
            )
        );

        if (results.length === 0) {
            console.log('No user found with name Madalina.');
            // List all users to be sure
            const allUsers = await db.select().from(users);
            console.log('All users:', allUsers.map(u => ({ id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, role: u.role })));
        } else {
            console.log('Found users:', results.map(u => ({ id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, role: u.role })));
        }
    } catch (error) {
        console.error('Error finding user:', error);
    } finally {
        process.exit(0);
    }
}

findUser();
