import { useQuery } from "@tanstack/react-query";
import { Month } from "@/lib/types";

export interface AgentManualAchizitii {
  id: string;
  agentId: string;
  luna: number;
  an: number;
  achizitieGard: string;
  achizitieAcoperis: string;
}

const MONTH_TO_NUMBER: Record<Month, number> = {
  'Ianuarie': 1, 'Februarie': 2, 'Martie': 3, 'Aprilie': 4,
  'Mai': 5, 'Iunie': 6, 'Iulie': 7, 'August': 8,
  'Septembrie': 9, 'Octombrie': 10, 'Noiembrie': 11, 'Decembrie': 12
};

export function useAllAgentsManualAchizitii(year: number = new Date().getFullYear()) {
  return useQuery<AgentManualAchizitii[]>({
    queryKey: ["all-agents-manual-achizitii", year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/achizitii-manuale?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return [];
        }
        throw new Error("Eroare la încărcarea achizițiilor manuale");
      }
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAgentManualAchizitiiForMonth(month: Month, year: number = new Date().getFullYear()) {
  const luna = MONTH_TO_NUMBER[month];
  
  return useQuery<Record<string, AgentManualAchizitii>>({
    queryKey: ["all-agents-manual-achizitii-month", luna, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/achizitii-manuale?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return {};
        }
        throw new Error("Eroare la încărcarea achizițiilor manuale");
      }
      const data: AgentManualAchizitii[] = await res.json();
      
      const byAgentForMonth: Record<string, AgentManualAchizitii> = {};
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

export function useAgentManualAchizitiiRange(startMonth: number, endMonth: number, year: number = new Date().getFullYear()) {
  return useQuery<Record<string, AgentManualAchizitii>>({
    queryKey: ["all-agents-manual-achizitii-range", startMonth, endMonth, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/achizitii-manuale?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return {};
        }
        throw new Error("Eroare la încărcarea achizițiilor manuale");
      }
      const data: AgentManualAchizitii[] = await res.json();
      
      const aggregatedByAgent: Record<string, AgentManualAchizitii> = {};
      
      for (const item of data) {
        if (item.luna >= startMonth && item.luna <= endMonth) {
          if (!aggregatedByAgent[item.agentId]) {
            aggregatedByAgent[item.agentId] = {
              ...item,
              achizitieGard: "0",
              achizitieAcoperis: "0",
            };
          }
          
          const existing = aggregatedByAgent[item.agentId];
          existing.achizitieGard = (parseFloat(existing.achizitieGard || "0") + parseFloat(item.achizitieGard || "0")).toString();
          existing.achizitieAcoperis = (parseFloat(existing.achizitieAcoperis || "0") + parseFloat(item.achizitieAcoperis || "0")).toString();
        }
      }
      
      return aggregatedByAgent;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
