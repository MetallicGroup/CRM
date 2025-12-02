import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Employee, Distributor, Showroom, Month, EmployeeMonthlyData } from './types';
import { INITIAL_EMPLOYEES, INITIAL_DISTRIBUTORS, INITIAL_SHOWROOMS } from './mock-data';

interface StoreState {
  selectedMonth: Month;
  showrooms: Showroom[];
  employees: Employee[];
  distributors: Distributor[];

  setSelectedMonth: (month: Month) => void;
  
  // Employee operations
  updateEmployeeData: (empId: string, month: Month, data: Partial<EmployeeMonthlyData>) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  addEmployee: (employee: Employee) => void;
  removeEmployee: (id: string) => void;
  
  // Showroom operations
  updateShowroom: (id: string, data: Partial<Showroom>) => void;
  
  // Distributor operations
  updateDistributorData: (distId: string, month: Month, data: Partial<Distributor['monthlyData'][Month]>) => void;
  
  resetData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      selectedMonth: 'Ianuarie',
      showrooms: INITIAL_SHOWROOMS,
      employees: INITIAL_EMPLOYEES,
      distributors: INITIAL_DISTRIBUTORS,

      setSelectedMonth: (month) => set({ selectedMonth: month }),

      updateEmployeeData: (empId, month, data) => set((state) => ({
        employees: state.employees.map(emp => 
          emp.id === empId 
            ? { ...emp, monthlyData: { ...emp.monthlyData, [month]: { ...emp.monthlyData[month], ...data } } }
            : emp
        )
      })),

      updateEmployee: (id, data) => set((state) => ({
        employees: state.employees.map(emp => emp.id === id ? { ...emp, ...data } : emp)
      })),

      addEmployee: (employee) => set((state) => ({
        employees: [...state.employees, employee]
      })),

      removeEmployee: (id) => set((state) => ({
        employees: state.employees.filter(emp => emp.id !== id)
      })),

      updateShowroom: (id, data) => set((state) => ({
        showrooms: state.showrooms.map(s => s.id === id ? { ...s, ...data } : s)
      })),

      updateDistributorData: (distId, month, data) => set((state) => ({
        distributors: state.distributors.map(dist => 
          dist.id === distId 
            ? { ...dist, monthlyData: { ...dist.monthlyData, [month]: { ...dist.monthlyData[month], ...data } } }
            : dist
        )
      })),

