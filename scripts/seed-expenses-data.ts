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
        { nume: 'Showroom Teleorman', oras: 'Alexandria', judet: 'Teleorman' },
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
        { id: 'cat-cota-parte', name: 'Cota parte', displayOrder: 5 },
        { id: 'cat-transport-marfa', name: 'Transport marfă', displayOrder: 6 },
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

    // Level 2: Sub (Auto) – Revizii/Service, Altele
    const subAuto = [
        { id: 'sub-combustibil', parentId: 'cat-auto', name: 'Combustibil', displayOrder: 1 },
        { id: 'sub-service', parentId: 'cat-auto', name: 'Revizii/Service', displayOrder: 2 },
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

    // Level 2: Sub (Generale) – chirie, utilități, consumabile, materie primă, ambalaj, securitate, salubritate, altele, dezvoltare
    const subGenerale = [
        { id: 'sub-chirie', parentId: 'cat-generale', name: 'Chirie', displayOrder: 1 },
        { id: 'sub-utilitati', parentId: 'cat-generale', name: 'Utilități', displayOrder: 2 },
        { id: 'sub-consumabile', parentId: 'cat-generale', name: 'Consumabile', displayOrder: 3 },
        { id: 'sub-materie-prima', parentId: 'cat-generale', name: 'Materie primă', displayOrder: 4 },
        { id: 'sub-ambalaj', parentId: 'cat-generale', name: 'Ambalaj', displayOrder: 5 },
        { id: 'sub-securitate', parentId: 'cat-generale', name: 'Securitate', displayOrder: 6 },
        { id: 'sub-salubritate', parentId: 'cat-generale', name: 'Salubritate', displayOrder: 7 },
        { id: 'sub-altele-generale', parentId: 'cat-generale', name: 'Altele', displayOrder: 8 },
        { id: 'sub-echipament', parentId: 'cat-generale', name: 'Echipament', displayOrder: 9 },
        { id: 'sub-investitii', parentId: 'cat-generale', name: 'Investiții / amenajări showroom', displayOrder: 10 },
        { id: 'sub-dezvoltare-inovatie', parentId: 'cat-generale', name: 'Dezvoltare/Inovatie', displayOrder: 11 },
        { id: 'sub-dezvoltare-extindere', parentId: 'cat-generale', name: 'Dezvoltare/Extindere', displayOrder: 12 },
    ];

    // Level 2: Sub (Cota parte) – marketing, contabil/jurist, protecția/medicina muncii, abonamente, salariu brut, comision, bonuri de masa
    const subCotaParte = [
        { id: 'sub-cota-marketing', parentId: 'cat-cota-parte', name: 'Marketing', displayOrder: 1 },
        { id: 'sub-cota-contabil-jurist', parentId: 'cat-cota-parte', name: 'Contabil/Jurist', displayOrder: 2 },
        { id: 'sub-cota-protectia-medicina-muncii', parentId: 'cat-cota-parte', name: 'Protecția/Medicina muncii', displayOrder: 3 },
        { id: 'sub-cota-abonamente', parentId: 'cat-cota-parte', name: 'Abonamente', displayOrder: 4 },
        { id: 'sub-cota-salariu', parentId: 'cat-cota-parte', name: 'Salariu brut', displayOrder: 5 },
        { id: 'sub-cota-comision', parentId: 'cat-cota-parte', name: 'Comision', displayOrder: 6 },
        { id: 'sub-cota-bonuri-masa', parentId: 'cat-cota-parte', name: 'Bonuri de masa', displayOrder: 7 },
    ];

    // Level 2: Sub (Transport marfă) – flota auto, curier
    const subTransport = [
        { id: 'sub-transport-flota-auto', parentId: 'cat-transport-marfa', name: 'Flota auto', displayOrder: 1 },
        { id: 'sub-transport-curier', parentId: 'cat-transport-marfa', name: 'Curier', displayOrder: 2 },
    ];

    const allSubs = [...subSalarii, ...subAuto, ...subBugete, ...subGenerale, ...subCotaParte, ...subTransport];

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
