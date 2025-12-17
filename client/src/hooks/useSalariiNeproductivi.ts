import { useQuery } from "@tanstack/react-query";
import { Month } from "@/lib/types";

interface SalariiTotals {
  totalProductie: number;
  totalIndirect: number;
  totalGeneral: number;
  byAngajat: Record<string, number>;
}

const MONTHS = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

function getMonthNumber(monthName: Month): number {
  const index = MONTHS.indexOf(monthName);
  return index >= 0 ? index + 1 : 1;
}

export function useSalariiNeproductiviTotals(month: Month, year: number) {
  const luna = getMonthNumber(month);
  
  return useQuery<SalariiTotals>({
    queryKey: ["/api/salarii-neproductivi/totals", luna, year],
    queryFn: async () => {
      const res = await fetch(`/api/salarii-neproductivi/totals?luna=${luna}&an=${year}`);
      if (!res.ok) throw new Error("Failed to fetch salarii totals");
      return res.json();
    }
  });
}

export function useSalariiNeproductiviTotalsRange(startMonth: number, endMonth: number, year: number) {
  return useQuery<SalariiTotals>({
    queryKey: ["/api/salarii-neproductivi/totals/range", startMonth, endMonth, year],
    queryFn: async () => {
      let totalProductie = 0;
      let totalIndirect = 0;
      const byAngajat: Record<string, number> = {};
      
      // Fetch all months in parallel for better performance
      const promises = [];
      for (let luna = startMonth; luna <= endMonth; luna++) {
        promises.push(
          fetch(`/api/salarii-neproductivi/totals?luna=${luna}&an=${year}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
      }
      
      const results = await Promise.all(promises);
      
      for (const data of results) {
        if (!data) continue;
        // Ensure numeric values
        totalProductie += Number(data.totalProductie) || 0;
        totalIndirect += Number(data.totalIndirect) || 0;
        
        if (data.byAngajat) {
          for (const [name, cost] of Object.entries(data.byAngajat)) {
            byAngajat[name] = (byAngajat[name] || 0) + (Number(cost) || 0);
          }
        }
      }
      
      return {
        totalProductie,
        totalIndirect,
        totalGeneral: totalProductie + totalIndirect,
        byAngajat
      };
    },
    enabled: startMonth <= endMonth
  });
}
