import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore, getTotalsForMonth, calculateEmployeeMetrics } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Download, Plus, Trash2 } from "lucide-react";
import { Employee, EmployeeType, MONTHS } from "@/lib/types";
import { useState } from "react";

const TYPE_LABELS: Record<EmployeeType, string> = {
  'AGENT': 'Agent',
  'PRODUCTIE': 'Producție',
  'INDIRECT': 'Indirect/HQ'
};

const TYPE_COLORS: Record<EmployeeType, string> = {
  'AGENT': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'PRODUCTIE': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'INDIRECT': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

export default function Angajati() {
  const { employees = [], showrooms = [], updateEmployeeData, updateEmployee, addEmployee, removeEmployee, selectedMonth } = useStore();
  const fullStore = useStore();
  const totals = getTotalsForMonth(fullStore, selectedMonth);
  
  const [filterType, setFilterType] = useState<EmployeeType | 'ALL'>('ALL');

  const filteredEmployees = filterType === 'ALL' 
    ? employees 
    : employees.filter(e => e.type === filterType);

  const handleAddEmployee = (type: EmployeeType) => {
    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      name: 'Angajat Nou',
      type,
      showroomId: type === 'AGENT' ? 'sh_constanta' : null,
      monthlyData: {} as any
    };
    MONTHS.forEach(month => {
      newEmp.monthlyData[month] = {
        month,
        venitTVA: 0, venitGard: 0, venitAcoperis: 0,
        achizitieGard: 0, achizitieAcoperis: 0,
        comisionPercent: 0,
        salariu: 0, amortizareAuto: 0, combustibil: 0, revizii: 0,
        alteCheltuieliAuto: 0, abonamente: 0, diurne: 0,
        costAmbalarePropriu: 0, costCurierAmbalare: 0, costCurierTransport: 0, transportIntern: 0
      };
    });
    addEmployee(newEmp);
  };

  const handleExportCSV = () => {
    const headers = [
      "Angajat", "Tip", "Showroom",
      "Venit Gard", "Achiziție Gard", "Adaos Gard",
      "Venit Acoperiș", "Achiziție Acoperiș", "Adaos Acoperiș",
      "ADAOS CU TVA", "ADAOS FĂRĂ TVA", "Venit TVA", "Comision %", "Valoare Comision",
      "Salariu", "Amortizare Auto", "Combustibil", "Revizii", "Alte Chelt.", "Abonamente", "Diurne", "Total Cheltuieli",
      "Cost Showroom", "Cost Producție", "Cost Indirecte",
      "PROFIT FINAL"
    ];

    const rows = filteredEmployees.map(emp => {
      const m = calculateEmployeeMetrics(emp, selectedMonth, totals);
      return [
        emp.name, emp.type, emp.showroomId || '-',
        m.venitGard, m.achizitieGard, m.adaosTVAGard,
        m.venitAcoperis, m.achizitieAcoperis, m.adaosTVAAcoperis,
        m.adaosTotalCuTVA, m.adaosFaraTVA, m.venitTVA, m.comisionPercent, m.valoareComision,
        m.salariu, m.amortizareAuto, m.combustibil, m.revizii, m.alteCheltuieliAuto, m.abonamente, m.diurne, m.costuriProprii,
        m.costShowroom, m.costProductie, m.costIndirecte,
        m.profitFinal
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `raport_angajati_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Angajați - {selectedMonth}</h1>
          <p className="text-muted-foreground">Toți angajații: Agenți, Producție, Indirect/HQ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <MonthSelector />
        </div>
      </div>

      {/* Filters and Add buttons */}
      <div className="flex items-center gap-4">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as EmployeeType | 'ALL')}>
          <SelectTrigger className="w-48" data-testid="select-filter-type">
            <SelectValue placeholder="Filtrează după tip" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toți Angajații</SelectItem>
            <SelectItem value="AGENT">Doar Agenți</SelectItem>
            <SelectItem value="PRODUCTIE">Doar Producție</SelectItem>
            <SelectItem value="INDIRECT">Doar Indirect/HQ</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2 ml-auto">
          <Button onClick={() => handleAddEmployee('AGENT')} size="sm" variant="default" data-testid="button-add-agent">
            <Plus className="mr-1 h-4 w-4" /> Agent
          </Button>
          <Button onClick={() => handleAddEmployee('PRODUCTIE')} size="sm" variant="outline" data-testid="button-add-production">
            <Plus className="mr-1 h-4 w-4" /> Producție
          </Button>
          <Button onClick={() => handleAddEmployee('INDIRECT')} size="sm" variant="outline" data-testid="button-add-indirect">
            <Plus className="mr-1 h-4 w-4" /> Indirect
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Costuri Producție</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totals.totalProductionCosts.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Se distribuie celor cu Venit Gard</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Costuri Indirecte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totals.totalIndirectCosts.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Include 80% București</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Venit Total Firmă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalVenitFirma.toLocaleString('ro-RO')} RON</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Venit Garduri Firmă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalVenitGardFirma.toLocaleString('ro-RO')} RON</div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Date Financiare ({filteredEmployees.length} angajați)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="flex w-max space-x-4 p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px] sticky left-0 bg-background z-10">Angajat</TableHead>
                    <TableHead className="w-[100px]">Tip</TableHead>
                    <TableHead className="w-[130px]">Showroom</TableHead>
                    
                    {/* GARDURI */}
                    <TableHead className="min-w-[100px] bg-blue-50 dark:bg-blue-950 border-l-2 border-blue-500">Venit Gard</TableHead>
                    <TableHead className="min-w-[100px] bg-blue-50 dark:bg-blue-950">Achiz. Gard</TableHead>
                    <TableHead className="min-w-[100px] bg-blue-100 dark:bg-blue-900 font-bold">Adaos Gard</TableHead>
                    
                    {/* ACOPERISURI */}
                    <TableHead className="min-w-[100px] bg-amber-50 dark:bg-amber-950 border-l-2 border-amber-500">Venit Acop</TableHead>
                    <TableHead className="min-w-[100px] bg-amber-50 dark:bg-amber-950">Achiz. Acop</TableHead>
                    <TableHead className="min-w-[100px] bg-amber-100 dark:bg-amber-900 font-bold">Adaos Acop</TableHead>

                    {/* ADAOS CU TVA și FĂRĂ TVA */}
                    <TableHead className="min-w-[120px] bg-indigo-100 dark:bg-indigo-900 font-bold border-l-2 border-indigo-500">ADAOS CU TVA</TableHead>
                    <TableHead className="min-w-[130px] bg-purple-200 dark:bg-purple-800 font-bold">ADAOS FĂRĂ TVA</TableHead>
                    
                    <TableHead className="min-w-[100px]">Venit TVA</TableHead>
                    <TableHead className="min-w-[70px] bg-green-50 dark:bg-green-950">Com %</TableHead>
                    <TableHead className="min-w-[100px] bg-green-50 dark:bg-green-950">Val. Com.</TableHead>
                    
                    {/* Cheltuieli Proprii */}
                    <TableHead className="min-w-[90px] bg-red-50 dark:bg-red-950 border-l-2 border-red-500">Salariu</TableHead>
                    <TableHead className="min-w-[90px] bg-red-50 dark:bg-red-950">Amort. Auto</TableHead>
                    <TableHead className="min-w-[90px] bg-red-50 dark:bg-red-950">Combustibil</TableHead>
                    <TableHead className="min-w-[80px] bg-red-50 dark:bg-red-950">Revizii</TableHead>
                    <TableHead className="min-w-[80px] bg-red-50 dark:bg-red-950">Alte Ch.</TableHead>
                    <TableHead className="min-w-[80px] bg-red-50 dark:bg-red-950">Abon.</TableHead>
                    <TableHead className="min-w-[80px] bg-red-50 dark:bg-red-950">Diurne</TableHead>
                    <TableHead className="min-w-[100px] bg-red-100 dark:bg-red-900 font-bold">Total Ch.</TableHead>
                    
                    {/* Costuri Distribuite - doar pentru AGENT */}
                    <TableHead className="min-w-[100px] bg-gray-100 dark:bg-gray-800 border-l-2">Cost Show.</TableHead>
                    <TableHead className="min-w-[100px] bg-gray-100 dark:bg-gray-800">Cost Prod.</TableHead>
                    <TableHead className="min-w-[100px] bg-gray-100 dark:bg-gray-800">Cost Indir.</TableHead>
                    
                    {/* Profit Final */}
                    <TableHead className="min-w-[120px] bg-emerald-200 dark:bg-emerald-800 font-bold text-lg border-l-4 border-emerald-500">PROFIT</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const metrics = calculateEmployeeMetrics(emp, selectedMonth, totals);
                    const isAgent = emp.type === 'AGENT';
                    
                    return (
                      <TableRow key={emp.id} className={!isAgent ? 'bg-muted/30' : ''} data-testid={`row-employee-${emp.id}`}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                          <Input 
                            value={emp.name} 
                            onChange={(e) => updateEmployee(emp.id, { name: e.target.value })}
                            className="h-8 w-full"
                            data-testid={`input-name-${emp.id}`}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={TYPE_COLORS[emp.type]}>{TYPE_LABELS[emp.type]}</Badge>
                        </TableCell>
                        
                        <TableCell>
                          {isAgent ? (
                            <Select 
                              value={emp.showroomId || ''} 
                              onValueChange={(v) => updateEmployee(emp.id, { showroomId: v })}
                            >
                              <SelectTrigger className="h-8 w-28" data-testid={`select-showroom-${emp.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {showrooms.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name.replace('Showroom ', '')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        
                        {/* GARDURI - doar pentru AGENT */}
                        <TableCell>
                          {isAgent ? (
                            <Input type="number" className="w-24 h-8" value={metrics.venitGard} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { venitGard: Number(e.target.value) })} 
                              data-testid={`input-venit-gard-${emp.id}`}
                            />
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {isAgent ? (
                            <Input type="number" className="w-24 h-8" value={metrics.achizitieGard} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { achizitieGard: Number(e.target.value) })} 
                              data-testid={`input-achizitie-gard-${emp.id}`}
                            />
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-bold">{isAgent ? metrics.adaosTVAGard.toFixed(0) : '-'}</TableCell>
                        
                        {/* ACOPERISURI */}
                        <TableCell>
                          {isAgent ? (
                            <Input type="number" className="w-24 h-8" value={metrics.venitAcoperis} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { venitAcoperis: Number(e.target.value) })} 
                              data-testid={`input-venit-acoperis-${emp.id}`}
                            />
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {isAgent ? (
                            <Input type="number" className="w-24 h-8" value={metrics.achizitieAcoperis} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { achizitieAcoperis: Number(e.target.value) })} 
                              data-testid={`input-achizitie-acoperis-${emp.id}`}
                            />
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-bold">{isAgent ? metrics.adaosTVAAcoperis.toFixed(0) : '-'}</TableCell>

                        {/* ADAOS CU TVA și FĂRĂ TVA */}
                        <TableCell className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950">{isAgent ? metrics.adaosTotalCuTVA.toFixed(0) : '-'}</TableCell>
                        <TableCell className="font-bold text-purple-600 bg-purple-100 dark:bg-purple-900">{isAgent ? metrics.adaosFaraTVA.toFixed(0) : '-'}</TableCell>

                        <TableCell>
                          {isAgent ? (
                            <Input type="number" className="w-24 h-8" value={metrics.venitTVA} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { venitTVA: Number(e.target.value) })} 
                              data-testid={`input-venit-tva-${emp.id}`}
                            />
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        
                        {/* Comision */}
                        <TableCell>
                          {isAgent ? (
                            <Input type="number" className="w-16 h-8" value={metrics.comisionPercent} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { comisionPercent: Number(e.target.value) })} 
                              data-testid={`input-comision-${emp.id}`}
                            />
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">{isAgent ? metrics.valoareComision.toFixed(0) : '-'}</TableCell>
                        
                        {/* Cheltuieli Proprii - TOȚI angajații au */}
                        <TableCell><Input type="number" className="w-20 h-8" value={metrics.salariu} onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { salariu: Number(e.target.value) })} data-testid={`input-salariu-${emp.id}`} /></TableCell>
                        <TableCell><Input type="number" className="w-20 h-8" value={metrics.amortizareAuto} onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { amortizareAuto: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-20 h-8" value={metrics.combustibil} onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { combustibil: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-20 h-8" value={metrics.revizii} onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { revizii: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-20 h-8" value={metrics.alteCheltuieliAuto} onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { alteCheltuieliAuto: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-20 h-8" value={metrics.abonamente} onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { abonamente: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input type="number" className="w-20 h-8" value={metrics.diurne} onChange={(e) => updateEmployeeData(emp.id, selectedMonth, { diurne: Number(e.target.value) })} /></TableCell>
                        <TableCell className="font-bold text-red-600">{metrics.costuriProprii.toFixed(0)}</TableCell>
                        
                        {/* Distributed Costs (Read Only) - doar pentru AGENT */}
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{isAgent ? metrics.costShowroom.toFixed(0) : '-'}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{isAgent ? metrics.costProductie.toFixed(0) : '-'}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{isAgent ? metrics.costIndirecte.toFixed(0) : '-'}</TableCell>
                        
                        <TableCell className={`font-bold text-lg border-l-4 ${isAgent ? (metrics.profitFinal >= 0 ? "text-emerald-600 border-emerald-500" : "text-red-600 border-red-500") : 'text-muted-foreground border-gray-300'}`}>
                          {isAgent ? metrics.profitFinal.toFixed(0) : '-'}
                        </TableCell>
                        
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeEmployee(emp.id)} data-testid={`button-delete-${emp.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
