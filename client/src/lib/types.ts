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
    auto: number; // Amortizare/Chirie auto
    fuel: number;
    maintenance: number; // Revizii
    otherAuto: number;
    subsistence: number; // Diurne
  };
}

export interface Showroom {
  id: string;
  name: string;
  location: 'Bucuresti_HQ' | 'Constanta' | 'Giurgiu' | 'Teleorman' | 'Bucuresti_Showroom'; // Bucuresti_HQ vs Bucuresti regional showroom
  costs: {
    rent: number;
    utilities: number;
    marketing: number;
    subscriptions: number;
    consumables: number;
  };
  employees: string[]; // IDs of agents assigned here
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
  
  // Inputs
  venitTVA: number;
  venitGard: number; // Portion of revenue from Fences
  venitAcoperis: number; // Portion of revenue from Roofs
  achizitieTVA: number;
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

  // Calculated Fields (Computed in store/selector)
  // valoareComision: number;
  // venitBrut: number;
  // tva: number;
  // venitNet: number;
  // costuriVariabile: number;
  
  // Distributed Costs (Computed)
  // costShowroom: number;
  // costHQ: number;
  // costProductie: number;
  // costIndirecte: number;
  
  // Profits (Computed)
  // profitGarduri: number;
  // profitAcoperisuri: number;
  // profitGeneral: number;
  // profitFinal: number;
}

export interface Agent {
  id: string;
  name: string;
  showroomId: string; // Where they are assigned
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
  
  // Computed
  // adaosTVA: number;
  // tva: number;
  // adaosNet: number;
  // comisionValoare: number;
  // costProductieAlocat: number;
  // costIndirecteSpeciale: number;
  // profitNet: number;
}
