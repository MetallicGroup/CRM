import { db } from '../server/db';
import { sedii, expenseCategories } from '../shared/schema';

async function seed() {
    console.log('Seeding expense data...');

    // 1. Seed Sedii (lista de sedii: central, hală producție, showroom-uri)
    console.log('Seeding sedii...');
    const sediiData = [
        { nume: 'Sediu central București', oras: 'București', judet: 'București' },
        { nume: 'Hală producție', oras: 'București', judet: 'Ilfov' },
        { nume: 'Showroom Bragadiru', oras: 'Bragadiru', judet: 'Ilfov' },
        { nume: 'Showroom Constanța', oras: 'Constanța', judet: 'Constanța' },
        { nume: 'Showroom TR', oras: 'Alexandria', judet: 'Teleorman' },
        { nume: 'Showroom Giurgiu', oras: 'Giurgiu', judet: 'Giurgiu' },
    ];

    for (const s of sediiData) {
        await db.insert(sedii).values({
            nume: s.nume,
            oras: s.oras,
            judet: s.judet,
            activ: true,
        }).onConflictDoNothing();
    }

    // 2. Seed Expense Categories
    console.log('Seeding expense categories...');

    // Level 1: Main
    const mainCats = [
        { id: 'cat-salarii', name: 'Salarii + bonusuri', displayOrder: 1 },
        { id: 'cat-auto', name: 'Cheltuieli auto', displayOrder: 2 },
        { id: 'cat-generale', name: 'Cheltuieli generale', displayOrder: 3 },
        { id: 'cat-bugete', name: 'Bugete de stat', displayOrder: 4 },
    ];

    for (const cat of mainCats) {
        await db.insert(expenseCategories).values({
            id: cat.id,
            name: cat.name,
            level: 'main',
            displayOrder: cat.displayOrder,
            active: true,
        }).onConflictDoNothing();
    }

    // Level 2: Sub (Salarii)
    const subSalarii = [
        { id: 'sub-salariu-brut', parentId: 'cat-salarii', name: 'Salariu brut', displayOrder: 1 },
        { id: 'sub-comision', parentId: 'cat-salarii', name: 'Comision', displayOrder: 2 },
        { id: 'sub-bonuri', parentId: 'cat-salarii', name: 'Bonuri de masa', displayOrder: 3 },
    ];

    // Level 2: Sub (Auto) – Service, Altele (în loc de Revizie)
    const subAuto = [
        { id: 'sub-combustibil', parentId: 'cat-auto', name: 'Combustibil', displayOrder: 1 },
        { id: 'sub-service', parentId: 'cat-auto', name: 'Service', displayOrder: 2 },
        { id: 'sub-altele-auto', parentId: 'cat-auto', name: 'Altele', displayOrder: 3 },
        { id: 'sub-asigurări', parentId: 'cat-auto', name: 'Asigurări', displayOrder: 4 },
        { id: 'sub-leasing', parentId: 'cat-auto', name: 'Leasing', displayOrder: 5 },
        { id: 'sub-rovinieta', parentId: 'cat-auto', name: 'Rovinieta', displayOrder: 6 },
    ];

    // Level 2: Sub (Bugete de stat)
    const subBugete = [
        { id: 'sub-tva', parentId: 'cat-bugete', name: 'TVA', displayOrder: 1 },
        { id: 'sub-impozit', parentId: 'cat-bugete', name: 'Impozit', displayOrder: 2 },
        { id: 'sub-penalitati', parentId: 'cat-bugete', name: 'Penalități', displayOrder: 3 },
        { id: 'sub-esalonari', parentId: 'cat-bugete', name: 'Eșalonări', displayOrder: 4 },
    ];

    // Level 2: Sub (Generale) – chirie, utilități, consumabile, materie primă și ambalaj, securitate, abonamente, salubritate, altele
    const subGenerale = [
        { id: 'sub-chirie', parentId: 'cat-generale', name: 'Chirie', displayOrder: 1 },
        { id: 'sub-utilitati', parentId: 'cat-generale', name: 'Utilități', displayOrder: 2 },
        { id: 'sub-consumabile', parentId: 'cat-generale', name: 'Consumabile', displayOrder: 3 },
        { id: 'sub-materie-ambalaj', parentId: 'cat-generale', name: 'Materie primă și ambalaj', displayOrder: 4 },
        { id: 'sub-securitate', parentId: 'cat-generale', name: 'Securitate', displayOrder: 5 },
        { id: 'sub-abonamente', parentId: 'cat-generale', name: 'Abonamente', displayOrder: 6 },
        { id: 'sub-salubritate', parentId: 'cat-generale', name: 'Salubritate', displayOrder: 7 },
        { id: 'sub-altele-generale', parentId: 'cat-generale', name: 'Altele', displayOrder: 8 },
        { id: 'sub-echipament', parentId: 'cat-generale', name: 'Echipament', displayOrder: 9 },
        { id: 'sub-marketing', parentId: 'cat-generale', name: 'Marketing', displayOrder: 10 },
        { id: 'sub-investitii', parentId: 'cat-generale', name: 'Investiții / amenajări showroom', displayOrder: 11 },
    ];

    const allSubs = [...subSalarii, ...subAuto, ...subBugete, ...subGenerale];

    for (const sub of allSubs) {
        await db.insert(expenseCategories).values({
            id: sub.id,
            parentId: sub.parentId,
            name: sub.name,
            level: 'sub',
            displayOrder: sub.displayOrder,
            active: true,
        }).onConflictDoNothing();
    }

    console.log('Seeding completed!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
