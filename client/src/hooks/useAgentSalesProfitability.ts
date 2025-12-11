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

// Hook for fetching sales profitability for a range of months
export function useAgentSalesProfitabilityRange(startMonth: number, endMonth: number, year: number = new Date().getFullYear()) {
  return useQuery<Record<string, AgentSalesProfitability>>({
    queryKey: ["all-agents-sales-profitability-range", startMonth, endMonth, year],
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
      
      // Aggregate data for each agent across the month range
      const aggregatedByAgent: Record<string, AgentSalesProfitability> = {};
      
      for (const item of data) {
        if (item.luna >= startMonth && item.luna <= endMonth) {
          if (!aggregatedByAgent[item.agentId]) {
            aggregatedByAgent[item.agentId] = {
              ...item,
              venitGard: "0",
              achizitieGard: "0",
              adaosGard: "0",
              comisionGard: "0",
              venitAcoperis: "0",
              achizitieAcoperis: "0",
              adaosAcoperis: "0",
              comisionAcoperis: "0",
              nrVanzariGard: 0,
              nrVanzariAcoperis: 0,
              venitTvaTotal: "0",
              comisionPercentMediu: "0",
            };
          }
          
          const agg = aggregatedByAgent[item.agentId];
          agg.venitGard = (parseFloat(agg.venitGard) + parseFloat(item.venitGard)).toFixed(2);
          agg.achizitieGard = (parseFloat(agg.achizitieGard) + parseFloat(item.achizitieGard)).toFixed(2);
          agg.adaosGard = (parseFloat(agg.adaosGard) + parseFloat(item.adaosGard)).toFixed(2);
          agg.comisionGard = (parseFloat(agg.comisionGard) + parseFloat(item.comisionGard)).toFixed(2);
          agg.venitAcoperis = (parseFloat(agg.venitAcoperis) + parseFloat(item.venitAcoperis)).toFixed(2);
          agg.achizitieAcoperis = (parseFloat(agg.achizitieAcoperis) + parseFloat(item.achizitieAcoperis)).toFixed(2);
          agg.adaosAcoperis = (parseFloat(agg.adaosAcoperis) + parseFloat(item.adaosAcoperis)).toFixed(2);
          agg.comisionAcoperis = (parseFloat(agg.comisionAcoperis) + parseFloat(item.comisionAcoperis)).toFixed(2);
          agg.nrVanzariGard += item.nrVanzariGard;
          agg.nrVanzariAcoperis += item.nrVanzariAcoperis;
          agg.venitTvaTotal = (parseFloat(agg.venitTvaTotal) + parseFloat(item.venitTvaTotal || "0")).toFixed(2);
          
          // Calculate weighted average commission percent
          const totalComision = parseFloat(agg.comisionGard) + parseFloat(agg.comisionAcoperis);
          const totalVenit = parseFloat(agg.venitTvaTotal);
          agg.comisionPercentMediu = totalVenit > 0 ? ((totalComision / totalVenit) * 100).toFixed(2) : "0";
        }
      }
      return aggregatedByAgent;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
