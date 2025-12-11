import { useQuery } from "@tanstack/react-query";
import { Month, MONTHS } from "@/lib/types";

export interface AgentCosts {
  salariu: number;
  amortizareAuto: number;
  combustibil: number;
  revizii: number;
  alteCheltuieliAuto: number;
  abonamente: number;
  diurne: number;
  alteCheltuieli: number;
}

interface AllAgentsCosts {
  [agentId: string]: AgentCosts & { agentName: string };
}

const MONTH_TO_NUMBER: Record<Month, number> = {
  'Ianuarie': 1, 'Februarie': 2, 'Martie': 3, 'Aprilie': 4,
  'Mai': 5, 'Iunie': 6, 'Iulie': 7, 'August': 8,
  'Septembrie': 9, 'Octombrie': 10, 'Noiembrie': 11, 'Decembrie': 12
};

export function useAllAgentsExpenseCosts(month: Month, year: number = new Date().getFullYear()) {
  const luna = MONTH_TO_NUMBER[month];
  
  return useQuery<AllAgentsCosts>({
    queryKey: ["all-agents-expense-costs", luna, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/all-agents-costs?luna=${luna}&an=${year}`);
      if (!res.ok) {
        if (res.status === 403) {
          return {};
        }
        throw new Error("Eroare la încărcarea costurilor");
      }
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAgentExpenseCosts(agentId: string, month: Month, year: number = new Date().getFullYear()) {
  const luna = MONTH_TO_NUMBER[month];
  
  return useQuery<AgentCosts>({
    queryKey: ["agent-expense-costs", agentId, luna, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/agent-costs/${agentId}?luna=${luna}&an=${year}`);
      if (!res.ok) {
        if (res.status === 403) {
          return {
            salariu: 0,
            amortizareAuto: 0,
            combustibil: 0,
            revizii: 0,
            alteCheltuieliAuto: 0,
            abonamente: 0,
            diurne: 0,
            alteCheltuieli: 0,
          };
        }
        throw new Error("Eroare la încărcarea costurilor");
      }
      return res.json();
    },
    enabled: !!agentId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function getMonthNumber(month: Month): number {
  return MONTH_TO_NUMBER[month];
}

export interface ShowroomCostDistributed {
  agentId: string;
  agentName: string;
  sediuId: string;
  sediuName: string;
  costuriShowroomDistribuite: number;
}

interface AllShowroomCostsDistributed {
  [agentId: string]: ShowroomCostDistributed;
}

export function useShowroomCostsDistributed(month: Month, year: number = new Date().getFullYear()) {
  const luna = MONTH_TO_NUMBER[month];
  
  return useQuery<AllShowroomCostsDistributed>({
    queryKey: ["showroom-costs-distributed", luna, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/showroom-costs-distributed?luna=${luna}&an=${year}`);
      if (!res.ok) {
        if (res.status === 403) {
          return {};
        }
        throw new Error("Eroare la încărcarea costurilor showroom distribuite");
      }
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// Hook for fetching expense costs for a range of months
export function useAgentsExpenseCostsRange(startMonth: number, endMonth: number, year: number = new Date().getFullYear()) {
  return useQuery<AllAgentsCosts>({
    queryKey: ["all-agents-expense-costs-range", startMonth, endMonth, year],
    queryFn: async () => {
      // Fetch data for each month in range and aggregate
      const promises = [];
      for (let m = startMonth; m <= endMonth; m++) {
        promises.push(
          fetch(`/api/profitabilitate/all-agents-costs?luna=${m}&an=${year}`)
            .then(res => res.ok ? res.json() : {})
        );
      }
      const monthlyData = await Promise.all(promises);
      
      // Aggregate across months
      const aggregated: AllAgentsCosts = {};
      for (const monthData of monthlyData) {
        for (const [agentId, costs] of Object.entries(monthData as AllAgentsCosts)) {
          if (!aggregated[agentId]) {
            aggregated[agentId] = { ...costs };
          } else {
            aggregated[agentId].salariu += costs.salariu;
            aggregated[agentId].amortizareAuto += costs.amortizareAuto;
            aggregated[agentId].combustibil += costs.combustibil;
            aggregated[agentId].revizii += costs.revizii;
            aggregated[agentId].alteCheltuieliAuto += costs.alteCheltuieliAuto;
            aggregated[agentId].abonamente += costs.abonamente;
            aggregated[agentId].diurne += costs.diurne;
            aggregated[agentId].alteCheltuieli += costs.alteCheltuieli;
          }
        }
      }
      return aggregated;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// Hook for fetching showroom costs distributed for a range of months
export function useShowroomCostsDistributedRange(startMonth: number, endMonth: number, year: number = new Date().getFullYear()) {
  return useQuery<AllShowroomCostsDistributed>({
    queryKey: ["showroom-costs-distributed-range", startMonth, endMonth, year],
    queryFn: async () => {
      // Fetch data for each month in range and aggregate
      const promises = [];
      for (let m = startMonth; m <= endMonth; m++) {
        promises.push(
          fetch(`/api/profitabilitate/showroom-costs-distributed?luna=${m}&an=${year}`)
            .then(res => res.ok ? res.json() : {})
        );
      }
      const monthlyData = await Promise.all(promises);
      
      // Aggregate across months
      const aggregated: AllShowroomCostsDistributed = {};
      for (const monthData of monthlyData) {
        for (const [agentId, costs] of Object.entries(monthData as AllShowroomCostsDistributed)) {
          if (!aggregated[agentId]) {
            aggregated[agentId] = { ...costs };
          } else {
            aggregated[agentId].costuriShowroomDistribuite += costs.costuriShowroomDistribuite;
          }
        }
      }
      return aggregated;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
