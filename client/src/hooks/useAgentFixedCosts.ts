import { useQuery } from "@tanstack/react-query";
import { Month } from "@/lib/types";

export interface AgentFixedCosts {
  id: string;
  agentId: string;
  luna: number;
  an: number;
  salariu: string;
  amortizareAuto: string;
  combustibil: string;
  revizii: string;
  alteCheltuieliAuto: string;
  abonamente: string;
  diurne: string;
  alteCheltuieli: string;
}

const MONTH_TO_NUMBER: Record<Month, number> = {
  'Ianuarie': 1, 'Februarie': 2, 'Martie': 3, 'Aprilie': 4,
  'Mai': 5, 'Iunie': 6, 'Iulie': 7, 'August': 8,
  'Septembrie': 9, 'Octombrie': 10, 'Noiembrie': 11, 'Decembrie': 12
};

export function useAllAgentsFixedCosts(year: number = new Date().getFullYear()) {
  return useQuery<AgentFixedCosts[]>({
    queryKey: ["/api/profitabilitate/cheltuieli-fixe", year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/cheltuieli-fixe?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return [];
        }
        throw new Error("Eroare la încărcarea cheltuielilor fixe");
      }
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAgentFixedCostsForMonth(month: Month, year: number = new Date().getFullYear()) {
  const luna = MONTH_TO_NUMBER[month];
  
  return useQuery<Record<string, AgentFixedCosts>>({
    queryKey: ["/api/profitabilitate/cheltuieli-fixe", "month", luna, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/cheltuieli-fixe?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return {};
        }
        throw new Error("Eroare la încărcarea cheltuielilor fixe");
      }
      const data: AgentFixedCosts[] = await res.json();
      
      const byAgentForMonth: Record<string, AgentFixedCosts> = {};
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

export function useAgentFixedCostsRange(startMonth: number, endMonth: number, year: number = new Date().getFullYear()) {
  return useQuery<Record<string, {
    salariu: number;
    amortizareAuto: number;
    combustibil: number;
    revizii: number;
    alteCheltuieliAuto: number;
    abonamente: number;
    diurne: number;
    alteCheltuieli: number;
    totalCosturi: number;
  }>>({
    queryKey: ["/api/profitabilitate/cheltuieli-fixe", "range", startMonth, endMonth, year],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/cheltuieli-fixe?an=${year}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          return {};
        }
        throw new Error("Eroare la încărcarea cheltuielilor fixe");
      }
      const data: AgentFixedCosts[] = await res.json();
      
      const aggregatedByAgent: Record<string, {
        salariu: number;
        amortizareAuto: number;
        combustibil: number;
        revizii: number;
        alteCheltuieliAuto: number;
        abonamente: number;
        diurne: number;
        alteCheltuieli: number;
        totalCosturi: number;
      }> = {};
      
      for (const item of data) {
        if (item.luna >= startMonth && item.luna <= endMonth) {
          if (!aggregatedByAgent[item.agentId]) {
            aggregatedByAgent[item.agentId] = {
              salariu: 0,
              amortizareAuto: 0,
              combustibil: 0,
              revizii: 0,
              alteCheltuieliAuto: 0,
              abonamente: 0,
              diurne: 0,
              alteCheltuieli: 0,
              totalCosturi: 0,
            };
          }
          
          const agg = aggregatedByAgent[item.agentId];
          agg.salariu += parseFloat(item.salariu || "0");
          agg.amortizareAuto += parseFloat(item.amortizareAuto || "0");
          agg.combustibil += parseFloat(item.combustibil || "0");
          agg.revizii += parseFloat(item.revizii || "0");
          agg.alteCheltuieliAuto += parseFloat(item.alteCheltuieliAuto || "0");
          agg.abonamente += parseFloat(item.abonamente || "0");
          agg.diurne += parseFloat(item.diurne || "0");
          agg.alteCheltuieli += parseFloat(item.alteCheltuieli || "0");
        }
      }
      
      for (const agentId of Object.keys(aggregatedByAgent)) {
        const agg = aggregatedByAgent[agentId];
        agg.totalCosturi = agg.salariu + agg.amortizareAuto + agg.combustibil + agg.revizii + 
                          agg.alteCheltuieliAuto + agg.abonamente + agg.diurne + agg.alteCheltuieli;
      }
      
      return aggregatedByAgent;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
