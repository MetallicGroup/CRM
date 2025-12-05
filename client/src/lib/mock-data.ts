import { Employee, Distributor, MONTHS, Showroom } from './types';

// Helper pentru a crea date lunare goale
const createEmptyMonthlyData = () => {
  const data: any = {};
  MONTHS.forEach(month => {
    data[month] = {
      month,
      venitTVA: 0, 
      venitGard: 0, 
      venitAcoperis: 0, 
      achizitieGard: 0,
      achizitieAcoperis: 0,
      comisionPercent: 0,
      salariu: 0,
      amortizareAuto: 0, 
      combustibil: 0, 
      revizii: 0, 
      alteCheltuieliAuto: 0, 
      abonamente: 0, 
      diurne: 0,
      alteCheltuieli: 0,
      costAmbalarePropriu: 0, 
      costCurierAmbalare: 0, 
      costCurierTransport: 0, 
      transportIntern: 0
    };
  });
  return data;
};

export const INITIAL_SHOWROOMS: Showroom[] = [
  { 
    id: 'sh_constanta', 
    name: 'Showroom Constanța', 
    location: 'Constanta',
    costs: { rent: 1000, utilities: 300, marketing: 500, subscriptions: 100, consumables: 100 }
  },
  { 
    id: 'sh_giurgiu', 
    name: 'Showroom Giurgiu', 
    location: 'Giurgiu',
    costs: { rent: 800, utilities: 250, marketing: 400, subscriptions: 100, consumables: 100 }
  },
  { 
    id: 'sh_teleorman', 
    name: 'Showroom Teleorman', 
    location: 'Teleorman',
    costs: { rent: 600, utilities: 200, marketing: 300, subscriptions: 50, consumables: 50 }
  },
  { 
    id: 'sh_bucuresti', 
    name: 'Showroom București', 
    location: 'Bucuresti',
    costs: { rent: 1500, utilities: 400, marketing: 800, subscriptions: 200, consumables: 200 }
  },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  // === ANGAJAȚI TIP INDIRECT (costurile lor merg în pool-ul indirect) ===
  { id: 'emp_daniel', name: 'Daniel', type: 'INDIRECT', showroomId: null, monthlyData: createEmptyMonthlyData() },
  { id: 'emp_dana', name: 'Dana', type: 'INDIRECT', showroomId: null, monthlyData: createEmptyMonthlyData() },
  { id: 'emp_raluca', name: 'Raluca', type: 'INDIRECT', showroomId: null, monthlyData: createEmptyMonthlyData() },
  { id: 'emp_iulian', name: 'Iulian', type: 'INDIRECT', showroomId: null, monthlyData: createEmptyMonthlyData() },
  
  // === ANGAJAȚI TIP PRODUCȚIE (costurile lor se distribuie doar celor cu garduri) ===
  { id: 'emp_kuke', name: 'Kuke', type: 'PRODUCTIE', showroomId: null, monthlyData: createEmptyMonthlyData() },
  { id: 'emp_madalina', name: 'Mădălina', type: 'PRODUCTIE', showroomId: null, monthlyData: createEmptyMonthlyData() },
  { id: 'emp_marian_prod', name: 'Marian (Prod)', type: 'PRODUCTIE', showroomId: null, monthlyData: createEmptyMonthlyData() },
  { id: 'emp_marin', name: 'Marin', type: 'PRODUCTIE', showroomId: null, monthlyData: createEmptyMonthlyData() },
  { id: 'emp_laurentiu', name: 'Laurențiu', type: 'PRODUCTIE', showroomId: null, monthlyData: createEmptyMonthlyData() },
  
  // === AGENȚI CONSTANȚA ===
  { id: 'ag_dragos', name: 'Dragoș', type: 'AGENT', showroomId: 'sh_constanta', monthlyData: createEmptyMonthlyData() },
  { id: 'ag_oana', name: 'Oana', type: 'AGENT', showroomId: 'sh_constanta', monthlyData: createEmptyMonthlyData() },
  
  // === AGENȚI GIURGIU ===
  { id: 'ag_marian_t', name: 'Marian Toma', type: 'AGENT', showroomId: 'sh_giurgiu', monthlyData: createEmptyMonthlyData() },
  { id: 'ag_cristina_t', name: 'Cristina Toma', type: 'AGENT', showroomId: 'sh_giurgiu', monthlyData: createEmptyMonthlyData() },
  
  // === AGENȚI TELEORMAN ===
  { id: 'ag_alexandra', name: 'Alexandra TR', type: 'AGENT', showroomId: 'sh_teleorman', monthlyData: createEmptyMonthlyData() },
  
  // === AGENȚI BUCUREȘTI ===
  { id: 'ag_alexandru_c', name: 'Alexandru Croitoru', type: 'AGENT', showroomId: 'sh_bucuresti', monthlyData: createEmptyMonthlyData() },
  { id: 'ag_marian_c', name: 'Marian Costache', type: 'AGENT', showroomId: 'sh_bucuresti', monthlyData: createEmptyMonthlyData() },
  { id: 'ag_iulian_m', name: 'Iulian Marcu', type: 'AGENT', showroomId: 'sh_bucuresti', monthlyData: createEmptyMonthlyData() },
];

export const INITIAL_DISTRIBUTORS: Distributor[] = [
  { id: 'dist1', name: 'Distribuitor 1', monthlyData: {} as any }
];

MONTHS.forEach(month => {
  INITIAL_DISTRIBUTORS.forEach(dist => {
    dist.monthlyData[month] = {
      month,
      venitTVA: 0, achizitieTVA: 0, comisionPercent: 0, cheltuieliMarketing: 0,
      costTransport: 0, costAmbalare: 0
    };
  });
});
