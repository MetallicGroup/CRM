import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Download, Plus, Trash2, RefreshCw, Calendar } from "lucide-react";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useFinancialReport } from "@/hooks/use-financials";
import { useStore, monthToNumber } from "@/lib/store";
import { Employee, EmployeeType, MONTHS, Month } from "@/lib/types";
import { useState, useMemo } from "react";

interface DbUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  sediuId?: string;
}

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

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ label: m, value: i + 1 }));

export default function Angajati() {
  // Use new API hooks
  const { data: dbEmployees = [], isLoading: loadingEmployees } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const [filterType, setFilterType] = useState<EmployeeType | 'ALL'>('ALL');

  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

  // Date range state
  const [startMonth, setStartMonth] = useState(currentMonthNum);
  const [endMonth, setEndMonth] = useState(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const isRangeMode = startMonth !== endMonth;

  // Unified financial report hook
  const { data: financialReport, isLoading: loadingReport, refetch: refetchReport } = useFinancialReport(
    startMonth,
    selectedYear,
    isRangeMode ? endMonth : undefined
  );

  const isLoadingData = loadingEmployees || loadingReport;
  const metricsMap = new Map(financialReport?.agentsMetrics?.map((m: any) => [m.id, m]));
  // FIX: Safely initialize totals with defaults to prevent crash
  const rawTotals = financialReport?.totals || {};
  const totals = {
    totalProductionCosts: rawTotals.totalProductionCosts ?? 0,
    totalIndirectCosts: rawTotals.totalIndirectCosts ?? 0,
    totalVenitFirma: rawTotals.totalVenitFirma ?? 0,
    totalVenitGardFirma: rawTotals.totalVenitGardFirma ?? 0
  };

  // No need for getFixedTotals as costs are server-side

  // Create agent data using report results
  const agentsWithMetrics = useMemo(() => {
    return dbEmployees
      .filter(e => e.type === 'AGENT')
      .map(agent => {
        const metrics = (metricsMap.get(agent.id) || {
          totalAdaos: 0,
          totalCostFixed: 0,
          profitNet: 0,
          venitGard: 0,
          achizitieGard: 0,
          adaosTVAGard: 0,
          venitAcoperis: 0,
          achizitieAcoperis: 0,
          adaosTVAAcoperis: 0,
          adaosFaraTVA: 0,
          venitTVA: 0,
          comisionPercent: 0,
          valoareComision: 0,
          salariu: 0,
          amortizareAuto: 0,
          combustibil: 0,
          revizii: 0,
          alteCheltuieliAuto: 0,
          abonamente: 0,
          diurne: 0,
          alteCheltuieli: 0,
          costShowroom: 0,
          costProductie: 0,
          costIndirecte: 0,
        }) as any;

        return {
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          type: 'AGENT' as EmployeeType,
          showroomId: agent.showroomId || null,
          aggregatedMetrics: {
            ...metrics,
            // Fallback for fields not yet in report if needed
            venitGard: metrics.venitGard,
            achizitieGard: metrics.achizitieGard,
            adaosTVAGard: metrics.adaosTVAGard,
            venitAcoperis: metrics.venitAcoperis,
            achizitieAcoperis: metrics.achizitieAcoperis,
            adaosTVAAcoperis: metrics.adaosTVAAcoperis,
            adaosTotalCuTVA: metrics.totalAdaos,
            adaosFaraTVA: metrics.totalAdaos * 0.79,
            venitTVA: metrics.totalAdaos,
            comisionPercent: metrics.comisionPercent,
            valoareComision: metrics.valoareComision,
            salariu: metrics.salariu,
            amortizareAuto: metrics.amortizareAuto,
            combustibil: metrics.combustibil,
            revizii: metrics.revizii,
            alteCheltuieliAuto: metrics.alteCheltuieliAuto,
            abonamente: metrics.abonamente,
            diurne: metrics.diurne,
            alteCheltuieli: metrics.alteCheltuieli,
            costuriProprii: metrics.totalCostFixed,
            costShowroom: metrics.costShowroom,
            costProductie: metrics.costProductie,
            costIndirecte: metrics.costIndirecte,
            profitFinal: metrics.profitNet,
            contributionType: 'AGENT' as EmployeeType
          }
        };
      });
  }, [dbEmployees, metricsMap]);

  // Combine production and indirect employees for display
  const otherEmployeesForDisplay = useMemo(() => {
    return dbEmployees
      .filter(e => e.type !== 'AGENT')
      .map(emp => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        type: emp.type,
        showroomId: emp.showroomId,
        aggregatedMetrics: {
          venitGard: 0, achizitieGard: 0, adaosTVAGard: 0,
          venitAcoperis: 0, achizitieAcoperis: 0, adaosTVAAcoperis: 0,
          adaosTotalCuTVA: 0, adaosFaraTVA: 0, venitTVA: 0,
          comisionPercent: 0, valoareComision: 0,
          salariu: 0, amortizareAuto: 0, combustibil: 0, revizii: 0,
          alteCheltuieliAuto: 0, abonamente: 0, diurne: 0, alteCheltuieli: 0,
          costuriProprii: 0,
          costShowroom: 0, costProductie: 0, costIndirecte: 0, profitFinal: 0,
          contributionType: emp.type
        }
      }));
  }, [dbEmployees]);

  // Combined filtered list based on filter type
  const filteredEmployees = useMemo(() => {
    const all = [...agentsWithMetrics, ...otherEmployeesForDisplay];
    if (filterType === 'ALL') return all;
    return all.filter(e => e.type === filterType);
  }, [agentsWithMetrics, otherEmployeesForDisplay, filterType]);

  const handleRefreshData = () => {
    refetchReport();
  };

  const handleAddEmployee = (type: EmployeeType) => {
    createMutation.mutate({
      firstName: 'Nou',
      lastName: 'Angajat',
      type,
      active: true
    });
  };

  const handleExportCSV = () => {
    const headers = [
      "Angajat", "Tip", "Showroom",
      "Venit Gard", "Achiziție Gard", "Adaos Gard",
      "Venit Acoperiș", "Achiziție Acoperiș", "Adaos Acoperiș",
      "ADAOS TOTAL TVA", "PROFIT NET"
    ];

    const rows = filteredEmployees.map(emp => {
      const m = emp.aggregatedMetrics;
      return [
        emp.name, emp.type, emp.showroomId || '-',
        m.venitGard.toFixed(2), m.achizitieGard.toFixed(2), m.adaosTVAGard.toFixed(2),
        m.venitAcoperis.toFixed(2), m.achizitieAcoperis.toFixed(2), m.adaosTVAAcoperis.toFixed(2),
        m.adaosTotalCuTVA.toFixed(2), m.profitFinal.toFixed(2)
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `raport_angajati_${isRangeMode ? `${startMonth}-${endMonth}` : MONTHS[startMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Angajați - {MONTHS[startMonth - 1]}</h1>
          <p className="text-muted-foreground">Toți angajații: Agenți, Producție, Indirect/HQ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={isLoadingData}
            data-testid="button-refresh-data"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            {isLoadingData ? 'Se încarcă...' : 'Actualizează Date'}
          </Button>
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Perioada:</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">De la:</Label>
              <Select
                value={startMonth.toString()}
                onValueChange={(v) => {
                  const val = parseInt(v);
                  setStartMonth(val);
                  if (val > endMonth) setEndMonth(val);
                }}
              >
                <SelectTrigger className="w-36" data-testid="select-start-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Până la:</Label>
              <Select
                value={endMonth.toString()}
                onValueChange={(v) => {
                  const val = parseInt(v);
                  setEndMonth(val);
                  if (val < startMonth) setStartMonth(val);
                }}
              >
                <SelectTrigger className="w-36" data-testid="select-end-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">An:</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isRangeMode && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Interval: {MONTHS[startMonth - 1]} - {MONTHS[endMonth - 1]} {selectedYear}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

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
                    const m = emp.aggregatedMetrics;
                    const isAgent = emp.type === 'AGENT';

                    return (
                      <TableRow key={emp.id} className={!isAgent ? 'bg-muted/30' : ''} data-testid={`row-employee-${emp.id}`}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                          <span data-testid={`text-name-${emp.id}`}>{emp.name}</span>
                        </TableCell>

                        <TableCell>
                          <Badge className={TYPE_COLORS[emp.type]}>{TYPE_LABELS[emp.type]}</Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm" data-testid={`text-showroom-${emp.id}`}>
                            {emp.showroomId || '-'}
                          </span>
                        </TableCell>

                        {/* GARDURI */}
                        <TableCell className="font-semibold text-blue-600">{isAgent ? m.venitGard.toFixed(0) : '-'}</TableCell>
                        <TableCell>{isAgent ? m.achizitieGard.toFixed(0) : '-'}</TableCell>
                        <TableCell className="font-bold">{isAgent ? m.adaosTVAGard.toFixed(0) : '-'}</TableCell>

                        {/* ACOPERISURI */}
                        <TableCell className="font-semibold text-amber-600">{isAgent ? m.venitAcoperis.toFixed(0) : '-'}</TableCell>
                        <TableCell>{isAgent ? m.achizitieAcoperis.toFixed(0) : '-'}</TableCell>
                        <TableCell className="font-bold">{isAgent ? m.adaosTVAAcoperis.toFixed(0) : '-'}</TableCell>

                        {/* ADAOS CU TVA și FĂRĂ TVA */}
                        <TableCell className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950">{isAgent ? m.adaosTotalCuTVA.toFixed(0) : '-'}</TableCell>
                        <TableCell className="font-bold text-purple-600 bg-purple-100 dark:bg-purple-900">{isAgent ? m.adaosFaraTVA.toFixed(0) : '-'}</TableCell>

                        <TableCell className="bg-blue-50 dark:bg-blue-950">
                          {isAgent ? (
                            <span className="font-semibold text-blue-600" data-testid={`text-venit-tva-${emp.id}`}>
                              {m.venitTVA.toFixed(0)}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>

                        {/* Comision */}
                        <TableCell className="bg-green-50 dark:bg-green-950">
                          {isAgent ? (
                            <span className="font-semibold text-green-600" data-testid={`text-comision-${emp.id}`}>
                              {m.comisionPercent.toFixed(2)}%
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">{isAgent ? m.valoareComision.toFixed(0) : '-'}</TableCell>

                        {/* Cheltuieli Proprii - read-only pentru AGENT (vin din Cheltuieli), editabile pentru PRODUCTIE/INDIRECT */}
                        <TableCell>
                          <span>{m.salariu.toFixed(0)}</span>
                        </TableCell>
                        <TableCell>
                          <span>{m.amortizareAuto.toFixed(0)}</span>
                        </TableCell>
                        <TableCell>
                          <span>{m.combustibil.toFixed(0)}</span>
                        </TableCell>
                        <TableCell>
                          <span>{m.revizii.toFixed(0)}</span>
                        </TableCell>
                        <TableCell>
                          <span>{m.alteCheltuieliAuto.toFixed(0)}</span>
                        </TableCell>
                        <TableCell>
                          <span>{m.abonamente.toFixed(0)}</span>
                        </TableCell>
                        <TableCell>
                          <span>{m.diurne.toFixed(0)}</span>
                        </TableCell>
                        <TableCell className="font-bold text-red-600">{m.costuriProprii.toFixed(0)}</TableCell>

                        {/* Distributed Costs (Read Only) - doar pentru AGENT */}
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{isAgent ? m.costShowroom.toFixed(0) : '-'}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{isAgent ? m.costProductie.toFixed(0) : '-'}</TableCell>
                        <TableCell className="bg-gray-50 dark:bg-gray-900">{isAgent ? m.costIndirecte.toFixed(0) : '-'}</TableCell>

                        <TableCell className={`font-bold text-lg border-l-4 ${isAgent ? (m.profitFinal >= 0 ? "text-emerald-600 border-emerald-500" : "text-red-600 border-red-500") : 'text-muted-foreground border-gray-300'}`}>
                          {isAgent ? m.profitFinal.toFixed(0) : '-'}
                        </TableCell>

                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(emp.id)} data-testid={`button-delete-${emp.id}`}>
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
