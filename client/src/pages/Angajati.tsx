import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { Download, Plus, Trash2, RefreshCw, Calendar } from "lucide-react";
import { Employee, EmployeeType, MONTHS, Month } from "@/lib/types";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAllAgentsExpenseCosts, useShowroomCostsDistributed, useAgentsExpenseCostsRange, useShowroomCostsDistributedRange } from "@/hooks/useAgentExpenseCosts";
import { useAgentSalesProfitabilityForMonth, useAgentSalesProfitabilityRange, getMonthNumber } from "@/hooks/useAgentSalesProfitability";
import { useAgentManualAchizitiiForMonth, useAgentManualAchizitiiRange } from "@/hooks/useManualAchizitii";

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
  const { employees: zustandEmployees = [], showrooms = [], addEmployee, removeEmployee, updateEmployee, updateEmployeeData, selectedMonth } = useStore();
  
  // Fetch agents from database API - these have the correct IDs that match expense/sales data
  const { data: dbUsers = [] } = useQuery<DbUser[]>({
    queryKey: ["/api/users"],
  });
  const dbAgents = dbUsers.filter(u => u.role === "AGENT" && u.active);
  
  // Get PRODUCTIE and INDIRECT from Zustand store (for cost distribution)
  const productieEmployees = zustandEmployees.filter(e => e.type === 'PRODUCTIE');
  const indirectEmployees = zustandEmployees.filter(e => e.type === 'INDIRECT');
  
  const [filterType, setFilterType] = useState<EmployeeType | 'ALL'>('ALL');
  
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  
  // Date range state
  const [startMonth, setStartMonth] = useState(currentMonthNum);
  const [endMonth, setEndMonth] = useState(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const isRangeMode = startMonth !== endMonth;
  
  // Single month hooks (when startMonth === endMonth)
  const selectedMonthName = MONTHS[startMonth - 1] as Month;
  const { data: expenseCostsSingle = {}, isLoading: isLoadingExpensesSingle, refetch: refetchExpensesSingle } = useAllAgentsExpenseCosts(selectedMonthName, selectedYear);
  const { data: salesProfitabilitySingle = {}, isLoading: isLoadingSalesSingle, refetch: refetchSalesSingle } = useAgentSalesProfitabilityForMonth(selectedMonthName, selectedYear);
  const { data: showroomCostsDistributedSingle = {}, isLoading: isLoadingShowroomCostsSingle, refetch: refetchShowroomCostsSingle } = useShowroomCostsDistributed(selectedMonthName, selectedYear);
  
  // Range hooks (when startMonth !== endMonth)
  const { data: expenseCostsRange = {}, isLoading: isLoadingExpensesRange, refetch: refetchExpensesRange } = useAgentsExpenseCostsRange(startMonth, endMonth, selectedYear);
  const { data: salesProfitabilityRange = {}, isLoading: isLoadingSalesRange, refetch: refetchSalesRange } = useAgentSalesProfitabilityRange(startMonth, endMonth, selectedYear);
  const { data: showroomCostsDistributedRange = {}, isLoading: isLoadingShowroomCostsRange, refetch: refetchShowroomCostsRange } = useShowroomCostsDistributedRange(startMonth, endMonth, selectedYear);
  
  // Manual acquisitions hooks
  const { data: manualAchizitiiSingle = {}, refetch: refetchManualAchizitiiSingle } = useAgentManualAchizitiiForMonth(selectedMonthName, selectedYear);
  const { data: manualAchizitiiRange = {}, refetch: refetchManualAchizitiiRange } = useAgentManualAchizitiiRange(startMonth, endMonth, selectedYear);
  
  // Use the appropriate data based on mode
  const expenseCosts = isRangeMode ? expenseCostsRange : expenseCostsSingle;
  const salesProfitability = isRangeMode ? salesProfitabilityRange : salesProfitabilitySingle;
  const showroomCostsDistributed = isRangeMode ? showroomCostsDistributedRange : showroomCostsDistributedSingle;
  const manualAchizitii = isRangeMode ? manualAchizitiiRange : manualAchizitiiSingle;
  const isLoadingExpenses = isRangeMode ? isLoadingExpensesRange : isLoadingExpensesSingle;
  const isLoadingSales = isRangeMode ? isLoadingSalesRange : isLoadingSalesSingle;
  const isLoadingShowroomCosts = isRangeMode ? isLoadingShowroomCostsRange : isLoadingShowroomCostsSingle;
  const refetchExpenses = isRangeMode ? refetchExpensesRange : refetchExpensesSingle;
  const refetchSales = isRangeMode ? refetchSalesRange : refetchSalesSingle;
  const refetchShowroomCosts = isRangeMode ? refetchShowroomCostsRange : refetchShowroomCostsSingle;
  const refetchManualAchizitii = isRangeMode ? refetchManualAchizitiiRange : refetchManualAchizitiiSingle;
  
  // Number of months in selected range
  const monthsCount = Math.max(1, endMonth - startMonth + 1);
  
  // Helper: Calculate fixed costs × number of months from Zustand employee
  const getFixedTotals = (fixedCosts: Employee['fixedCosts'], months: number) => ({
    salariu: (fixedCosts?.salariuLunar ?? 0) * months,
    amortizareAuto: (fixedCosts?.amortizareAutoLunar ?? 0) * months,
    combustibil: (fixedCosts?.combustibilLunar ?? 0) * months,
    revizii: (fixedCosts?.reviziiLunar ?? 0) * months,
    alteCheltuieliAuto: (fixedCosts?.alteCheltuieliAutoLunar ?? 0) * months,
    abonamente: (fixedCosts?.abonamenteLunar ?? 0) * months,
    diurne: (fixedCosts?.diurneLunar ?? 0) * months,
    alteCheltuieli: (fixedCosts?.alteCheltuieliLunar ?? 0) * months,
  });
  
  // Calculate total production and indirect costs from Zustand employees
  const totalProductionCosts = useMemo(() => {
    return productieEmployees.reduce((sum, emp) => {
      const fixed = getFixedTotals(emp.fixedCosts, monthsCount);
      return sum + fixed.salariu + fixed.amortizareAuto + fixed.combustibil + fixed.revizii + 
             fixed.alteCheltuieliAuto + fixed.abonamente + fixed.diurne + fixed.alteCheltuieli;
    }, 0);
  }, [productieEmployees, monthsCount]);
  
  const totalIndirectCosts = useMemo(() => {
    return indirectEmployees.reduce((sum, emp) => {
      const fixed = getFixedTotals(emp.fixedCosts, monthsCount);
      return sum + fixed.salariu + fixed.amortizareAuto + fixed.combustibil + fixed.revizii + 
             fixed.alteCheltuieliAuto + fixed.abonamente + fixed.diurne + fixed.alteCheltuieli;
    }, 0);
  }, [indirectEmployees, monthsCount]);
  
  // Create agent data using API agents (with correct IDs)
  const agentsWithMetrics = useMemo(() => {
    return dbAgents.map(agent => {
      const expenseData = expenseCosts[agent.id];
      const salesData = salesProfitability[agent.id];
      const manualAchData = manualAchizitii[agent.id];
      const showroomCost = showroomCostsDistributed[agent.id]?.costuriShowroomDistribuite ?? 0;
      
      // Find matching Zustand employee by name to get the fixed salariu from Settings > Cheltuieli Fixe Lunare
      const agentName = `${agent.firstName} ${agent.lastName}`;
      const zustandEmployee = zustandEmployees.find(e => e.name === agentName);
      const zustandFixedCosts = zustandEmployee?.fixedCosts;
      
      // Get salariu from Zustand fixed costs (Settings > Cheltuieli Fixe Lunare) × number of months
      const salariu = (zustandFixedCosts?.salariuLunar ?? 0) * monthsCount;
      
      // Other costs from expense data or 0
      const amortizareAuto = expenseData?.amortizareAuto ?? 0;
      const combustibil = expenseData?.combustibil ?? 0;
      const revizii = expenseData?.revizii ?? 0;
      const alteCheltuieliAuto = expenseData?.alteCheltuieliAuto ?? 0;
      const abonamente = expenseData?.abonamente ?? 0;
      const diurne = expenseData?.diurne ?? 0;
      const alteCheltuieli = expenseData?.alteCheltuieli ?? 0;
      
      // Calculate aggregated metrics from API sales data + manual acquisitions
      const venitGard = salesData ? parseFloat(salesData.venitGard) : 0;
      const achizitieGardFromSales = salesData ? parseFloat(salesData.achizitieGard) : 0;
      const achizitieGardManual = manualAchData ? parseFloat(manualAchData.achizitieGard || "0") : 0;
      const achizitieGard = achizitieGardFromSales + achizitieGardManual;
      
      const venitAcoperis = salesData ? parseFloat(salesData.venitAcoperis) : 0;
      const achizitieAcoperisFromSales = salesData ? parseFloat(salesData.achizitieAcoperis) : 0;
      const achizitieAcoperisManual = manualAchData ? parseFloat(manualAchData.achizitieAcoperis || "0") : 0;
      const achizitieAcoperis = achizitieAcoperisFromSales + achizitieAcoperisManual;
      const venitTVA = salesData ? parseFloat(salesData.venitTvaTotal || "0") : 0;
      const comisionPercent = salesData ? parseFloat(salesData.comisionPercentMediu || "0") : 0;
      const comisionGard = salesData ? parseFloat(salesData.comisionGard || "0") : 0;
      const comisionAcoperis = salesData ? parseFloat(salesData.comisionAcoperis || "0") : 0;
      const valoareComision = comisionGard + comisionAcoperis;
      
      // Calculate derived metrics
      const adaosTVAGard = venitGard - achizitieGard;
      const adaosTVAAcoperis = venitAcoperis - achizitieAcoperis;
      const adaosTotalCuTVA = adaosTVAGard + adaosTVAAcoperis;
      const tvaTotal = adaosTotalCuTVA * 0.21;
      const adaosFaraTVA = adaosTotalCuTVA - tvaTotal;
      
      const costuriProprii = salariu + amortizareAuto + combustibil + revizii + alteCheltuieliAuto + abonamente + diurne + alteCheltuieli;
      
      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        type: 'AGENT' as EmployeeType,
        showroomId: agent.sediuId || null,
        aggregatedMetrics: {
          venitGard,
          achizitieGard,
          adaosTVAGard,
          venitAcoperis,
          achizitieAcoperis,
          adaosTVAAcoperis,
          adaosTotalCuTVA,
          adaosFaraTVA,
          venitTVA,
          comisionPercent,
          valoareComision,
          salariu,
          amortizareAuto,
          combustibil,
          revizii,
          alteCheltuieliAuto,
          abonamente,
          diurne,
          alteCheltuieli,
          costuriProprii,
          costShowroom: showroomCost,
          costProductie: 0,
          costIndirecte: 0,
          profitFinal: 0,
          contributionType: 'AGENT' as EmployeeType
        }
      };
    });
  }, [dbAgents, expenseCosts, salesProfitability, showroomCostsDistributed, manualAchizitii, zustandEmployees, monthsCount]);
  
  // Calculate totals and distribute production/indirect costs to agents
  const { totals, agentsWithDistributedCosts } = useMemo(() => {
    // Calculate totals from agents
    const totalVenitGard = agentsWithMetrics.reduce((sum, a) => sum + a.aggregatedMetrics.venitGard, 0);
    const totalVenitAcoperis = agentsWithMetrics.reduce((sum, a) => sum + a.aggregatedMetrics.venitAcoperis, 0);
    const totalVenitFirma = totalVenitGard + totalVenitAcoperis;
    
    // Distribute costs proportionally to agents
    const agentsWithDistributedCosts = agentsWithMetrics.map(agent => {
      const m = agent.aggregatedMetrics;
      
      // Production cost distribution (based on Gard revenue percentage)
      const gardRevenuePercent = totalVenitGard > 0 ? m.venitGard / totalVenitGard : 0;
      const costProductie = totalProductionCosts * gardRevenuePercent;
      
      // Indirect cost distribution (based on total revenue percentage)
      const totalRevenuePercent = totalVenitFirma > 0 ? (m.venitGard + m.venitAcoperis) / totalVenitFirma : 0;
      const costIndirecte = totalIndirectCosts * totalRevenuePercent;
      
      // Recalculate profit with distributed costs
      const profitFinal = m.adaosFaraTVA - m.valoareComision - m.costuriProprii - m.costShowroom - costProductie - costIndirecte;
      
      return {
        ...agent,
        aggregatedMetrics: {
          ...m,
          costProductie,
          costIndirecte,
          profitFinal
        }
      };
    });
    
    return {
      totals: {
        totalVenitFirma,
        totalVenitGardFirma: totalVenitGard,
        totalProductionCosts,
        totalIndirectCosts
      },
      agentsWithDistributedCosts
    };
  }, [agentsWithMetrics, totalProductionCosts, totalIndirectCosts]);
  
  // Filter agents based on type selection (now only agents from API)
  const filteredAgents = filterType === 'ALL' || filterType === 'AGENT'
    ? agentsWithDistributedCosts 
    : [];
  
  // Combine production and indirect employees from Zustand for display if needed
  const productieForDisplay = productieEmployees.map(emp => ({
    id: emp.id,
    name: emp.name,
    type: emp.type,
    showroomId: emp.showroomId,
    aggregatedMetrics: {
      venitGard: 0, achizitieGard: 0, adaosTVAGard: 0,
      venitAcoperis: 0, achizitieAcoperis: 0, adaosTVAAcoperis: 0,
      adaosTotalCuTVA: 0, adaosFaraTVA: 0, venitTVA: 0,
      comisionPercent: 0, valoareComision: 0,
      ...getFixedTotals(emp.fixedCosts, monthsCount),
      costuriProprii: getFixedTotals(emp.fixedCosts, monthsCount).salariu + 
                      getFixedTotals(emp.fixedCosts, monthsCount).amortizareAuto +
                      getFixedTotals(emp.fixedCosts, monthsCount).combustibil +
                      getFixedTotals(emp.fixedCosts, monthsCount).revizii +
                      getFixedTotals(emp.fixedCosts, monthsCount).alteCheltuieliAuto +
                      getFixedTotals(emp.fixedCosts, monthsCount).abonamente +
                      getFixedTotals(emp.fixedCosts, monthsCount).diurne +
                      getFixedTotals(emp.fixedCosts, monthsCount).alteCheltuieli,
      costShowroom: 0, costProductie: 0, costIndirecte: 0, profitFinal: 0,
      contributionType: 'PRODUCTIE' as EmployeeType
    }
  }));
  
  const indirectForDisplay = indirectEmployees.map(emp => ({
    id: emp.id,
    name: emp.name,
    type: emp.type,
    showroomId: emp.showroomId,
    aggregatedMetrics: {
      venitGard: 0, achizitieGard: 0, adaosTVAGard: 0,
      venitAcoperis: 0, achizitieAcoperis: 0, adaosTVAAcoperis: 0,
      adaosTotalCuTVA: 0, adaosFaraTVA: 0, venitTVA: 0,
      comisionPercent: 0, valoareComision: 0,
      ...getFixedTotals(emp.fixedCosts, monthsCount),
      costuriProprii: getFixedTotals(emp.fixedCosts, monthsCount).salariu + 
                      getFixedTotals(emp.fixedCosts, monthsCount).amortizareAuto +
                      getFixedTotals(emp.fixedCosts, monthsCount).combustibil +
                      getFixedTotals(emp.fixedCosts, monthsCount).revizii +
                      getFixedTotals(emp.fixedCosts, monthsCount).alteCheltuieliAuto +
                      getFixedTotals(emp.fixedCosts, monthsCount).abonamente +
                      getFixedTotals(emp.fixedCosts, monthsCount).diurne +
                      getFixedTotals(emp.fixedCosts, monthsCount).alteCheltuieli,
      costShowroom: 0, costProductie: 0, costIndirecte: 0, profitFinal: 0,
      contributionType: 'INDIRECT' as EmployeeType
    }
  }));
  
  // Combined filtered list based on filter type
  const filteredEmployees = filterType === 'ALL' 
    ? [...filteredAgents, ...productieForDisplay, ...indirectForDisplay]
    : filterType === 'AGENT' 
      ? filteredAgents 
      : filterType === 'PRODUCTIE'
        ? productieForDisplay
        : indirectForDisplay;
  
  const handleRefreshData = () => {
    refetchExpenses();
    refetchSales();
    refetchShowroomCosts();
  };
  
  const isLoadingData = isLoadingExpenses || isLoadingSales || isLoadingShowroomCosts;

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
        alteCheltuieliAuto: 0, abonamente: 0, diurne: 0, alteCheltuieli: 0,
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
      const m = emp.aggregatedMetrics;
      return [
        emp.name, emp.type, emp.showroomId || '-',
        m.venitGard.toFixed(2), m.achizitieGard.toFixed(2), m.adaosTVAGard.toFixed(2),
        m.venitAcoperis.toFixed(2), m.achizitieAcoperis.toFixed(2), m.adaosTVAAcoperis.toFixed(2),
        m.adaosTotalCuTVA.toFixed(2), m.adaosFaraTVA.toFixed(2), m.venitTVA.toFixed(2), m.comisionPercent.toFixed(2), m.valoareComision.toFixed(2),
        m.salariu.toFixed(2), m.amortizareAuto.toFixed(2), m.combustibil.toFixed(2), m.revizii.toFixed(2), m.alteCheltuieliAuto.toFixed(2), m.abonamente.toFixed(2), m.diurne.toFixed(2), m.costuriProprii.toFixed(2),
        m.costShowroom.toFixed(2), m.costProductie.toFixed(2), m.costIndirecte.toFixed(2),
        m.profitFinal.toFixed(2)
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `raport_angajati_${isRangeMode ? `${startMonth}-${endMonth}` : selectedMonthName}_${selectedYear}.csv`);
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
                          {isAgent ? (
                            <span data-testid={`text-name-${emp.id}`}>{emp.name}</span>
                          ) : (
                            <Input 
                              value={emp.name} 
                              onChange={(e) => updateEmployee(emp.id, { name: e.target.value })}
                              className="h-8 w-full"
                              data-testid={`input-name-${emp.id}`}
                            />
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={TYPE_COLORS[emp.type]}>{TYPE_LABELS[emp.type]}</Badge>
                        </TableCell>
                        
                        <TableCell>
                          {isAgent ? (
                            <span className="text-sm" data-testid={`text-showroom-${emp.id}`}>
                              {showrooms.find(s => s.id === emp.showroomId)?.name?.replace('Showroom ', '') || '-'}
                            </span>
                          ) : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        
                        {/* GARDURI - doar pentru AGENT */}
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
                          {isAgent || isRangeMode ? (
                            <span>{m.salariu.toFixed(0)}</span>
                          ) : (
                            <Input type="number" className="w-20 h-8" value={m.salariu} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonthName, { salariu: Number(e.target.value) })} 
                              data-testid={`input-salariu-${emp.id}`} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isAgent || isRangeMode ? (
                            <span>{m.amortizareAuto.toFixed(0)}</span>
                          ) : (
                            <Input type="number" className="w-20 h-8" value={m.amortizareAuto} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonthName, { amortizareAuto: Number(e.target.value) })} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isAgent || isRangeMode ? (
                            <span>{m.combustibil.toFixed(0)}</span>
                          ) : (
                            <Input type="number" className="w-20 h-8" value={m.combustibil} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonthName, { combustibil: Number(e.target.value) })} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isAgent || isRangeMode ? (
                            <span>{m.revizii.toFixed(0)}</span>
                          ) : (
                            <Input type="number" className="w-20 h-8" value={m.revizii} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonthName, { revizii: Number(e.target.value) })} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isAgent || isRangeMode ? (
                            <span>{m.alteCheltuieliAuto.toFixed(0)}</span>
                          ) : (
                            <Input type="number" className="w-20 h-8" value={m.alteCheltuieliAuto} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonthName, { alteCheltuieliAuto: Number(e.target.value) })} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isAgent || isRangeMode ? (
                            <span>{m.abonamente.toFixed(0)}</span>
                          ) : (
                            <Input type="number" className="w-20 h-8" value={m.abonamente} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonthName, { abonamente: Number(e.target.value) })} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isAgent || isRangeMode ? (
                            <span>{m.diurne.toFixed(0)}</span>
                          ) : (
                            <Input type="number" className="w-20 h-8" value={m.diurne} 
                              onChange={(e) => updateEmployeeData(emp.id, selectedMonthName, { diurne: Number(e.target.value) })} 
                            />
                          )}
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
                          {!isAgent && (
                            <Button variant="ghost" size="icon" onClick={() => removeEmployee(emp.id)} data-testid={`button-delete-${emp.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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
