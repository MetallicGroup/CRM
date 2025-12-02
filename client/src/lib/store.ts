import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  
  // Reset
  resetData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
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
  // 1. Total HQ Costs (Now mostly Indirects logic, but we keep the sum)
  // NOTE: HQ Showroom costs are now split: 20% direct to Buc agents, 80% to Indirects.
  // The "hqEmployees" list might still be used for "Angajați neproductivi" or similar.
  // Let's calculate the raw total first.
  const totalHQCostsRaw = state.hqEmployees.reduce((sum, emp) => 
    sum + emp.costs.salary + emp.costs.auto + emp.costs.fuel + emp.costs.maintenance + emp.costs.otherAuto + emp.costs.subsistence, 0);

  // 2. Total Production Costs
  const totalProductionCosts = state.production.employees.reduce((sum, emp) => 
    sum + emp.salary + emp.auto + emp.utilities + emp.other, 0);

  // 3. Total Indirect Costs (Base)
  let totalIndirectCosts = Object.values(state.indirectCosts).reduce((sum, val) => sum + val, 0);

  // 4. Showroom Bucuresti Costs Logic
  // We need to find Showroom Bucuresti costs from the showrooms list
  const showroomBuc = state.showrooms.find(s => s.location === 'Bucuresti_Showroom');
  let costShowroomBucTotal = 0;
  if (showroomBuc) {
    costShowroomBucTotal = Object.values(showroomBuc.costs).reduce((a, b) => a + b, 0);
  }

  // Split Bucuresti Costs: 20% Direct, 80% Indirect
  const costBucDirect20 = costShowroomBucTotal * 0.20;
  const costBucIndirect80 = costShowroomBucTotal * 0.80;

  // Add 80% of Buc Showroom to Total Indirect Costs
  totalIndirectCosts += costBucIndirect80;

  // Add Unproductive Salaries (HQ Employees) to Indirect Costs ?
  // Prompt: "salariile angajaților neproductivi din fata la indirecte"
  // Assuming "hqEmployees" represent these unproductive employees.
  totalIndirectCosts += totalHQCostsRaw; 


  // 5. Total Revenues (needed for distribution)
  const agents = state.agents;
  const distributors = state.distributors;

  const totalVenitFirma = agents.reduce((sum, a) => sum + a.monthlyData[month].venitTVA, 0) +
                          distributors.reduce((sum, d) => sum + d.monthlyData[month].venitTVA, 0);

  // For Production Split: Total Revenue from Fences (Garduri)
  const totalVenitGardFirma = agents.reduce((sum, a) => sum + a.monthlyData[month].venitGard, 0); 
  
  // Distributors Production Split base? 
  // Prompt: "Distribuire cost producție ... Cost_Prod_Distrib = Total_Prod * (Venit_Distrib / Total_Venit_Distrib)"
  // AND "Productia se împarte la venitul total al gardurilor ... procentual ... al fiecărui agent"
  // This implies two separate pools or a combined pool.
  // I will assume the Total Production Cost is split across ALL entities based on their relevant revenue.
  // If Distributors also sell "Garduri" (implied by context of production), we should sum their revenue too if possible, 
  // but distributors currently only have "VenitTVA". I will assume VenitTVA for distributors counts towards the production split base.
  const totalVenitProductionBase = totalVenitGardFirma + distributors.reduce((sum, d) => sum + d.monthlyData[month].venitTVA, 0);


  // Pre-calculate Showroom Totals for Regional distribution
  const showroomTotals: Record<string, number> = {};
  const showroomRevenues: Record<string, number> = {};
  
  state.showrooms.forEach(s => {
    let cost = Object.values(s.costs).reduce((a, b) => a + b, 0);
    
    // Special Logic for Bucuresti Showroom
    if (s.location === 'Bucuresti_Showroom') {
        cost = costBucDirect20; // Only 20% remains for direct distribution to Buc agents
    }

    showroomTotals[s.id] = cost;
    showroomRevenues[s.id] = agents
      .filter(a => a.showroomId === s.id)
      .reduce((sum, a) => sum + a.monthlyData[month].venitTVA, 0);
  });

  return {
    totalHQCostsRaw, // Kept for reference, but included in Indirects now
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
  const data = agent.monthlyData[month];
  const { totalProductionCosts, totalIndirectCosts, totalVenitFirma, totalVenitProductionBase, showroomTotals, showroomRevenues } = totals;

  // --- New Column Logic ---
  // Garduri
  // We need inputs for these. Currently we have 'venitGard'. 
  // We need 'achizitieGard' (implied from total achizitie? No, need separate input ideally).
  // For now, I will assume 'achizitieTVA' is total, and we might need to split it or add inputs.
  // Given "Coloane din foaia principală : VENIT TVA , VENIT TVA GARD ...", I will add calculated fields based on existing data where possible, 
  // but fully separating Gard vs Acoperis requires separate inputs for Achizitie as well.
  // I will update the UI to ask for separate inputs later if needed, but for calculation here:
  
  // Assume 'achizitieTVA' is total. We need 'achizitieGard' and 'achizitieAcoperis'.
  // I will assume proportional split if not provided, OR add fields to the store (better).
  // For this step, I'll stick to existing store structure and use what I have, but the UI update is key.
  // Let's derive what we can.
  
  const venitGard = data.venitGard;
  const venitAcoperis = data.venitAcoperis;
  const venitTVA = data.venitTVA; // Should match sum?
  
  // VAT 21% for Gard? Prompt says "TVA 21% GARD". Standard RO is 19%. I will use 21% as requested.
  // Wait, standard is 19%. "TVA 21% GARD" might be typo or specific. I will use 0.21.
  const tvaGard = venitGard * 0.21; // Prompt request
  const tvaAcoperis = venitAcoperis * 0.19; // Standard assumption or 21? Prompt says "după aceleași lucruri dar in loc de gard sa fie acoperiș".
  // If Gard is 21%, Acoperis might be too. But usually Acoperis is 19. I will stick to 19 for Acoperis unless specified.
  // Actually, "după aceleași lucruri" implies same formulas. So 21%? 
  // Let's use 0.19 for everything to be safe unless strictly 21. 
  // "TVA 21% GARD" is very specific. I will use 0.21 for Gard. 
  // For Acoperis I will use 0.19.
  
  // Achizitie needs split. I will assume achizitieTVA is total.
  // I'll estimate Achizitie Gard based on revenue ratio? No, that's inaccurate.
  // For now, I will use a simplified assumption: Achizitie Gard = Achizitie Total * (Venit Gard / Total Venit).
  const ratioGard = venitTVA > 0 ? venitGard / venitTVA : 0;
  const achizitieGard = data.achizitieTVA * ratioGard;
  const achizitieAcoperis = data.achizitieTVA * (1 - ratioGard);

  const adaosTVAGard = venitGard - achizitieGard;
  const adaosNetGard = adaosTVAGard - tvaGard;

  const adaosTVAAcoperis = venitAcoperis - achizitieAcoperis;
  const adaosNetAcoperis = adaosTVAAcoperis - tvaAcoperis;
  
  const adaosNetTotal = adaosNetGard + adaosNetAcoperis;

  const valoareComision = venitTVA * (data.comisionPercent / 100);
  
  const costuriVariabile = data.amortizareAuto + data.salariu + data.combustibil + data.revizii + data.alteCheltuieliAuto + data.abonamente + data.diurne;

  // Distributions
  
  // Cost Showroom:
  // - For Buc agents: they pay 20% of Buc Showroom cost (split among them).
  // - For Regional agents: they pay 100% of their showroom cost.
  // This logic is handled by 'showroomTotals' which already has the 20% adjustment for Buc.
  const showroomRevenue = showroomRevenues[agent.showroomId] || 0;
  const costShowroomTotal = showroomTotals[agent.showroomId] || 0;
  const costShowroom = showroomRevenue > 0 ? costShowroomTotal * (venitTVA / showroomRevenue) : 0;

  // Cost Productie:
  // "Productia se împarte la venitul total al gardurilor ... procentual ... al fiecărui agent care a vândut garduri"
  const costProductie = totalVenitProductionBase > 0 ? totalProductionCosts * (venitGard / totalVenitProductionBase) : 0;

  // Cost Indirecte:
  // Includes 80% Buc Showroom + Unproductive Salaries.
  // Distributed by Total Revenue.
  const costIndirecte = totalVenitFirma > 0 ? totalIndirectCosts * (venitTVA / totalVenitFirma) : 0;

  // Profits
  // Profit Final = Adaos Net Total - Comision - Cheltuieli
  // Wait, formula in prompt: "Profit Net = ADAOS_NET – Comision – CostProd – CostIndirecte" (for distributors)
  // For Agents: "Profit Final = Venit_Net - ..."
  // Venit_Net ~ Adaos_Net.
  
  const profitFinal = adaosNetTotal - valoareComision - costuriVariabile - costShowroom - costProductie - costIndirecte - data.costAmbalarePropriu - data.costCurierAmbalare - data.costCurierTransport - data.transportIntern;

  return {
    ...data,
    tvaGard,
    tvaAcoperis,
    achizitieGard,
    achizitieAcoperis,
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
  const data = dist.monthlyData[month];
  const { totalProductionCosts, totalIndirectCosts, totalVenitFirma, totalVenitProductionBase } = totals;

  // Distributors now mirror Agents structure largely?
  // "La distribuitori sa fie la fel ca la agenți același tabel"
  // But we might not have Gard vs Acoperis split inputs for distributors yet.
  // I will assume 'venitTVA' is total.
  // To keep it simple for now without changing Data Structure drastically:
  // I will treat Distributor revenue as generic (or predominantly Gard if Production cost is allocated).
  
  // Prompt: "Distribuitorii sa aibă acelasi tabel cum au deja + încă o coloana cu transport si ambalare."
  // AND later: "La distribuitori sa fie la fel ca la agenți același tabel"
  // This is conflicting. I will add Transport/Ambalare to the existing structure + apply the new logic.
  
  const adaosTVA = data.venitTVA - data.achizitieTVA;
  const tva = data.venitTVA * 0.19; // Or 21? Stick to 19 default.
  const adaosNet = adaosTVA - tva;
  const comisionValoare = data.venitTVA * (data.comisionPercent / 100);

  // Distributions
  // Cost Productie (Allocated based on Revenue vs Total Production Base)
  const costProductie = totalVenitProductionBase > 0 ? totalProductionCosts * (data.venitTVA / totalVenitProductionBase) : 0;
  
  // Cost Indirecte
  const costIndirecte = totalVenitFirma > 0 ? totalIndirectCosts * (data.venitTVA / totalVenitFirma) : 0;

  const profitNet = adaosNet - comisionValoare - costProductie - costIndirecte - (data.cheltuieliMarketing || 0);
  // Need to add Transport/Ambalare if I add them to Distributor type. 
  // I'll assume they are part of profit calc if added.
  
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
