import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStore, getTotalsForMonth, calculateAgentMetrics } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { formatCurrency } from "@/lib/utils";

export default function Agents() {
  const { agents, updateAgentData, selectedMonth, store } = useStore();
  // We need the full store to calculate totals
  const fullStore = useStore(); 
  const totals = getTotalsForMonth(fullStore, selectedMonth);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenți - Detaliat ({selectedMonth})</h1>
          <p className="text-muted-foreground">Calcule complete comisioane și profitabilitate</p>
        </div>
        <MonthSelector />
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Date Financiare Agenți</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="flex w-max space-x-4 p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px] sticky left-0 bg-background z-10">Agent</TableHead>
                    
                    {/* Venituri */}
                    <TableHead className="min-w-[120px] bg-blue-50 dark:bg-blue-950">Venit TVA</TableHead>
                    <TableHead className="min-w-[120px] bg-blue-50 dark:bg-blue-950">Venit Gard</TableHead>
                    <TableHead className="min-w-[120px] bg-blue-50 dark:bg-blue-950">Venit Acoperiș</TableHead>
                    <TableHead className="min-w-[120px] bg-blue-50 dark:bg-blue-950">Achiziție TVA</TableHead>
                    
                    {/* Comision */}
                    <TableHead className="min-w-[80px] bg-green-50 dark:bg-green-950">Comision %</TableHead>
                    <TableHead className="min-w-[120px] bg-green-50 dark:bg-green-950 font-bold">Valoare Comision</TableHead>
                    
                    {/* Calcule Intermediare */}
                    <TableHead className="min-w-[120px]">Venit Brut</TableHead>
                    <TableHead className="min-w-[100px]">TVA (19%)</TableHead>
                    <TableHead className="min-w-[120px] font-bold">Venit Net</TableHead>
                    
                    {/* Cheltuieli Directe */}
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950">Salariu</TableHead>
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950">Amortizare Auto</TableHead>
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950">Combustibil</TableHead>
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950">Revizii</TableHead>
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950">Alte Cheltuieli</TableHead>
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950">Abonamente</TableHead>
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950">Diurne</TableHead>
                    <TableHead className="min-w-[120px] bg-red-50 dark:bg-red-950 font-bold">Total Variabile</TableHead>
                    
                    {/* Costuri Logistice */}
                    <TableHead className="min-w-[120px] bg-orange-50 dark:bg-orange-950">Ambalare Propriu</TableHead>
                    <TableHead className="min-w-[120px] bg-orange-50 dark:bg-orange-950">Curier Ambalare</TableHead>
                    <TableHead className="min-w-[120px] bg-orange-50 dark:bg-orange-950">Curier Transport</TableHead>
                    <TableHead className="min-w-[120px] bg-orange-50 dark:bg-orange-950">Transport Intern</TableHead>
                    
                    {/* Costuri Distribuite */}
                    <TableHead className="min-w-[120px] bg-gray-100 dark:bg-gray-800 font-bold">Cost HQ</TableHead>
                    <TableHead className="min-w-[120px] bg-gray-100 dark:bg-gray-800 font-bold">Cost Showroom</TableHead>
                    <TableHead className="min-w-[120px] bg-gray-100 dark:bg-gray-800 font-bold">Cost Producție</TableHead>
                    <TableHead className="min-w-[120px] bg-gray-100 dark:bg-gray-800 font-bold">Cost Indirecte</TableHead>
                    
                    {/* Profituri */}
                    <TableHead className="min-w-[120px] bg-emerald-100 dark:bg-emerald-900 font-bold">Profit Garduri</TableHead>
                    <TableHead className="min-w-[120px] bg-emerald-100 dark:bg-emerald-900 font-bold">Profit Acoperiș</TableHead>
                    <TableHead className="min-w-[120px] bg-emerald-100 dark:bg-emerald-900 font-bold">Profit General</TableHead>
                    <TableHead className="min-w-[140px] bg-emerald-200 dark:bg-emerald-800 font-bold text-lg border-l-4 border-emerald-500">PROFIT FINAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => {
                    const metrics = calculateAgentMetrics(agent, selectedMonth, totals);
                    
                    return (
                      <TableRow key={agent.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                          <div className="flex flex-col">
                            <span>{agent.name}</span>
                            <span className="text-xs text-muted-foreground">{agent.showroomId}</span>
                          </div>
                        </TableCell>
                        
                        {/* Venituri Inputs */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.venitTVA} onChange={(e) => updateAgentData(agent.id, selectedMonth, { venitTVA: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.venitGard} onChange={(e) => updateAgentData(agent.id, selectedMonth, { venitGard: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.venitAcoperis} onChange={(e) => updateAgentData(agent.id, selectedMonth, { venitAcoperis: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.achizitieTVA} onChange={(e) => updateAgentData(agent.id, selectedMonth, { achizitieTVA: Number(e.target.value) })} /></TableCell>
                        
                        {/* Comision Input */}
                        <TableCell><Input type="number" className="w-16 h-8" value={metrics.comisionPercent} onChange={(e) => updateAgentData(agent.id, selectedMonth, { comisionPercent: Number(e.target.value) })} /></TableCell>
                        <TableCell className="font-bold text-green-600">{metrics.valoareComision.toFixed(2)}</TableCell>
                        
                        {/* Computed */}
                        <TableCell>{metrics.venitBrut.toFixed(2)}</TableCell>
                        <TableCell>{metrics.tva.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">{metrics.venitNet.toFixed(2)}</TableCell>
                        
                        {/* Direct Costs Inputs */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.salariu} onChange={(e) => updateAgentData(agent.id, selectedMonth, { salariu: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.amortizareAuto} onChange={(e) => updateAgentData(agent.id, selectedMonth, { amortizareAuto: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.combustibil} onChange={(e) => updateAgentData(agent.id, selectedMonth, { combustibil: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.revizii} onChange={(e) => updateAgentData(agent.id, selectedMonth, { revizii: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.alteCheltuieliAuto} onChange={(e) => updateAgentData(agent.id, selectedMonth, { alteCheltuieliAuto: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.abonamente} onChange={(e) => updateAgentData(agent.id, selectedMonth, { abonamente: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.diurne} onChange={(e) => updateAgentData(agent.id, selectedMonth, { diurne: Number(e.target.value) })} /></TableCell>
                        <TableCell className="font-bold text-red-600">{metrics.costuriVariabile.toFixed(2)}</TableCell>
                        
                        {/* Logistics Inputs */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costAmbalarePropriu} onChange={(e) => updateAgentData(agent.id, selectedMonth, { costAmbalarePropriu: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costCurierAmbalare} onChange={(e) => updateAgentData(agent.id, selectedMonth, { costCurierAmbalare: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costCurierTransport} onChange={(e) => updateAgentData(agent.id, selectedMonth, { costCurierTransport: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.transportIntern} onChange={(e) => updateAgentData(agent.id, selectedMonth, { transportIntern: Number(e.target.value) })} /></TableCell>
                        
                        {/* Distributed Costs (Read Only) */}
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costHQ.toFixed(2)}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costShowroom.toFixed(2)}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costProductie.toFixed(2)}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costIndirecte.toFixed(2)}</TableCell>
                        
                        {/* Profits */}
                        <TableCell className={metrics.profitGarduri >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{metrics.profitGarduri.toFixed(2)}</TableCell>
                        <TableCell className={metrics.profitAcoperisuri >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{metrics.profitAcoperisuri.toFixed(2)}</TableCell>
                        <TableCell className={metrics.profitGeneral >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{metrics.profitGeneral.toFixed(2)}</TableCell>
                        
                        <TableCell className={`font-bold text-lg border-l-4 ${metrics.profitFinal >= 0 ? "text-emerald-600 border-emerald-500" : "text-red-600 border-red-500"}`}>
                          {metrics.profitFinal.toFixed(2)}
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
