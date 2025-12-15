import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CalendarIcon, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subMonths } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MONTHS, Month } from "@/lib/types";
import type { DateRange } from "react-day-picker";
import { useAgentSalesProfitabilityRange } from "@/hooks/useAgentSalesProfitability";
import { useAgentsExpenseCostsRange } from "@/hooks/useAgentExpenseCosts";
import { useQuery } from "@tanstack/react-query";

type PeriodType = "luna" | "perioada" | "trimestru" | "an";

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ label: m, value: i + 1 }));

interface DbUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

export default function Dashboard() {
  const { showrooms = [] } = useStore();
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth() + 1;
  
  const [periodType, setPeriodType] = useState<PeriodType>("luna");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonthIndex);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(currentDate),
    to: endOfMonth(currentDate)
  });
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor((currentMonthIndex - 1) / 3) + 1);

  const effectiveDateRange = useMemo(() => {
    switch (periodType) {
      case "luna":
        const monthDate = new Date(selectedYear, selectedMonthIndex - 1, 1);
        return { from: startOfMonth(monthDate), to: endOfMonth(monthDate) };
      case "trimestru":
        const quarterStartMonth = (selectedQuarter - 1) * 3;
        const quarterDate = new Date(selectedYear, quarterStartMonth, 1);
        return { from: startOfQuarter(quarterDate), to: endOfQuarter(quarterDate) };
      case "an":
        const yearDate = new Date(selectedYear, 0, 1);
        return { from: startOfYear(yearDate), to: endOfYear(yearDate) };
      case "perioada":
      default:
        return dateRange || { from: startOfMonth(currentDate), to: endOfMonth(currentDate) };
    }
  }, [periodType, selectedMonthIndex, selectedYear, dateRange, selectedQuarter, currentDate]);

  const startMonth = effectiveDateRange.from ? effectiveDateRange.from.getMonth() + 1 : currentMonthIndex;
  const endMonth = effectiveDateRange.to ? effectiveDateRange.to.getMonth() + 1 : currentMonthIndex;

  const { data: dbUsers = [] } = useQuery<DbUser[]>({
    queryKey: ["/api/users"],
  });
  const dbAgents = dbUsers.filter(u => u.role === "AGENT" && u.active);

  const { data: salesData = {}, isLoading: isLoadingSales, refetch: refetchSales } = useAgentSalesProfitabilityRange(startMonth, endMonth, selectedYear);
  const { data: expenseData = {}, isLoading: isLoadingExpenses, refetch: refetchExpenses } = useAgentsExpenseCostsRange(startMonth, endMonth, selectedYear);

  const agentMetrics = useMemo(() => {
    return dbAgents.map(agent => {
      const sales = salesData[agent.id];
      const expenses = expenseData[agent.id];
      
      const venitGard = sales ? parseFloat(sales.venitGard) : 0;
      const venitAcoperis = sales ? parseFloat(sales.venitAcoperis) : 0;
      const achizitieGard = sales ? parseFloat(sales.achizitieGard) : 0;
      const achizitieAcoperis = sales ? parseFloat(sales.achizitieAcoperis) : 0;
      const comisionGard = sales ? parseFloat(sales.comisionGard) : 0;
      const comisionAcoperis = sales ? parseFloat(sales.comisionAcoperis) : 0;
      
      const adaosTVAGard = venitGard - achizitieGard;
      const adaosTVAAcoperis = venitAcoperis - achizitieAcoperis;
      const adaosTotalCuTVA = adaosTVAGard + adaosTVAAcoperis;
      const tvaTotal = adaosTotalCuTVA * 0.21;
      const adaosFaraTVA = adaosTotalCuTVA - tvaTotal;
      const valoareComision = comisionGard + comisionAcoperis;
      
      const salariu = expenses?.salariu ?? 0;
      const combustibil = expenses?.combustibil ?? 0;
      const revizii = expenses?.revizii ?? 0;
      const alteCheltuieliAuto = expenses?.alteCheltuieliAuto ?? 0;
      const amortizareAuto = expenses?.amortizareAuto ?? 0;
      const abonamente = expenses?.abonamente ?? 0;
      const diurne = expenses?.diurne ?? 0;
      const alteCheltuieli = expenses?.alteCheltuieli ?? 0;
      
      const costuriProprii = salariu + combustibil + revizii + alteCheltuieliAuto + amortizareAuto + abonamente + diurne + alteCheltuieli;
      const profitFinal = adaosFaraTVA - valoareComision - costuriProprii;
      
      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        metrics: {
          venitGard,
          venitAcoperis,
          achizitieGard,
          achizitieAcoperis,
          adaosTVAGard,
          adaosTVAAcoperis,
          adaosFaraTVA,
          valoareComision,
          costuriProprii,
          profitFinal
        }
      };
    });
  }, [dbAgents, salesData, expenseData]);

  // Calculate totals directly from ALL agents in salesData (not just dbAgents)
  const allAgentTotals = useMemo(() => {
    let totalVenitGard = 0;
    let totalVenitAcoperis = 0;
    let totalAdaosFaraTVA = 0;
    let totalCosturi = 0;
    let totalProfit = 0;
    
    // Get all unique agent IDs from both sales and expenses
    const allAgentIds = Array.from(new Set([
      ...Object.keys(salesData),
      ...Object.keys(expenseData)
    ]));
    
    for (const agentId of allAgentIds) {
      const sales = salesData[agentId];
      const expenses = expenseData[agentId];
      
      const venitGard = sales ? parseFloat(sales.venitGard) : 0;
      const venitAcoperis = sales ? parseFloat(sales.venitAcoperis) : 0;
      const achizitieGard = sales ? parseFloat(sales.achizitieGard) : 0;
      const achizitieAcoperis = sales ? parseFloat(sales.achizitieAcoperis) : 0;
      const comisionGard = sales ? parseFloat(sales.comisionGard) : 0;
      const comisionAcoperis = sales ? parseFloat(sales.comisionAcoperis) : 0;
      
      totalVenitGard += venitGard;
      totalVenitAcoperis += venitAcoperis;
      
      const adaosTVAGard = venitGard - achizitieGard;
      const adaosTVAAcoperis = venitAcoperis - achizitieAcoperis;
      const adaosTotalCuTVA = adaosTVAGard + adaosTVAAcoperis;
      const adaosFaraTVA = adaosTotalCuTVA * 0.79; // 21% TVA
      totalAdaosFaraTVA += adaosFaraTVA;
      
      const valoareComision = comisionGard + comisionAcoperis;
      
      const salariu = expenses?.salariu ?? 0;
      const combustibil = expenses?.combustibil ?? 0;
      const revizii = expenses?.revizii ?? 0;
      const alteCheltuieliAuto = expenses?.alteCheltuieliAuto ?? 0;
      const amortizareAuto = expenses?.amortizareAuto ?? 0;
      const abonamente = expenses?.abonamente ?? 0;
      const diurne = expenses?.diurne ?? 0;
      const alteCheltuieli = expenses?.alteCheltuieli ?? 0;
      
      const costuriProprii = salariu + combustibil + revizii + alteCheltuieliAuto + amortizareAuto + abonamente + diurne + alteCheltuieli;
      totalCosturi += costuriProprii;
      
      const profitFinal = adaosFaraTVA - valoareComision - costuriProprii;
      totalProfit += profitFinal;
    }
    
    return {
      totalVenitGard,
      totalVenitAcoperis,
      totalVenit: totalVenitGard + totalVenitAcoperis,
      totalAdaosFaraTVA,
      totalCosturi,
      totalProfit
    };
  }, [salesData, expenseData]);

  const totalVenitGardFirma = allAgentTotals.totalVenitGard;
  const totalVenitAcoperisFirma = allAgentTotals.totalVenitAcoperis;
  const totalVenitFirma = allAgentTotals.totalVenit;
  const totalProfitFirma = allAgentTotals.totalProfit;
  const totalCosturiProprii = allAgentTotals.totalCosturi;
  const totalAdaosFaraTVA = allAgentTotals.totalAdaosFaraTVA;

  const profitByAgent = [...agentMetrics]
    .sort((a, b) => b.metrics.profitFinal - a.metrics.profitFinal)
    .slice(0, 10)
    .map(a => ({
      name: a.name,
      profit: Math.round(a.metrics.profitFinal)
    }));

  const profitGarduri = agentMetrics.reduce((sum, a) => sum + (a.metrics.adaosFaraTVA * (a.metrics.adaosTVAGard / ((a.metrics.adaosTVAGard + a.metrics.adaosTVAAcoperis) || 1))), 0);
  const profitAcoperisuri = agentMetrics.reduce((sum, a) => sum + (a.metrics.adaosFaraTVA * (a.metrics.adaosTVAAcoperis / ((a.metrics.adaosTVAGard + a.metrics.adaosTVAAcoperis) || 1))), 0);

  const pieData = [
    { name: 'Garduri', value: Math.max(0, profitGarduri) },
    { name: 'Acoperișuri', value: Math.max(0, profitAcoperisuri) },
  ];
  const COLORS = ['#0088FE', '#00C49F'];

  const formatDateRange = () => {
    if (!effectiveDateRange.from) return "Selectează perioada";
    if (!effectiveDateRange.to) return format(effectiveDateRange.from, "d MMM yyyy", { locale: ro });
    return `${format(effectiveDateRange.from, "d MMM yyyy", { locale: ro })} - ${format(effectiveDateRange.to, "d MMM yyyy", { locale: ro })}`;
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case "luna":
        return `${MONTHS[selectedMonthIndex - 1]} ${selectedYear}`;
      case "trimestru":
        return `T${selectedQuarter} ${selectedYear}`;
      case "an":
        return `Anul ${selectedYear}`;
      case "perioada":
        return formatDateRange();
    }
  };

  const handleRefresh = () => {
    refetchSales();
    refetchExpenses();
  };

  const isLoading = isLoadingSales || isLoadingExpenses;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financiar</h1>
          <p className="text-muted-foreground">Privire de ansamblu - {getPeriodLabel()}</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading} data-testid="button-refresh">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Se încarcă...' : 'Actualizează'}
          </Button>
          
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-[140px]" data-testid="select-period-type">
              <SelectValue placeholder="Tip perioadă" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="luna">Pe Lună</SelectItem>
              <SelectItem value="perioada">Pe Perioadă</SelectItem>
              <SelectItem value="trimestru">Pe Trimestru</SelectItem>
              <SelectItem value="an">Pe An</SelectItem>
            </SelectContent>
          </Select>

          {periodType === "luna" && (
            <>
              <Select value={selectedMonthIndex.toString()} onValueChange={(v) => setSelectedMonthIndex(parseInt(v))}>
                <SelectTrigger className="w-[140px]" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {periodType === "trimestru" && (
            <>
              <Select value={selectedQuarter.toString()} onValueChange={(v) => setSelectedQuarter(parseInt(v))}>
                <SelectTrigger className="w-[120px]" data-testid="select-quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">T1 (Ian-Mar)</SelectItem>
                  <SelectItem value="2">T2 (Apr-Iun)</SelectItem>
                  <SelectItem value="3">T3 (Iul-Sep)</SelectItem>
                  <SelectItem value="4">T4 (Oct-Dec)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]" data-testid="select-year-quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {periodType === "an" && (
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]" data-testid="select-year-annual">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {periodType === "perioada" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                  data-testid="button-date-range"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: startOfMonth(currentDate),
                      to: endOfMonth(currentDate)
                    })}
                  >
                    Luna curentă
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastMonth = subMonths(currentDate, 1);
                      setDateRange({
                        from: startOfMonth(lastMonth),
                        to: endOfMonth(lastMonth)
                      });
                    }}
                  >
                    Luna trecută
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: startOfYear(currentDate),
                      to: currentDate
                    })}
                  >
                    De la început de an
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venit Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-venit">{totalVenitFirma.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venit Garduri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-venit-gard">{totalVenitGardFirma.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Total vânzări garduri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venit Acoperișuri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600" data-testid="text-venit-acoperis">{totalVenitAcoperisFirma.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Total vânzări acoperișuri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adaos Fără TVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600" data-testid="text-adaos">{totalAdaosFaraTVA.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Marjă brută fără TVA</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costuri Agenți</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-cost-agenti">{totalCosturiProprii.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Total cheltuieli agenți</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfitFirma >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-profit">
              {totalProfitFirma.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-xs text-muted-foreground">Profit net calculat</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top 10 Agenți (Profit Final)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitByAgent}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString('ro-RO')} RON`} />
                  <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Profit per Categorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toLocaleString('ro-RO')} RON`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString('ro-RO')} RON`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
