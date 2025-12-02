export type Month = 
  | 'Ianuarie' | 'Februarie' | 'Martie' | 'Aprilie' | 'Mai' | 'Iunie' 
  | 'Iulie' | 'August' | 'Septembrie' | 'Octombrie' | 'Noiembrie' | 'Decembrie';

export const MONTHS: Month[] = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

export type EmployeeType = 'AGENT' | 'PRODUCTIE' | 'INDIRECT';

export interface Showroom {
  id: string;
  name: string;
  location: 'Constanta' | 'Giurgiu' | 'Teleorman' | 'Bucuresti'; 
  costs: {
    rent: number;
    utilities: number;
    marketing: number;
    subscriptions: number;
    consumables: number;
  };
}

export interface EmployeeMonthlyData {
  month: Month;
  
  // Venituri - MANUAL (pentru AGENT, pentru PRODUCTIE/INDIRECT vor fi 0)
  venitTVA: number;
  venitGard: number; 
  venitAcoperis: number; 
  
  // Achiziții - MANUAL
  achizitieGard: number;
  achizitieAcoperis: number;
  
  comisionPercent: number;
  
  // Costuri directe (Input per month) - toți angajații au
  salariu: number;
  amortizareAuto: number;
  combustibil: number;
  revizii: number;
  alteCheltuieliAuto: number;
  abonamente: number;
  diurne: number;
  
  // Costuri logistice (doar pentru AGENT)
  costAmbalarePropriu: number;
  costCurierAmbalare: number;
  costCurierTransport: number;
  transportIntern: number;
}

export interface Employee {
  id: string;
  name: string;
  type: EmployeeType; // AGENT, PRODUCTIE, sau INDIRECT
  showroomId: string | null; // null pentru PRODUCTIE și INDIRECT
  monthlyData: Record<Month, EmployeeMonthlyData>;
}

export interface Distributor {
  id: string;
  name: string;
  monthlyData: Record<Month, DistributorMonthlyData>;
}

export interface DistributorMonthlyData {
  month: Month;
  venitTVA: number;
  achizitieTVA: number;
  comisionPercent: number;
  cheltuieliMarketing: number;
  costTransport: number;
  costAmbalare: number;
}
