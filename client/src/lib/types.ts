export type Month = 
  | 'Ianuarie' | 'Februarie' | 'Martie' | 'Aprilie' | 'Mai' | 'Iunie' 
  | 'Iulie' | 'August' | 'Septembrie' | 'Octombrie' | 'Noiembrie' | 'Decembrie';

export const MONTHS: Month[] = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

export interface CostItem {
  id: string;
  name: string;
  amount: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  costs: {
    salary: number;
    auto: number; 
    fuel: number;
    maintenance: number; 
    otherAuto: number;
    subsistence: number; 
  };
}

export interface Showroom {
  id: string;
  name: string;
  location: 'Bucuresti_HQ' | 'Constanta' | 'Giurgiu' | 'Teleorman' | 'Bucuresti_Showroom'; 
  costs: {
    rent: number;
    utilities: number;
    marketing: number;
    subscriptions: number;
    consumables: number;
  };
  employees: string[]; 
}

export interface Production {
  employees: {
    id: string;
    name: string;
    salary: number;
    auto: number;
    utilities: number;
    other: number;
  }[];
}

export interface IndirectCosts {
  salaries: number;
  auto: number;
  rent: number;
  utilities: number;
  marketing: number;
  subscriptions: number;
  consumables: number;
}

export interface AgentMonthlyData {
  month: Month;
  
  // Venituri - MANUAL
  venitTVA: number;
  venitGard: number; 
  venitAcoperis: number; 
  
  // Achiziții - MANUAL (separate pentru Gard și Acoperiș)
  achizitieGard: number;
  achizitieAcoperis: number;
  
  comisionPercent: number;
  
  // Costuri Auto & Logistica (Input per month)
  amortizareAuto: number;
  salariu: number;
  combustibil: number;
  revizii: number;
  alteCheltuieliAuto: number;
  abonamente: number;
  diurne: number;
  
  costAmbalarePropriu: number;
  costCurierAmbalare: number;
  costCurierTransport: number;
  transportIntern: number;
}

export interface Agent {
  id: string;
  name: string;
  showroomId: string; 
  monthlyData: Record<Month, AgentMonthlyData>;
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
  
  // Transport și Ambalare
  costTransport: number;
  costAmbalare: number;
}
