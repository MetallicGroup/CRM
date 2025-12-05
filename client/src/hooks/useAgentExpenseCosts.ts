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
