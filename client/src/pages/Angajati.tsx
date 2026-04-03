import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Download, Plus, Trash2, RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
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

/** Profit operațional, comision RON, profit brut: afișate doar pentru acești agenți (restul: „—”). */
const AGENT_OPERATIVE_METRICS_VISIBLE_NAMES = new Set(
  [
    "dragos frangache",
    "oana frangache",
    "marian costache",
    "alexandru croitoru",
    "marian toma",
    "razvan rosu",
    "mihai wagner",
  ].map((n) =>
    n
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim(),
  ),
);

function isAgentOperativeMetricsVisible(fullName: string): boolean {
  const key = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return AGENT_OPERATIVE_METRICS_VISIBLE_NAMES.has(key);
}

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
  // Mapăm metricile după numele complet al agentului (ca să corespundă cu employees)
  const metricsMap = new Map(
    (financialReport?.agentsMetrics || []).map((m: any) => [
      `${(m.name || "").toLowerCase()}`,
      m,
    ]),
  );
  const agentOptions = dbEmployees.filter(e => e.type === 'AGENT');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('ALL');
  const [productCategoryFilter, setProductCategoryFilter] = useState<'ALL' | 'GARD' | 'ACOPERIS'>('ALL');
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
        const nameKey = `${agent.firstName} ${agent.lastName}`.toLowerCase();
        const base = (metricsMap.get(nameKey) || {
          venitGard: 0,
          venitAcoperis: 0,
          achizitieGard: 0,
          achizitieAcoperis: 0,
          venitTotal: 0,
          achizitieTotal: 0,
          adaosTVA: 0,
          cheltuieliAgent: 0,
          cheltuieliShowroom: 0,
          cheltuieliIndirecte: 0,
          profitOperational: 0,
          comisionPercent: 0,
          comisionValoare: 0,
          profitBrut: 0,
        }) as any;

        let venitTotal = base.venitTotal || 0;
        let achizitieTotal = base.achizitieTotal || 0;

        if (productCategoryFilter === 'GARD') {
          venitTotal = base.venitGard || 0;
          achizitieTotal = base.achizitieGard || 0;
        } else if (productCategoryFilter === 'ACOPERIS') {
          venitTotal = base.venitAcoperis || 0;
          achizitieTotal = base.achizitieAcoperis || 0;
        }

        const adaosTVA = venitTotal - achizitieTotal;
        const cheltuieliAgent = base.cheltuieliAgent || 0;
        const cheltuieliShowroom = base.cheltuieliShowroom || 0;
        const cheltuieliIndirecte = base.cheltuieliIndirecte || 0;

        const profitOperational = adaosTVA - (cheltuieliAgent + cheltuieliShowroom + cheltuieliIndirecte);
        const comisionPercent = base.comisionPercent || 0;
        // Comision RON se calculează din valoarea absolută a profitului operațional,
        // astfel încât să fie întotdeauna un cost pozitiv care se scade.
        const comisionValoare = Math.abs(profitOperational) * (comisionPercent / 100);
        const profitBrut = profitOperational - comisionValoare;

        return {
          id: agent.id,
          agentUserId: (base as any)?.id ?? null,
          name: `${agent.firstName} ${agent.lastName}`,
          type: 'AGENT' as EmployeeType,
          showroomId: agent.showroomId || null,
          aggregatedMetrics: {
            venitTotal,
            achizitieTotal,
            adaosTVA,
            cheltuieliAgent,
            cheltuieliShowroom,
            cheltuieliIndirecte,
            profitOperational,
            comisionPercent,
            comisionValoare,
            profitBrut,
            contributionType: 'AGENT' as EmployeeType,
          },
        };
      });
  }, [dbEmployees, metricsMap, productCategoryFilter]);

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
          venitTotal: 0,
          achizitieTotal: 0,
          adaosTVA: 0,
          cheltuieliAgent: 0,
          cheltuieliShowroom: 0,
          cheltuieliIndirecte: 0,
          profitOperational: 0,
          comisionPercent: 0,
          comisionValoare: 0,
          profitBrut: 0,
          contributionType: emp.type,
        },
      }));
  }, [dbEmployees]);

  // Combined filtered list based on filter type
  const filteredEmployees = useMemo(() => {
    let all = [...agentsWithMetrics, ...otherEmployeesForDisplay];
    if (filterType !== 'ALL') {
      all = all.filter(e => e.type === filterType);
    }
    if (selectedAgentId !== 'ALL') {
      all = all.filter(e => e.id === selectedAgentId);
    }
    return all;
  }, [agentsWithMetrics, otherEmployeesForDisplay, filterType, selectedAgentId]);

  // Summary totals (respectă filtrele curente și filtrul de produs)
  const agentsForSummary = filteredEmployees.filter(e => e.type === 'AGENT');
  const summaryTotals = useMemo(() => {
    let totalVanzari = 0;
    let totalAdaos = 0;
    let totalCheltuieli = 0;
    let totalProfitBrut = 0;

    agentsForSummary.forEach(emp => {
      const m = emp.aggregatedMetrics as any;
      totalVanzari += m.venitTotal || 0;
      totalAdaos += m.adaosTVA || 0;
      totalCheltuieli += (m.cheltuieliAgent || 0) + (m.cheltuieliShowroom || 0) + (m.cheltuieliIndirecte || 0);
      if (isAgentOperativeMetricsVisible(emp.name)) {
        totalProfitBrut += m.profitBrut || 0;
      }
    });

    return { totalVanzari, totalAdaos, totalCheltuieli, totalProfitBrut };
  }, [agentsForSummary]);

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
          <p className="text-slate-400">Toți angajații: Agenți, Producție, Indirect/HQ</p>
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
              <Calendar className="h-4 w-4 text-slate-400" />
              <Label className="text-sm font-medium">Perioada:</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-400">De la:</Label>
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
              <Label className="text-sm text-slate-400">Până la:</Label>
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
              <Label className="text-sm text-slate-400">An:</Label>
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
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as EmployeeType | 'ALL')}>
          <SelectTrigger className="w-full sm:w-48 min-h-[44px]" data-testid="select-filter-type">
            <SelectValue placeholder="Filtrează după tip" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toți Angajații</SelectItem>
            <SelectItem value="AGENT">Doar Agenți</SelectItem>
            <SelectItem value="PRODUCTIE">Doar Producție</SelectItem>
            <SelectItem value="INDIRECT">Doar Indirect/HQ</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedAgentId} onValueChange={(v) => setSelectedAgentId(v)}>
          <SelectTrigger className="w-full sm:w-56 min-h-[44px]" data-testid="select-filter-agent">
            <SelectValue placeholder="Filtru Angajat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toți agenții</SelectItem>
            {agentOptions.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={productCategoryFilter}
          onValueChange={(v) => setProductCategoryFilter(v as any)}
        >
          <SelectTrigger className="w-full sm:w-48 min-h-[44px]" data-testid="select-filter-product">
            <SelectValue placeholder="Categorie produs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toate produsele</SelectItem>
            <SelectItem value="GARD">Garduri</SelectItem>
            <SelectItem value="ACOPERIS">Acoperișuri</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button onClick={() => handleAddEmployee('AGENT')} size="sm" variant="default" className="min-h-[44px]" data-testid="button-add-agent">
            <Plus className="mr-1 h-4 w-4" /> Agent
          </Button>
          <Button onClick={() => handleAddEmployee('PRODUCTIE')} size="sm" variant="outline" className="min-h-[44px]" data-testid="button-add-production">
            <Plus className="mr-1 h-4 w-4" /> Producție
          </Button>
          <Button onClick={() => handleAddEmployee('INDIRECT')} size="sm" variant="outline" className="min-h-[44px]" data-testid="button-add-indirect">
            <Plus className="mr-1 h-4 w-4" /> Indirect
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vânzări Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {summaryTotals.totalVanzari.toLocaleString('ro-RO')} RON
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Adaos Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {summaryTotals.totalAdaos.toLocaleString('ro-RO')} RON
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cheltuieli Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {summaryTotals.totalCheltuieli.toLocaleString('ro-RO')} RON
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit Brut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryTotals.totalProfitBrut.toLocaleString('ro-RO')} RON
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Date Financiare ({filteredEmployees.length} angajați)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border border-slate-800 bg-slate-950/60">
            <div className="flex w-max space-x-4 p-4">
              <Table className="border border-slate-800 text-slate-100">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px] sticky left-0 z-10 !bg-slate-800 !text-white">Angajat</TableHead>
                    <TableHead className="w-[100px] !bg-slate-800 !text-white">Tip</TableHead>
                    <TableHead className="w-[130px] !bg-slate-800 !text-white">Showroom</TableHead>

                    <TableHead className="min-w-[120px] !bg-blue-900 !text-white border-l-2 border-blue-500">
                      Venit total
                    </TableHead>
                    <TableHead className="min-w-[120px] !bg-blue-900 !text-white">
                      Achiz. totală
                    </TableHead>
                    <TableHead className="min-w-[120px] !bg-blue-800 !text-white font-bold">
                      Adaos TVA
                    </TableHead>

                    <TableHead className="min-w-[120px] !bg-red-900 !text-white border-l-2 border-red-500">
                      Cheltuieli agent
                    </TableHead>
                    <TableHead className="min-w-[140px] !bg-red-900 !text-white">
                      Cheltuieli showroom
                    </TableHead>
                    <TableHead className="min-w-[140px] !bg-red-900 !text-white">
                      Cheltuieli indirecte
                    </TableHead>

                    <TableHead className="min-w-[140px] !bg-emerald-900 !text-white border-l-2 border-emerald-500">
                      Profit operațional
                    </TableHead>
                    <TableHead className="min-w-[80px] !bg-green-900 !text-white">
                      Comision %
                    </TableHead>
                    <TableHead className="min-w-[120px] !bg-green-900 !text-white">
                      Comision RON
                    </TableHead>
                    <TableHead className="min-w-[120px] !bg-green-900 !text-white">
                      Profit brut
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const m = emp.aggregatedMetrics;
                    const isAgent = emp.type === 'AGENT';

                    return (
                      <TableRow
                        key={emp.id}
                        className={cn(
                          "border-b border-slate-800",
                          !isAgent ? "bg-slate-900/60" : "odd:bg-slate-900/40 even:bg-slate-950/40"
                        )}
                        data-testid={`row-employee-${emp.id}`}
                      >
                        <TableCell className="sticky left-0 bg-slate-950 z-10 font-medium border-r border-slate-800">
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

                        <TableCell className="font-semibold text-blue-400 text-right">
                          {isAgent ? m.venitTotal.toFixed(0) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAgent ? m.achizitieTotal.toFixed(0) : "-"}
                        </TableCell>
                        <TableCell className="font-bold text-right">
                          {isAgent ? m.adaosTVA.toFixed(0) : "-"}
                        </TableCell>

                        <TableCell className="text-right">
                          {isAgent ? m.cheltuieliAgent.toFixed(0) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAgent ? m.cheltuieliShowroom.toFixed(0) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAgent ? m.cheltuieliIndirecte.toFixed(0) : "-"}
                        </TableCell>

                        <TableCell className={`font-bold text-right ${
                          isAgent && isAgentOperativeMetricsVisible(emp.name)
                            ? m.profitOperational >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                            : ""
                        }`}>
                          {isAgent
                            ? isAgentOperativeMetricsVisible(emp.name)
                              ? m.profitOperational.toFixed(0)
                              : "—"
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAgent ? `${m.comisionPercent.toFixed(2)}%` : "-"}
                        </TableCell>
                        <TableCell className={`font-bold text-right ${
                          isAgent && isAgentOperativeMetricsVisible(emp.name)
                            ? m.profitOperational >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                            : ""
                        }`}>
                          {isAgent
                            ? isAgentOperativeMetricsVisible(emp.name)
                              ? m.comisionValoare.toFixed(0)
                              : "—"
                            : "-"}
                        </TableCell>
                        <TableCell className={`font-bold text-lg border-l-4 ${
                          isAgent && isAgentOperativeMetricsVisible(emp.name)
                            ? m.profitBrut >= 0
                              ? "text-emerald-600 border-emerald-500"
                              : "text-red-600 border-red-500"
                            : "text-slate-400 border-gray-300"
                        }`}>
                          {isAgent
                            ? isAgentOperativeMetricsVisible(emp.name)
                              ? m.profitBrut.toFixed(0)
                              : "—"
                            : "-"}
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
