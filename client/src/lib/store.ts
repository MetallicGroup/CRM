import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Agent, Distributor, Employee, IndirectCosts, Production, Showroom, Month } from './types';
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
  
  updateHQEmployee: (id: string, data: Partial<Employee>) => void;
  addHQEmployee: (employee: Employee) => void;
  removeHQEmployee: (id: string) => void;
  
  updateShowroom: (id: string, data: Partial<Showroom>) => void;
  updateProductionEmployee: (index: number, data: Partial<Production['employees'][0]>) => void;
  updateIndirectCosts: (data: Partial<IndirectCosts>) => void;
  
  updateAgent: (id: string, data: Partial<Agent>) => void;
  
  resetData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
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

      resetData: () => set({
        hqEmployees: INITIAL_HQ_EMPLOYEES,
        showrooms: INITIAL_SHOWROOMS,
        production: INITIAL_PRODUCTION,
        indirectCosts: INITIAL_INDIRECT_COSTS,
        agents: INITIAL_AGENTS,
        distributors: INITIAL_DISTRIBUTORS,
      })
    }),
    {
      name: 'crm-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selectors for Calculations

export const getTotalsForMonth = (state: StoreState, month: Month) => {
  const totalHQCostsRaw = state.hqEmployees.reduce((sum, emp) => 
    sum + emp.costs.salary + emp.costs.auto + emp.costs.fuel + emp.costs.maintenance + emp.costs.otherAuto + emp.costs.subsistence, 0);

  const totalProductionCosts = state.production.employees.reduce((sum, emp) => 
    sum + emp.salary + emp.auto + emp.utilities + emp.other, 0);

  let totalIndirectCosts = Object.values(state.indirectCosts).reduce((sum, val) => sum + val, 0);

  const showroomBuc = state.showrooms.find(s => s.location === 'Bucuresti_Showroom');
  let costShowroomBucTotal = 0;
  if (showroomBuc) {
    costShowroomBucTotal = Object.values(showroomBuc.costs).reduce((a, b) => a + b, 0);
  }

  const costBucDirect20 = costShowroomBucTotal * 0.20;
  const costBucIndirect80 = costShowroomBucTotal * 0.80;

  totalIndirectCosts += costBucIndirect80;
  totalIndirectCosts += totalHQCostsRaw; 

  const agents = state.agents;
  const distributors = state.distributors;

  const totalVenitFirma = agents.reduce((sum, a) => sum + (a.monthlyData[month]?.venitTVA || 0), 0) +
                          distributors.reduce((sum, d) => sum + (d.monthlyData[month]?.venitTVA || 0), 0);

  const totalVenitGardFirma = agents.reduce((sum, a) => sum + (a.monthlyData[month]?.venitGard || 0), 0); 
  
  const totalVenitProductionBase = totalVenitGardFirma + distributors.reduce((sum, d) => sum + (d.monthlyData[month]?.venitTVA || 0), 0);

  const showroomTotals: Record<string, number> = {};
  const showroomRevenues: Record<string, number> = {};
  
  state.showrooms.forEach(s => {
    let cost = Object.values(s.costs).reduce((a, b) => a + b, 0);
    
    if (s.location === 'Bucuresti_Showroom') {
        cost = costBucDirect20;
    }

    showroomTotals[s.id] = cost;
    showroomRevenues[s.id] = agents
      .filter(a => a.showroomId === s.id)
      .reduce((sum, a) => sum + (a.monthlyData[month]?.venitTVA || 0), 0);
  });

  return {
    totalHQCostsRaw,
    totalProductionCosts,
    totalIndirectCosts,
    totalVenitFirma,
    totalVenitGardFirma,
    totalVenitProductionBase,
    showroomTotals,
    showroomRevenues
  };
};

export const calculateAgentMetrics = (agent: Agent, month: Month, totals: ReturnType<typeof getTotalsForMonth>) => {
  const data = agent.monthlyData[month] || {
    month,
    venitTVA: 0, venitGard: 0, venitAcoperis: 0, 
    achizitieGard: 0, achizitieAcoperis: 0,
    comisionPercent: 0,
    amortizareAuto: 0, salariu: 0, combustibil: 0, revizii: 0, alteCheltuieliAuto: 0, abonamente: 0, diurne: 0,
    costAmbalarePropriu: 0, costCurierAmbalare: 0, costCurierTransport: 0, transportIntern: 0
  };
  
  const { totalProductionCosts, totalIndirectCosts, totalVenitFirma, totalVenitProductionBase, showroomTotals, showroomRevenues } = totals;

  // GARDURI - folosim achizitieGard manual
  const venitGard = data.venitGard || 0;
  const achizitieGard = data.achizitieGard || 0;
  const adaosTVAGard = venitGard - achizitieGard;
  const tvaGard = venitGard * 0.21;
  const adaosNetGard = adaosTVAGard - tvaGard;

  // ACOPERISURI - folosim achizitieAcoperis manual
  const venitAcoperis = data.venitAcoperis || 0;
  const achizitieAcoperis = data.achizitieAcoperis || 0;
  const adaosTVAAcoperis = venitAcoperis - achizitieAcoperis;
  const tvaAcoperis = venitAcoperis * 0.19;
  const adaosNetAcoperis = adaosTVAAcoperis - tvaAcoperis;
  
  const adaosNetTotal = adaosNetGard + adaosNetAcoperis;

  const venitTVA = data.venitTVA || 0;
  const valoareComision = venitTVA * ((data.comisionPercent || 0) / 100);
  
  const costuriVariabile = (data.amortizareAuto || 0) + (data.salariu || 0) + (data.combustibil || 0) + (data.revizii || 0) + (data.alteCheltuieliAuto || 0) + (data.abonamente || 0) + (data.diurne || 0);

  // Distributions
  const showroomRevenue = showroomRevenues[agent.showroomId] || 0;
  const costShowroomTotal = showroomTotals[agent.showroomId] || 0;
  const costShowroom = showroomRevenue > 0 ? costShowroomTotal * (venitTVA / showroomRevenue) : 0;

  const costProductie = totalVenitProductionBase > 0 ? totalProductionCosts * (venitGard / totalVenitProductionBase) : 0;

  const costIndirecte = totalVenitFirma > 0 ? totalIndirectCosts * (venitTVA / totalVenitFirma) : 0;

  const profitFinal = adaosNetTotal - valoareComision - costuriVariabile - costShowroom - costProductie - costIndirecte - (data.costAmbalarePropriu || 0) - (data.costCurierAmbalare || 0) - (data.costCurierTransport || 0) - (data.transportIntern || 0);

  return {
    ...data,
    venitGard,
    venitAcoperis,
    venitTVA,
    achizitieGard,
    achizitieAcoperis,
    tvaGard,
    tvaAcoperis,
    adaosTVAGard,
    adaosNetGard,
    adaosTVAAcoperis,
    adaosNetAcoperis,
    adaosNetTotal,
    valoareComision,
    costuriVariabile,
    costShowroom,
    costProductie,
    costIndirecte,
    profitFinal
  };
};

export const calculateDistributorMetrics = (dist: Distributor, month: Month, totals: ReturnType<typeof getTotalsForMonth>) => {
  const data = dist.monthlyData[month] || {
    month, venitTVA: 0, achizitieTVA: 0, comisionPercent: 0, cheltuieliMarketing: 0, costTransport: 0, costAmbalare: 0
  };
  const { totalProductionCosts, totalIndirectCosts, totalVenitFirma, totalVenitProductionBase } = totals;

  const adaosTVA = (data.venitTVA || 0) - (data.achizitieTVA || 0);
  const tva = (data.venitTVA || 0) * 0.19;
  const adaosNet = adaosTVA - tva;
  const comisionValoare = (data.venitTVA || 0) * ((data.comisionPercent || 0) / 100);

  const costProductie = totalVenitProductionBase > 0 ? totalProductionCosts * ((data.venitTVA || 0) / totalVenitProductionBase) : 0;
  const costIndirecte = totalVenitFirma > 0 ? totalIndirectCosts * ((data.venitTVA || 0) / totalVenitFirma) : 0;

  const profitNet = adaosNet - comisionValoare - costProductie - costIndirecte - (data.cheltuieliMarketing || 0) - (data.costTransport || 0) - (data.costAmbalare || 0);
  
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
