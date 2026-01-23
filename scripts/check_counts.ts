import { db } from '../server/db';
import { expenseCategories, sedii } from '../shared/schema';
import { count } from 'drizzle-orm';

async function checkCounts() {
    try {
        const [catCount] = await db.select({ count: count() }).from(expenseCategories);
        const [sediuCount] = await db.select({ count: count() }).from(sedii);

        console.log(`Expense Categories count: ${catCount.count}`);
        console.log(`Sedii count: ${sediuCount.count}`);

        if (sediuCount.count > 0) {
            const allSedii = await db.select().from(sedii);
            console.log('Sedii samples:', JSON.stringify(allSedii.slice(0, 3), null, 2));
        }

        if (catCount.count > 0) {
            const allCats = await db.select().from(expenseCategories);
            console.log('Category samples:', JSON.stringify(allCats.slice(0, 3), null, 2));
        }
    } catch (error) {
        console.error('Error checking counts:', error);
    } finally {
        process.exit(0);
    }
}

checkCounts();
