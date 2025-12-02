import { create } from 'zustand';
import { Agent, Distributor, Employee, IndirectCosts, Production, Showroom, Month, MONTHS } from './types';
import { INITIAL_AGENTS, INITIAL_DISTRIBUTORS, INITIAL_HQ_EMPLOYEES, INITIAL_INDIRECT_COSTS, INITIAL_PRODUCTION, INITIAL_SHOWROOMS } from './mock-data';

interface StoreState {
  selectedMonth: Month;
  hqEmployees: Employee[];
  showrooms: Showroom[];
  production: Production;
  indirectCosts: IndirectCosts;
  agents: Agent[];
  distributors: Distributor[];

  setSelectedMonth: (month: Month) => void;
  updateAgentData: (agentId: string, month: Month, data: Partial<Agent['monthlyData'][Month]>) => void;
  updateDistributorData: (distId: string, month: Month, data: Partial<Distributor['monthlyData'][Month]>) => void;
  
  // Actions to update costs
  updateHQEmployee: (id: string, data: Partial<Employee>) => void;
  addHQEmployee: (employee: Employee) => void;
  removeHQEmployee: (id: string) => void;
  
  updateShowroom: (id: string, data: Partial<Showroom>) => void;
  updateProductionEmployee: (index: number, data: Partial<Production['employees'][0]>) => void;
  updateIndirectCosts: (data: Partial<IndirectCosts>) => void;
  
  // Settings Actions
  updateAgent: (id: string, data: Partial<Agent>) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  selectedMonth: 'Ianuarie',
  hqEmployees: INITIAL_HQ_EMPLOYEES,
  showrooms: INITIAL_SHOWROOMS,
  production: INITIAL_PRODUCTION,
  indirectCosts: INITIAL_INDIRECT_COSTS,
  agents: INITIAL_AGENTS,
  distributors: INITIAL_DISTRIBUTORS,

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  updateAgentData: (agentId, month, data) => set((state) => ({
    agents: state.agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, monthlyData: { ...agent.monthlyData, [month]: { ...agent.monthlyData[month], ...data } } }
        : agent
    )
  })),

  updateDistributorData: (distId, month, data) => set((state) => ({
    distributors: state.distributors.map(dist => 
      dist.id === distId 
        ? { ...dist, monthlyData: { ...dist.monthlyData, [month]: { ...dist.monthlyData[month], ...data } } }
        : dist
    )
  })),

  updateHQEmployee: (id, data) => set((state) => ({
    hqEmployees: state.hqEmployees.map(emp => emp.id === id ? { ...emp, ...data } : emp)
  })),

  addHQEmployee: (employee) => set((state) => ({
    hqEmployees: [...state.hqEmployees, employee]
  })),

  removeHQEmployee: (id) => set((state) => ({
    hqEmployees: state.hqEmployees.filter(emp => emp.id !== id)
  })),

  updateShowroom: (id, data) => set((state) => ({
    showrooms: state.showrooms.map(s => s.id === id ? { ...s, ...data } : s)
  })),

  updateProductionEmployee: (index, data) => set((state) => {
    const newEmployees = [...state.production.employees];
    newEmployees[index] = { ...newEmployees[index], ...data };
    return { production: { ...state.production, employees: newEmployees } };
  }),

  updateIndirectCosts: (data) => set((state) => ({
    indirectCosts: { ...state.indirectCosts, ...data }
  })),

  updateAgent: (id, data) => set((state) => ({
    agents: state.agents.map(agent => agent.id === id ? { ...agent, ...data } : agent)
  })),
}));

// Selectors for Calculations

