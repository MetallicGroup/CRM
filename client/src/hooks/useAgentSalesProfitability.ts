import { useQuery } from "@tanstack/react-query";
import { Month } from "@/lib/types";

export interface AgentSalesProfitability {
  id: string;
  agentId: string;
  luna: number;
  an: number;
  venitGard: string;
  achizitieGard: string;
  adaosGard: string;
  comisionGard: string;
  venitAcoperis: string;
  achizitieAcoperis: string;
  adaosAcoperis: string;
  comisionAcoperis: string;
  nrVanzariGard: number;
  nrVanzariAcoperis: number;
  venitTvaTotal: string;
  comisionPercentMediu: string;
  updatedAt: string;
}

const MONTH_TO_NUMBER: Record<Month, number> = {
  'Ianuarie': 1, 'Februarie': 2, 'Martie': 3, 'Aprilie': 4,
  'Mai': 5, 'Iunie': 6, 'Iulie': 7, 'August': 8,
  'Septembrie': 9, 'Octombrie': 10, 'Noiembrie': 11, 'Decembrie': 12
};

export function useAllAgentsSalesProfitability(year: number = new Date().getFullYear()) {
  return useQuery<AgentSalesProfitability[]>({
    queryKey: ["all-agents-sales-profitability", year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/sales?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return [];
        }
        throw new Error("Eroare la încărcarea datelor de vânzări");
      }
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAgentSalesProfitabilityForMonth(month: Month, year: number = new Date().getFullYear()) {
  const luna = MONTH_TO_NUMBER[month];
  
  return useQuery<Record<string, AgentSalesProfitability>>({
    queryKey: ["all-agents-sales-profitability-month", luna, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/sales?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return {};
        }
        throw new Error("Eroare la încărcarea datelor de vânzări");
      }
      const data: AgentSalesProfitability[] = await res.json();
      
      const byAgentForMonth: Record<string, AgentSalesProfitability> = {};
      for (const item of data) {
        if (item.luna === luna) {
          byAgentForMonth[item.agentId] = item;
        }
      }
      return byAgentForMonth;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useRecalculateAllAgentsSales() {
  return async (an: number, luna: number) => {
    const res = await fetch('/api/profitabilitate/sales/recalculate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ an, luna }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error("Eroare la recalcularea profitabilității");
    }
    return res.json();
  };
}

export function getMonthNumber(month: Month): number {
  return MONTH_TO_NUMBER[month];
}
