import { useQuery } from "@tanstack/react-query";

export interface AgentProfitabilityClient {
  id: string;
  nume: string;
  telefon: string;
  email: string | null;
  localitate: string | null;
  judet: string | null;
  categorieProdus: string | null;
  valoareOferta: string | null;
  pretAchizitie: string | null;
  comisionOferta: string | null;
  dataLivrarii: string | null;
  stadiuOferta: string | null;
  stadiuComanda: string | null;
  partnerId: string | null;
  partnerName: string | null;
  adaos: number;
  profitCategory: "GARD" | "ACOPERIS";
}

export interface AgentProfitabilityClientsResponse {
  clients: AgentProfitabilityClient[];
  totals: {
    venitTotal: number;
    achizitieTotal: number;
    adaosTotal: number;
    count: number;
  };
}

export function useAgentProfitabilityClients(
  agentId: string | undefined,
  an: number,
  startMonth: number,
  endMonth: number
) {
  return useQuery<AgentProfitabilityClientsResponse>({
    queryKey: ["agent-profitability-clients", agentId, an, startMonth, endMonth],
    queryFn: async () => {
      const params = new URLSearchParams({
        an: an.toString(),
        startMonth: startMonth.toString(),
        endMonth: endMonth.toString(),
      });
      const res = await fetch(
        `/api/profitabilitate/sales/${agentId}/clients?${params.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Eroare la încărcarea clienților");
      return res.json();
    },
    enabled: !!agentId,
  });
}