export const getTotalsForMonth = (state: StoreState, month: Month) => {
  // 1. Total HQ Costs
  const totalHQCosts = state.hqEmployees.reduce((sum, emp) => 
    sum + emp.costs.salary + emp.costs.auto + emp.costs.fuel + emp.costs.maintenance + emp.costs.otherAuto + emp.costs.subsistence, 0);

  // 2. Total Production Costs
  const totalProductionCosts = state.production.employees.reduce((sum, emp) => 
    sum + emp.salary + emp.auto + emp.utilities + emp.other, 0);

  // 3. Total Indirect Costs
  const totalIndirectCosts = Object.values(state.indirectCosts).reduce((sum, val) => sum + val, 0);

  // 4. Total Revenues (needed for distribution)
  const agents = state.agents;
  const distributors = state.distributors;

  const totalVenitFirma = agents.reduce((sum, a) => sum + a.monthlyData[month].venitTVA, 0) +
                          distributors.reduce((sum, d) => sum + d.monthlyData[month].venitTVA, 0);

  const totalVenitGardFirma = agents.reduce((sum, a) => sum + a.monthlyData[month].venitGard, 0); 

  const totalVenitDistributors = distributors.reduce((sum, d) => sum + d.monthlyData[month].venitTVA, 0);

  // Pre-calculate Showroom Totals
  const showroomTotals: Record<string, number> = {};
  const showroomRevenues: Record<string, number> = {};
  
  state.showrooms.forEach(s => {
    showroomTotals[s.id] = Object.values(s.costs).reduce((a, b) => a + b, 0);
    showroomRevenues[s.id] = agents
      .filter(a => a.showroomId === s.id)
      .reduce((sum, a) => sum + a.monthlyData[month].venitTVA, 0);
  });

  return {
    totalHQCosts,
    totalProductionCosts,
    totalIndirectCosts,
    totalVenitFirma,
    totalVenitGardFirma,
    totalVenitDistributors,
    showroomTotals,
    showroomRevenues
  };
};

export const calculateAgentMetrics = (agent: Agent, month: Month, totals: ReturnType<typeof getTotalsForMonth>) => {
  const data = agent.monthlyData[month];
  const { totalHQCosts, totalProductionCosts, totalIndirectCosts, totalVenitFirma, totalVenitGardFirma, showroomTotals, showroomRevenues } = totals;

  const valoareComision = data.venitTVA * (data.comisionPercent / 100);
  const tva = data.venitTVA * 0.19;
  const venitBrut = data.venitTVA - data.achizitieTVA;
  const venitNet = venitBrut - tva;
  
  const costuriVariabile = data.amortizareAuto + data.salariu + data.combustibil + data.revizii + data.alteCheltuieliAuto + data.abonamente + data.diurne;

  // Distributions
  const costHQ = totalVenitFirma > 0 ? (data.venitTVA / totalVenitFirma) * totalHQCosts : 0;
  
  const showroomRevenue = showroomRevenues[agent.showroomId] || 0;
  const costShowroomTotal = showroomTotals[agent.showroomId] || 0;
  const costShowroom = showroomRevenue > 0 ? costShowroomTotal * (data.venitTVA / showroomRevenue) : 0;

  const costProductie = totalVenitGardFirma > 0 ? totalProductionCosts * (data.venitGard / totalVenitGardFirma) : 0;

  const costIndirecte = totalVenitFirma > 0 ? totalIndirectCosts * (data.venitTVA / totalVenitFirma) : 0;

  // Profits
  const profitGarduri = data.venitGard - (costShowroom + costHQ + costProductie + costIndirecte);
  const profitAcoperisuri = data.venitAcoperis - (costShowroom + costHQ + costIndirecte);
  const profitGeneral = venitNet - costuriVariabile;
  
  const profitFinal = venitNet - (costuriVariabile + costShowroom + costHQ + costProductie + costIndirecte + data.costAmbalarePropriu + data.costCurierAmbalare + data.costCurierTransport + data.transportIntern);

  return {
    ...data,
    valoareComision,
    tva,
    venitBrut,
    venitNet,
    costuriVariabile,
    costHQ,
    costShowroom,
    costProductie,
    costIndirecte,
    profitGarduri,
    profitAcoperisuri,
    profitGeneral,
    profitFinal
  };
};

export const calculateDistributorMetrics = (dist: Distributor, month: Month, totals: ReturnType<typeof getTotalsForMonth>) => {
  const data = dist.monthlyData[month];
  const { totalProductionCosts, totalIndirectCosts, totalVenitDistributors } = totals;

  const adaosTVA = data.venitTVA - data.achizitieTVA;
  const tva = data.venitTVA * 0.19;
  const adaosNet = adaosTVA - tva;
  const comisionValoare = data.venitTVA * (data.comisionPercent / 100);

  // Distributions
  const costProductie = totalVenitDistributors > 0 ? totalProductionCosts * (data.venitTVA / totalVenitDistributors) : 0;
  const costIndirecte = totalVenitDistributors > 0 ? totalIndirectCosts * (data.venitTVA / totalVenitDistributors) : 0;

  const profitNet = adaosNet - comisionValoare - costProductie - costIndirecte;

  return {
    ...data,
    adaosTVA,
    tva,
    adaosNet,
    comisionValoare,
    costProductie,
    costIndirecte,
    profitNet
  };
};
