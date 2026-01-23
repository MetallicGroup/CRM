import { db } from '../server/db';
import { sedii, expenseCategories } from '../shared/schema';

async function seed() {
    console.log('Seeding expense data...');

    // 1. Seed Sedii
    console.log('Seeding sedii...');
    const sediiData = [
        { nume: 'Showroom București', oras: 'București', judet: 'București' },
        { nume: 'Showroom Constanța', oras: 'Constanța', judet: 'Constanța' },
        { nume: 'Showroom Teleorman', oras: 'Alexandria', judet: 'Teleorman' },
        { nume: 'Showroom Giurgiu', oras: 'Giurgiu', judet: 'Giurgiu' },
        { nume: 'Showroom Brăgădiru', oras: 'Brăgădiru', judet: 'Ilfov' },
        { nume: 'Showroom Bârlad', oras: 'Bârlad', judet: 'Vaslui' },
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

    // Level 2: Sub (Auto)
    const subAuto = [
        { id: 'sub-combustibil', parentId: 'cat-auto', name: 'Combustibil', displayOrder: 1 },
        { id: 'sub-revizii', parentId: 'cat-auto', name: 'Revizii', displayOrder: 2 },
        { id: 'sub-asigurări', parentId: 'cat-auto', name: 'Asigurări', displayOrder: 3 },
        { id: 'sub-leasing', parentId: 'cat-auto', name: 'Leasing', displayOrder: 4 },
        { id: 'sub-rovinieta', parentId: 'cat-auto', name: 'Rovinieta', displayOrder: 5 },
    ];

    // Level 2: Sub (Generale)
    const subGenerale = [
        { id: 'sub-echipament', parentId: 'cat-generale', name: 'Echipament', displayOrder: 1 },
        { id: 'sub-showroom', parentId: 'cat-generale', name: 'Cota parte showroom', displayOrder: 2 },
        { id: 'sub-cota-generale', parentId: 'cat-generale', name: 'Cota parte generale', displayOrder: 3 },
        { id: 'sub-marketing', parentId: 'cat-generale', name: 'Marketing', displayOrder: 4 },
        { id: 'sub-investitii', parentId: 'cat-generale', name: 'Investiții / amenajări showroom', displayOrder: 5 },
        { id: 'sub-medicina-muncii', parentId: 'cat-generale', name: 'Protecția medicina muncii', displayOrder: 6 },
        { id: 'sub-contabil-jurist', parentId: 'cat-generale', name: 'Contabil / jurist', displayOrder: 7 },
        { id: 'sub-neproductivi', parentId: 'cat-generale', name: 'Angajații neproductivi', displayOrder: 8 },
        { id: 'sub-credite-banci', parentId: 'cat-generale', name: 'Credite / bănci', displayOrder: 9 },
    ];

    const allSubs = [...subSalarii, ...subAuto, ...subGenerale];

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
