import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStore, getTotalsForMonth, calculateAgentMetrics } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Download } from "lucide-react";

export default function Agents() {
  const { agents, updateAgentData, selectedMonth } = useStore();
  const fullStore = useStore(); 
  const totals = getTotalsForMonth(fullStore, selectedMonth);

  const handleExportCSV = () => {
    const headers = [
      "Agent", "Showroom", 
      "Venit TVA", "Venit Gard", "Venit Acoperiș", "Achiziție TVA",
      "Adaos Net Total", "Valoare Comision",
      "Salariu", "Amortizare Auto", "Combustibil", "Revizii", "Alte Chelt. Auto", "Abonamente", "Diurne", "Total Variabile",
      "Cost Ambalare", "Curier Ambalare", "Curier Transport", "Transport Intern",
      "Cost Showroom", "Cost Producție", "Cost Indirecte",
      "PROFIT FINAL"
    ];

    const rows = agents.map(agent => {
      const m = calculateAgentMetrics(agent, selectedMonth, totals);
      return [
        agent.name, agent.showroomId,
        m.venitTVA, m.venitGard, m.venitAcoperis, m.achizitieTVA,
        m.adaosNetTotal, m.valoareComision,
        m.salariu, m.amortizareAuto, m.combustibil, m.revizii, m.alteCheltuieliAuto, m.abonamente, m.diurne, m.costuriVariabile,
        m.costAmbalarePropriu, m.costCurierAmbalare, m.costCurierTransport, m.transportIntern,
        m.costShowroom, m.costProductie, m.costIndirecte,
        m.profitFinal
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `raport_agenti_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenți - Detaliat ({selectedMonth})</h1>
          <p className="text-muted-foreground">Logică nouă: Producție alocată pe Garduri, Showroom Buc. split 20/80</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <MonthSelector />
        </div>
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
                    
                    {/* GARDURI */}
                    <TableHead className="min-w-[120px] bg-blue-50 dark:bg-blue-950 border-l-2 border-blue-500">Venit Gard</TableHead>
                    <TableHead className="min-w-[120px] bg-blue-50 dark:bg-blue-950">Achiz. Gard (Est)</TableHead>
                    <TableHead className="min-w-[120px] bg-blue-50 dark:bg-blue-950">Adaos Gard</TableHead>
                    <TableHead className="min-w-[100px] bg-blue-50 dark:bg-blue-950">TVA (21%)</TableHead>
                    <TableHead className="min-w-[120px] bg-blue-100 dark:bg-blue-900 font-bold">Adaos Net Gard</TableHead>
                    
                    {/* ACOPERISURI */}
                    <TableHead className="min-w-[120px] bg-amber-50 dark:bg-amber-950 border-l-2 border-amber-500">Venit Acoperiș</TableHead>
                    <TableHead className="min-w-[120px] bg-amber-50 dark:bg-amber-950">Achiz. Acop (Est)</TableHead>
                    <TableHead className="min-w-[120px] bg-amber-50 dark:bg-amber-950">Adaos Acop</TableHead>
                    <TableHead className="min-w-[100px] bg-amber-50 dark:bg-amber-950">TVA (19%)</TableHead>
                    <TableHead className="min-w-[120px] bg-amber-100 dark:bg-amber-900 font-bold">Adaos Net Acop</TableHead>

                    {/* TOTALS */}
                    <TableHead className="min-w-[120px] bg-purple-100 dark:bg-purple-900 font-bold border-l-2 border-purple-500">ADAOS NET TOTAL</TableHead>
                    
                    {/* Inputs Base */}
                    <TableHead className="min-w-[120px]">Venit TVA Total</TableHead>
                    <TableHead className="min-w-[120px]">Achiziție TVA</TableHead>
                    
                    {/* Comision */}
                    <TableHead className="min-w-[80px] bg-green-50 dark:bg-green-950">Comision %</TableHead>
                    <TableHead className="min-w-[120px] bg-green-50 dark:bg-green-950 font-bold">Valoare Comision</TableHead>
                    
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
                    <TableHead className="min-w-[120px] bg-gray-100 dark:bg-gray-800 font-bold">Cost Showroom</TableHead>
                    <TableHead className="min-w-[120px] bg-gray-100 dark:bg-gray-800 font-bold">Cost Producție</TableHead>
                    <TableHead className="min-w-[120px] bg-gray-100 dark:bg-gray-800 font-bold">Cost Indirecte</TableHead>
                    
                    {/* Profituri */}
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
                        
                        {/* GARDURI */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.venitGard} onChange={(e) => updateAgentData(agent.id, selectedMonth, { venitGard: Number(e.target.value) })} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{metrics.achizitieGard.toFixed(0)}</TableCell>
                        <TableCell>{metrics.adaosTVAGard.toFixed(0)}</TableCell>
                        <TableCell>{metrics.tvaGard.toFixed(0)}</TableCell>
                        <TableCell className="font-bold">{metrics.adaosNetGard.toFixed(0)}</TableCell>
                        
                        {/* ACOPERISURI */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.venitAcoperis} onChange={(e) => updateAgentData(agent.id, selectedMonth, { venitAcoperis: Number(e.target.value) })} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{metrics.achizitieAcoperis.toFixed(0)}</TableCell>
                        <TableCell>{metrics.adaosTVAAcoperis.toFixed(0)}</TableCell>
                        <TableCell>{metrics.tvaAcoperis.toFixed(0)}</TableCell>
                        <TableCell className="font-bold">{metrics.adaosNetAcoperis.toFixed(0)}</TableCell>

                        {/* TOTALS */}
                        <TableCell className="font-bold text-purple-600">{metrics.adaosNetTotal.toFixed(0)}</TableCell>

                        {/* Base Inputs */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.venitTVA} onChange={(e) => updateAgentData(agent.id, selectedMonth, { venitTVA: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.achizitieTVA} onChange={(e) => updateAgentData(agent.id, selectedMonth, { achizitieTVA: Number(e.target.value) })} /></TableCell>
                        
                        {/* Comision */}
                        <TableCell><Input type="number" className="w-16 h-8" value={metrics.comisionPercent} onChange={(e) => updateAgentData(agent.id, selectedMonth, { comisionPercent: Number(e.target.value) })} /></TableCell>
                        <TableCell className="font-bold text-green-600">{metrics.valoareComision.toFixed(0)}</TableCell>
                        
                        {/* Direct Costs Inputs */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.salariu} onChange={(e) => updateAgentData(agent.id, selectedMonth, { salariu: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.amortizareAuto} onChange={(e) => updateAgentData(agent.id, selectedMonth, { amortizareAuto: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.combustibil} onChange={(e) => updateAgentData(agent.id, selectedMonth, { combustibil: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.revizii} onChange={(e) => updateAgentData(agent.id, selectedMonth, { revizii: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.alteCheltuieliAuto} onChange={(e) => updateAgentData(agent.id, selectedMonth, { alteCheltuieliAuto: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.abonamente} onChange={(e) => updateAgentData(agent.id, selectedMonth, { abonamente: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.diurne} onChange={(e) => updateAgentData(agent.id, selectedMonth, { diurne: Number(e.target.value) })} /></TableCell>
                        <TableCell className="font-bold text-red-600">{metrics.costuriVariabile.toFixed(0)}</TableCell>
                        
                        {/* Logistics Inputs */}
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costAmbalarePropriu} onChange={(e) => updateAgentData(agent.id, selectedMonth, { costAmbalarePropriu: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costCurierAmbalare} onChange={(e) => updateAgentData(agent.id, selectedMonth, { costCurierAmbalare: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.costCurierTransport} onChange={(e) => updateAgentData(agent.id, selectedMonth, { costCurierTransport: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-24 h-8" value={metrics.transportIntern} onChange={(e) => updateAgentData(agent.id, selectedMonth, { transportIntern: Number(e.target.value) })} /></TableCell>
                        
                        {/* Distributed Costs (Read Only) */}
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costShowroom.toFixed(0)}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costProductie.toFixed(0)}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{metrics.costIndirecte.toFixed(0)}</TableCell>
                        
                        <TableCell className={`font-bold text-lg border-l-4 ${metrics.profitFinal >= 0 ? "text-emerald-600 border-emerald-500" : "text-red-600 border-red-500"}`}>
                          {metrics.profitFinal.toFixed(0)}
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
