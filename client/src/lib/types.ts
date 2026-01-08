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
  valoareComision?: number; // Optional - comes from API (comisionGard + comisionAcoperis)

  // Costuri directe (Input per month) - toți angajații au
  salariu: number;
  amortizareAuto: number;
  combustibil: number;
  revizii: number;
  alteCheltuieliAuto: number;
  abonamente: number;
  diurne: number;
  alteCheltuieli: number;

  // Costuri logistice (doar pentru AGENT)
  costAmbalarePropriu: number;
  costCurierAmbalare: number;
  costCurierTransport: number;
  transportIntern: number;
}

// Cheltuieli fixe lunare (se aplică automat la fiecare lună)
export interface EmployeeFixedCosts {
  salariuLunar: number;
  amortizareAutoLunar: number;
  combustibilLunar: number;
  reviziiLunar: number;
  alteCheltuieliAutoLunar: number;
  abonamenteLunar: number;
  diurneLunar: number;
  alteCheltuieliLunar: number;
}

export interface Employee {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  type: EmployeeType;
  showroomId: string | null;
  active: boolean;
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

export interface Partner {
  id: string;
  nume: string;
  tipPartener: 'FURNIZOR' | 'DISTRIBUITOR';
  activ: boolean;
  detalii?: string;
}

export interface PartnerMonthlyData {
  id: string;
  partnerId: string;
  luna: number;
  an: number;
  venitTva: string;
  achizitieTva: string;
  comisionPercent: string;
  cheltuieliMarketing: string;
  costTransport: string;
  costAmbalare: string;
}
