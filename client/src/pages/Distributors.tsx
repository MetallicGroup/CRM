import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStore, monthToNumber } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { useDistributors, useDistributorMonthlyData, useUpsertDistributorMonthly } from "@/hooks/use-financials";
import { calculateDistributorMetrics } from "@/lib/calculations";
import { Loader2 } from "lucide-react";

export default function Distributors() {
  const { selectedMonth, selectedYear } = useStore();
  const { data: distributors = [], isLoading: loadingDistributors } = useDistributors();
  const { data: monthlyData = [], isLoading: loadingMonthly } = useDistributorMonthlyData(
    undefined,
    monthToNumber(selectedMonth),
    selectedYear
  );
  const upsertMutation = useUpsertDistributorMonthly();

  if (loadingDistributors || loadingMonthly) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const monthlyDataMap = new Map(monthlyData.map(d => [d.partnerId, d]));

  const handleUpdate = (partnerId: string, field: string, value: number) => {
    const existing = monthlyDataMap.get(partnerId) || {
      partnerId,
      luna: monthToNumber(selectedMonth),
      an: selectedYear,
      venitTva: "0",
      achizitieTva: "0",
      comisionPercent: "0",
      cheltuieliMarketing: "0",
      costTransport: "0",
      costAmbalare: "0"
    };

    upsertMutation.mutate({
      ...existing,
      [field]: value.toString()
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Distribuitori</h1>
          <p className="text-slate-400">Logică nouă: Datele sunt salvate automat în baza de date</p>
        </div>
        <MonthSelector />
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Date Distribuitori - {selectedMonth} {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="flex w-max space-x-4 p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px] sticky left-0 bg-background z-10">Nume Distribuitor</TableHead>
                    <TableHead className="min-w-[120px]">Venit TVA</TableHead>
                    <TableHead className="min-w-[120px]">Achiziție TVA</TableHead>
                    <TableHead className="min-w-[120px]">ADAOS TVA</TableHead>
                    <TableHead className="min-w-[100px]">TVA</TableHead>
                    <TableHead className="min-w-[120px] font-bold">ADAOS FĂRĂ TVA</TableHead>
                    <TableHead className="min-w-[100px]">Comision %</TableHead>
                    <TableHead className="min-w-[120px]">Valoare Comision</TableHead>
                    <TableHead className="min-w-[120px]">Cheltuieli Marketing</TableHead>
                    <TableHead className="min-w-[120px]">Cost Transport</TableHead>
                    <TableHead className="min-w-[120px]">Cost Ambalare</TableHead>
                    <TableHead className="min-w-[140px] font-bold text-lg border-l-4 border-blue-500">PROFIT NET LOCAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributors.map((dist) => {
                    const data = monthlyDataMap.get(dist.id) || {};
                    const metrics = calculateDistributorMetrics(data);

                    return (
                      <TableRow key={dist.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                          {dist.nume}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            defaultValue={metrics.venitTVA}
                            onBlur={(e) => handleUpdate(dist.id, 'venitTva', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            defaultValue={metrics.achizitieTVA}
                            onBlur={(e) => handleUpdate(dist.id, 'achizitieTva', Number(e.target.value))}
                          />
                        </TableCell>

                        <TableCell>{metrics.adaosTVA.toFixed(2)}</TableCell>
                        <TableCell>{metrics.tva.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">{metrics.adaosFaraTVA.toFixed(2)}</TableCell>

                        <TableCell>
                          <Input
                            type="number"
                            className="w-16 h-8"
                            defaultValue={metrics.comisionPercent}
                            onBlur={(e) => handleUpdate(dist.id, 'comisionPercent', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>{metrics.comisionValoare.toFixed(2)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            defaultValue={metrics.cheltuieliMarketing}
                            onBlur={(e) => handleUpdate(dist.id, 'cheltuieliMarketing', Number(e.target.value))}
                          />
                        </TableCell>

                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            defaultValue={metrics.costTransport}
                            onBlur={(e) => handleUpdate(dist.id, 'costTransport', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            defaultValue={metrics.costAmbalare}
                            onBlur={(e) => handleUpdate(dist.id, 'costAmbalare', Number(e.target.value))}
                          />
                        </TableCell>

                        <TableCell className={`font-bold text-lg border-l-4 ${metrics.profitNet >= 0 ? "text-emerald-600 border-emerald-500" : "text-red-600 border-red-500"}`}>
                          {metrics.profitNet.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400 italic">* Profitul net local nu include costurile de producție și indirecte distribuite de grup. Vezi raportul general pentru profitul final.</p>
    </div>
  );
}

