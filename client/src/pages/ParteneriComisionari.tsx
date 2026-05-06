import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStore, monthToNumber } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface Partner {
  id: string;
  nume: string;
  tipPartener: string;
}

interface PartnerSaleRow {
  id: string;
  nume: string;
  dataVanzarii: string | null;
  valoareOferta: string | null;
  pretAchizitie: string | null;
  achizitiePartener: string | null;
}

export default function ParteneriComisionari() {
  const { selectedMonth, selectedYear } = useStore();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { isAdmin, user } = useAuth();
  const isOana =
    !!user &&
    (user.email?.toLowerCase().includes("oana") || user.firstName?.toLowerCase().includes("oana"));
  const canSeeAchizitii = isAdmin || isOana;

  const { data: partners = [], isLoading: loadingPartners } = useQuery<Partner[]>({
    queryKey: ["partners-comisionari"],
    queryFn: async () => {
      const res = await fetch("/api/partners?tipPartener=PARTENER_COMISIONAR&activ=true");
      if (!res.ok) throw new Error("Eroare la încărcarea partenerilor");
      return res.json();
    },
  });

  const partnerId = selectedPartnerId || partners[0]?.id || null;

  const { data: sales = [], isLoading: loadingSales } = useQuery<PartnerSaleRow[]>({
    queryKey: ["partner-comisionar-sales", partnerId, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!partnerId) return [];
      const luna = monthToNumber(selectedMonth);
      const params = new URLSearchParams({ luna: luna.toString(), an: selectedYear.toString() });
      const res = await fetch(`/api/partners/${partnerId}/comisionari-vanzari?` + params.toString());
      if (!res.ok) throw new Error("Eroare la încărcarea vânzărilor partenerului");
      return res.json();
    },
    enabled: !!partnerId,
  });

  const updateAchizitieMutation = useMutation({
    mutationFn: async ({ id, achizitiePartener }: { id: string; achizitiePartener: number }) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achizitiePartener: achizitiePartener.toString() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Eroare la salvarea achiziției partener");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-comisionar-sales"] });
      toast.success("Achiziție partener actualizată");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const metrics = useMemo(() => {
    let totalValoare = 0;
    let totalAchizPartner = 0;
    let totalAchizFurnizor = 0;
    let totalComision = 0;
    let totalProfit = 0;

    const rows = sales.map((row) => {
      const v = row.valoareOferta ? parseFloat(row.valoareOferta) : 0;
      const achizFurn = row.pretAchizitie ? parseFloat(row.pretAchizitie) : 0;
      // Achiziție partener este mereu +10% peste achiziția furnizor.
      const achizPart = achizFurn * 1.1;
      const baza = v - achizPart;
      // Comision partener: (valoare vândută - achiziție partener) / 1.21
      const comisionPartener = baza / 1.21;
      const profit = achizPart - achizFurn; // Profit = Achiziție partener - Achiziție furnizor

      totalValoare += v;
      totalAchizPartner += achizPart;
      totalAchizFurnizor += achizFurn;
      totalComision += comisionPartener;
      totalProfit += profit;

      return {
        ...row,
        v,
        achizPart,
        achizFurn,
        comisionPartener,
        profit,
      };
    });

    return {
      rows,
      totals: {
        totalValoare,
        totalAchizPartner,
        totalAchizFurnizor,
        totalComision,
        totalProfit,
      },
    };
  }, [sales]);

  if (loadingPartners) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parteneri comisionari</h1>
          <p className="text-slate-400">
            Analiză vânzări și comision pe partener, pe lună și an.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1 text-sm"
            value={partnerId || ""}
            onChange={(e) => setSelectedPartnerId(e.target.value || null)}
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nume}
              </option>
            ))}
          </select>
          <MonthSelector />
        </div>
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>
            {partners.find((p) => p.id === partnerId)?.nume || "Niciun partener selectat"} – {selectedMonth} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSales ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : metrics.rows.length === 0 ? (
            <p className="text-center py-8 text-slate-400">
              Nu există vânzări pentru acest partener în perioada selectată.
            </p>
          ) : (
            <>
              <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="flex w-max space-x-4 p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Data vânzării</TableHead>
                        <TableHead className="text-right">Valoare vândută</TableHead>
                        {canSeeAchizitii && (
                          <>
                            <TableHead className="text-right">Achiziție partener</TableHead>
                            <TableHead className="text-right">Achiziție furnizor</TableHead>
                          </>
                        )}
                        <TableHead className="text-right">Comision partener</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.nume}</TableCell>
                          <TableCell>
                            {row.dataVanzarii
                              ? new Date(row.dataVanzarii).toLocaleDateString("ro-RO")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.v.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          {canSeeAchizitii && (
                            <>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  className="w-28 h-8 text-right"
                                  defaultValue={row.achizPart || ""}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value || "0");
                                    const ach = isNaN(val) ? 0 : val;
                                    updateAchizitieMutation.mutate({ id: row.id, achizitiePartener: ach });
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {row.achizFurn.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-right">
                            {row.comisionPartener.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {row.profit.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-slate-900/40">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">
                          {metrics.totals.totalValoare.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        {canSeeAchizitii && (
                          <>
                            <TableCell className="text-right">
                              {metrics.totals.totalAchizPartner.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              {metrics.totals.totalAchizFurnizor.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right">
                          {metrics.totals.totalComision.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {metrics.totals.totalProfit.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