      resetData: () => set({
        showrooms: INITIAL_SHOWROOMS,
        employees: INITIAL_EMPLOYEES,
        distributors: INITIAL_DISTRIBUTORS,
      })
    }),
    {
      name: 'crm-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helper function to get employee costs for a month
const getEmployeeMonthlyCosts = (emp: Employee, month: Month): number => {
  const data = emp.monthlyData[month];
  if (!data) return 0;
  return (data.salariu || 0) + (data.amortizareAuto || 0) + (data.combustibil || 0) + 
         (data.revizii || 0) + (data.alteCheltuieliAuto || 0) + (data.abonamente || 0) + (data.diurne || 0);
};

// Selectors for Calculations
export const getTotalsForMonth = (state: StoreState, month: Month) => {
  const agents = state.employees.filter(e => e.type === 'AGENT');
  const productionEmployees = state.employees.filter(e => e.type === 'PRODUCTIE');
  const indirectEmployees = state.employees.filter(e => e.type === 'INDIRECT');
  const distributors = state.distributors;

  // Total costuri PRODUCȚIE (de la angajații tip PRODUCTIE)
  const totalProductionCosts = productionEmployees.reduce((sum, emp) => 
    sum + getEmployeeMonthlyCosts(emp, month), 0);

  // Total costuri INDIRECT (de la angajații tip INDIRECT)
  const totalIndirectEmployeeCosts = indirectEmployees.reduce((sum, emp) => 
    sum + getEmployeeMonthlyCosts(emp, month), 0);

  // Cost showroom București - 80% merge la indirecte
  const showroomBuc = state.showrooms.find(s => s.location === 'Bucuresti');
  let costShowroomBucTotal = 0;
  if (showroomBuc) {
    costShowroomBucTotal = Object.values(showroomBuc.costs).reduce((a, b) => a + b, 0);
  }
  const costBucDirect20 = costShowroomBucTotal * 0.20;
  const costBucIndirect80 = costShowroomBucTotal * 0.80;

  // Total INDIRECTE = costuri angajați INDIRECT + 80% București
  const totalIndirectCosts = totalIndirectEmployeeCosts + costBucIndirect80;

  // Venituri totale
  const totalVenitAgenti = agents.reduce((sum, a) => sum + (a.monthlyData[month]?.venitTVA || 0), 0);
  const totalVenitDistribuitori = distributors.reduce((sum, d) => sum + (d.monthlyData[month]?.venitTVA || 0), 0);
  const totalVenitFirma = totalVenitAgenti + totalVenitDistribuitori;

  // Venit GARDURI (pentru distribuirea costurilor de producție)
  const totalVenitGardAgenti = agents.reduce((sum, a) => sum + (a.monthlyData[month]?.venitGard || 0), 0);
  const totalVenitGardFirma = totalVenitGardAgenti + totalVenitDistribuitori; // distribuitorii vând și ei garduri

  // Costuri per showroom (pentru distribuire)
  const showroomTotals: Record<string, number> = {};
  const showroomRevenues: Record<string, number> = {};
  
  state.showrooms.forEach(s => {
    let cost = Object.values(s.costs).reduce((a, b) => a + b, 0);
    
    // București: doar 20% se distribuie agenților
    if (s.location === 'Bucuresti') {
      cost = costBucDirect20;
    }

    showroomTotals[s.id] = cost;
    showroomRevenues[s.id] = agents
      .filter(a => a.showroomId === s.id)
      .reduce((sum, a) => sum + (a.monthlyData[month]?.venitTVA || 0), 0);
  });

  return {
    totalProductionCosts,
    totalIndirectCosts,
    totalVenitFirma,
    totalVenitGardFirma,
    showroomTotals,
    showroomRevenues,
    costBucDirect20,
    costBucIndirect80
  };
};

export const calculateEmployeeMetrics = (emp: Employee, month: Month, totals: ReturnType<typeof getTotalsForMonth>) => {
  const data = emp.monthlyData[month] || {
    month,
    venitTVA: 0, venitGard: 0, venitAcoperis: 0, 
    achizitieGard: 0, achizitieAcoperis: 0,
    comisionPercent: 0,
    salariu: 0, amortizareAuto: 0, combustibil: 0, revizii: 0, alteCheltuieliAuto: 0, abonamente: 0, diurne: 0,
    costAmbalarePropriu: 0, costCurierAmbalare: 0, costCurierTransport: 0, transportIntern: 0
  };
  
  const { totalProductionCosts, totalIndirectCosts, totalVenitFirma, totalVenitGardFirma, showroomTotals, showroomRevenues } = totals;

  // Pentru PRODUCTIE și INDIRECT, nu calculăm profit (ei nu vând)
  if (emp.type !== 'AGENT') {
    const costuriProprii = (data.salariu || 0) + (data.amortizareAuto || 0) + (data.combustibil || 0) + 
                          (data.revizii || 0) + (data.alteCheltuieliAuto || 0) + (data.abonamente || 0) + (data.diurne || 0);
    return {
      ...data,
      venitGard: 0,
      venitAcoperis: 0,
      venitTVA: 0,
      achizitieGard: 0,
      achizitieAcoperis: 0,
      tvaGard: 0,
      tvaAcoperis: 0,
      adaosTVAGard: 0,
      adaosNetGard: 0,
      adaosTVAAcoperis: 0,
      adaosNetAcoperis: 0,
      adaosNetTotal: 0,
      valoareComision: 0,
      costuriProprii,
      costShowroom: 0,
      costProductie: 0,
      costIndirecte: 0,
      profitFinal: 0,
      contributionType: emp.type
    };
  }

  // === CALCULE PENTRU AGENȚI ===

  // GARDURI
  const venitGard = data.venitGard || 0;
  const achizitieGard = data.achizitieGard || 0;
  const adaosTVAGard = venitGard - achizitieGard;
  const tvaGard = venitGard * 0.21;
  const adaosNetGard = adaosTVAGard - tvaGard;

  // ACOPERISURI
  const venitAcoperis = data.venitAcoperis || 0;
  const achizitieAcoperis = data.achizitieAcoperis || 0;
  const adaosTVAAcoperis = venitAcoperis - achizitieAcoperis;
  const tvaAcoperis = venitAcoperis * 0.19;
  const adaosNetAcoperis = adaosTVAAcoperis - tvaAcoperis;
  
  const adaosNetTotal = adaosNetGard + adaosNetAcoperis;

  const venitTVA = data.venitTVA || 0;
  const valoareComision = venitTVA * ((data.comisionPercent || 0) / 100);
  
  // Costuri proprii ale agentului
  const costuriProprii = (data.salariu || 0) + (data.amortizareAuto || 0) + (data.combustibil || 0) + 
                        (data.revizii || 0) + (data.alteCheltuieliAuto || 0) + (data.abonamente || 0) + (data.diurne || 0);

  // Cost Showroom (proporțional cu venitul în cadrul showroom-ului)
  const showroomRevenue = emp.showroomId ? (showroomRevenues[emp.showroomId] || 0) : 0;
  const costShowroomTotal = emp.showroomId ? (showroomTotals[emp.showroomId] || 0) : 0;
  const costShowroom = showroomRevenue > 0 ? costShowroomTotal * (venitTVA / showroomRevenue) : 0;

  // Cost Producție (doar pentru cei cu venit garduri, proporțional)
  const costProductie = totalVenitGardFirma > 0 ? totalProductionCosts * (venitGard / totalVenitGardFirma) : 0;

  // Cost Indirecte (proporțional cu venitul total)
  const costIndirecte = totalVenitFirma > 0 ? totalIndirectCosts * (venitTVA / totalVenitFirma) : 0;

  // Costuri logistice
  const costuriLogistice = (data.costAmbalarePropriu || 0) + (data.costCurierAmbalare || 0) + 
                          (data.costCurierTransport || 0) + (data.transportIntern || 0);

  // PROFIT FINAL
  const profitFinal = adaosNetTotal - valoareComision - costuriProprii - costShowroom - costProductie - costIndirecte - costuriLogistice;

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
    costuriProprii,
    costuriLogistice,
    costShowroom,
    costProductie,
    costIndirecte,
    profitFinal,
    contributionType: 'AGENT'
  };
};

export const calculateDistributorMetrics = (dist: Distributor, month: Month, totals: ReturnType<typeof getTotalsForMonth>) => {
  const data = dist.monthlyData[month] || {
    month, venitTVA: 0, achizitieTVA: 0, comisionPercent: 0, cheltuieliMarketing: 0, costTransport: 0, costAmbalare: 0
  };
  const { totalProductionCosts, totalIndirectCosts, totalVenitFirma, totalVenitGardFirma } = totals;

  const adaosTVA = (data.venitTVA || 0) - (data.achizitieTVA || 0);
  const tva = (data.venitTVA || 0) * 0.19;
  const adaosNet = adaosTVA - tva;
  const comisionValoare = (data.venitTVA || 0) * ((data.comisionPercent || 0) / 100);

  const costProductie = totalVenitGardFirma > 0 ? totalProductionCosts * ((data.venitTVA || 0) / totalVenitGardFirma) : 0;
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
