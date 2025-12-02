import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStore, getTotalsForMonth, calculateDistributorMetrics } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";

export default function Distributors() {
  const { distributors = [], updateDistributorData, selectedMonth } = useStore();
  const fullStore = useStore();
  const totals = getTotalsForMonth(fullStore, selectedMonth);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Distribuitori</h1>
          <p className="text-muted-foreground">Logică nouă: Include Transport, Ambalare și distribuire Producție</p>
        </div>
        <MonthSelector />
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Date Distribuitori</CardTitle>
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
                    <TableHead className="min-w-[120px]">Cost Producție</TableHead>
                    <TableHead className="min-w-[120px]">Cost Indirecte</TableHead>
                    <TableHead className="min-w-[140px] font-bold text-lg border-l-4 border-blue-500">PROFIT NET</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributors.map((dist) => {
                    const metrics = calculateDistributorMetrics(dist, selectedMonth, totals);
                    
                    return (
                      <TableRow key={dist.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                          {dist.name}
                        </TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.venitTVA} onChange={(e) => updateDistributorData(dist.id, selectedMonth, { venitTVA: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.achizitieTVA} onChange={(e) => updateDistributorData(dist.id, selectedMonth, { achizitieTVA: Number(e.target.value) })} /></TableCell>
                        
                        <TableCell>{metrics.adaosTVA.toFixed(2)}</TableCell>
                        <TableCell>{metrics.tva.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">{metrics.adaosFaraTVA.toFixed(2)}</TableCell>
                        
                        <TableCell><Input type="number" className="w-16 h-8" value={metrics.comisionPercent} onChange={(e) => updateDistributorData(dist.id, selectedMonth, { comisionPercent: Number(e.target.value) })} /></TableCell>
                        <TableCell>{metrics.comisionValoare.toFixed(2)}</TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.cheltuieliMarketing} onChange={(e) => updateDistributorData(dist.id, selectedMonth, { cheltuieliMarketing: Number(e.target.value) })} /></TableCell>
                        
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costTransport} onChange={(e) => updateDistributorData(dist.id, selectedMonth, { costTransport: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costAmbalare} onChange={(e) => updateDistributorData(dist.id, selectedMonth, { costAmbalare: Number(e.target.value) })} /></TableCell>
                        
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costProductie.toFixed(2)}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costIndirecte.toFixed(2)}</TableCell>
                        
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
    </div>
  );
}
