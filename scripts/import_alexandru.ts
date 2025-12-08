import fs from 'fs';
import Papa from 'papaparse';

const csvPath = 'attached_assets/template_import_clienti_(1)_-_template_import_clienti_(1).csv_1765186233631.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');

const result = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
console.log(`Total rows parsed: ${result.data.length}`);

const columnMap: Record<string, string> = {
  'Nume Client': 'nume',
  'Judet': 'judet', 
  'Adresa': 'localitate',
  'Telefon': 'telefon',
  'Data ofertarii': 'dataOfertarii',
  'Sursa de provenienta': 'sursa',
  'ML Rulou': 'mlRulouProd',
  'Valoare Oferta': 'valoareOferta',
  'CATEGORIE PRODUS': 'categorieProdus',
  'Brand': 'brand',
  'Model': 'model',
  'Suprafata MP': 'suprafataMp',
  'Culoare': 'culoare',
  'Grosime': 'grosime',
  'Finisaj': 'finisaj',
  'Smart Drip stop (checkbox)': 'smartDripstop',
  'Data de revenire': 'dataRevenire1',
  'Comentariu / Observatii 1': 'comentariuObservatii1',
  'Data Revenire 2': 'dataRevenire2',
  'Comentariu / Observatii 2': 'comentariuObservatii2',
  'Stadiu Oferta': 'stadiuOferta',
  'Data vanzarii': 'dataVanzarii',
  'Stadiu Comanda': 'stadiuComanda',
  'Data livrarii': 'dataLivrarii',
  'Incasat ? (checkbox)': 'incasat',
  'Procent Comision': 'procentComision'
};

const mappedRows = (result.data as Record<string, string>[]).map(row => {
  const mapped: Record<string, string> = {};
  for (const [csvCol, dbCol] of Object.entries(columnMap)) {
    if (row[csvCol] !== undefined && row[csvCol] !== '') {
      mapped[dbCol] = row[csvCol];
    }
  }
  return mapped;
}).filter(row => row.nume);

console.log(`Rows with valid names: ${mappedRows.length}`);
fs.writeFileSync('/tmp/mapped_clients.json', JSON.stringify({ rows: mappedRows, agentId: 'ag_alexandru_c', duplicateStrategy: 'skip' }));
console.log('Mapped data saved to /tmp/mapped_clients.json');
