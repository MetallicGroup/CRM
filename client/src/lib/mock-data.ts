import { Agent, Distributor, Employee, IndirectCosts, MONTHS, Production, Showroom } from './types';

export const INITIAL_HQ_EMPLOYEES: Employee[] = [
  { id: 'hq1', name: 'Daniel', role: 'Manager', costs: { salary: 5000, auto: 2000, fuel: 1000, maintenance: 500, otherAuto: 200, subsistence: 0 } },
  { id: 'hq2', name: 'Mădălina', role: 'Sales Support', costs: { salary: 4000, auto: 0, fuel: 0, maintenance: 0, otherAuto: 0, subsistence: 0 } },
  { id: 'hq3', name: 'Dana', role: 'Accountant', costs: { salary: 4500, auto: 0, fuel: 0, maintenance: 0, otherAuto: 0, subsistence: 0 } },
  { id: 'hq4', name: 'Raluca', role: 'HR', costs: { salary: 4200, auto: 0, fuel: 0, maintenance: 0, otherAuto: 0, subsistence: 0 } },
];

export const INITIAL_SHOWROOMS: Showroom[] = [
  { 
    id: 'sh_constanta', 
    name: 'Showroom Constanța', 
    location: 'Constanta',
    costs: { rent: 1000, utilities: 300, marketing: 500, subscriptions: 100, consumables: 100 },
    employees: ['ag_dragos', 'ag_oana']
  },
  { 
    id: 'sh_giurgiu', 
    name: 'Showroom Giurgiu', 
    location: 'Giurgiu',
    costs: { rent: 800, utilities: 250, marketing: 400, subscriptions: 100, consumables: 100 },
    employees: ['ag_marian_t', 'ag_cristina_t']
  },
  { 
    id: 'sh_teleorman', 
    name: 'Showroom Teleorman', 
    location: 'Teleorman',
    costs: { rent: 600, utilities: 200, marketing: 300, subscriptions: 50, consumables: 50 },
    employees: ['ag_alexandra']
  },
  { 
    id: 'sh_bucuresti', 
    name: 'Showroom București', 
    location: 'Bucuresti_Showroom',
    costs: { rent: 1500, utilities: 400, marketing: 800, subscriptions: 200, consumables: 200 },
    employees: ['ag_alexandru_c', 'ag_marian_c', 'ag_iulian_m']
  },
];

export const INITIAL_PRODUCTION: Production = {
  employees: [
    { id: 'prod1', name: 'Kuke', salary: 4000, auto: 500, utilities: 100, other: 100 },
    { id: 'prod2', name: 'Laurențiu', salary: 3800, auto: 0, utilities: 100, other: 100 },
    { id: 'prod3', name: 'Marin', salary: 3800, auto: 0, utilities: 100, other: 100 },
    { id: 'prod4', name: 'Marian', salary: 3900, auto: 0, utilities: 100, other: 100 },
  ]
};

export const INITIAL_INDIRECT_COSTS: IndirectCosts = {
  salaries: 10000,
  auto: 3000,
  rent: 2000,
  utilities: 1500,
  marketing: 2000,
  subscriptions: 1000,
  consumables: 500
};

export const INITIAL_AGENTS: Agent[] = [
  { id: 'ag_dragos', name: 'Dragoș', showroomId: 'sh_constanta', monthlyData: {} as any },
  { id: 'ag_oana', name: 'Oana', showroomId: 'sh_constanta', monthlyData: {} as any },
  { id: 'ag_marian_t', name: 'Marian Toma', showroomId: 'sh_giurgiu', monthlyData: {} as any },
  { id: 'ag_cristina_t', name: 'Cristina Toma', showroomId: 'sh_giurgiu', monthlyData: {} as any },
  { id: 'ag_alexandra', name: 'Alexandra TR', showroomId: 'sh_teleorman', monthlyData: {} as any },
  { id: 'ag_alexandru_c', name: 'Alexandru Croitoru', showroomId: 'sh_bucuresti', monthlyData: {} as any },
  { id: 'ag_marian_c', name: 'Marian Costache', showroomId: 'sh_bucuresti', monthlyData: {} as any },
  { id: 'ag_iulian_m', name: 'Iulian Marcu', showroomId: 'sh_bucuresti', monthlyData: {} as any },
];

// Populate Monthly Data with empty values
MONTHS.forEach(month => {
  INITIAL_AGENTS.forEach(agent => {
    agent.monthlyData[month] = {
      month,
      venitTVA: 0, venitGard: 0, venitAcoperis: 0, achizitieTVA: 0, comisionPercent: 0,
      amortizareAuto: 0, salariu: 0, combustibil: 0, revizii: 0, alteCheltuieliAuto: 0, abonamente: 0, diurne: 0,
      costAmbalarePropriu: 0, costCurierAmbalare: 0, costCurierTransport: 0, transportIntern: 0
    };
  });
});

export const INITIAL_DISTRIBUTORS: Distributor[] = [
  { id: 'dist1', name: 'Distribuitor 1', monthlyData: {} as any }
];

MONTHS.forEach(month => {
  INITIAL_DISTRIBUTORS.forEach(dist => {
    dist.monthlyData[month] = {
      month,
      venitTVA: 0, achizitieTVA: 0, comisionPercent: 0, cheltuieliMarketing: 0
    };
  });
});
