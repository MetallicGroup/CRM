import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, getTotalsForMonth, calculateEmployeeMetrics } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CalendarIcon, Calendar as CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MONTHS, Month } from "@/lib/types";
import type { DateRange } from "react-day-picker";

type PeriodType = "luna" | "perioada" | "trimestru" | "an";

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ label: m, value: i }));

export default function Dashboard() {
  const { employees = [], showrooms = [] } = useStore();
  const store = useStore();
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();
  
  const [periodType, setPeriodType] = useState<PeriodType>("luna");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonthIndex);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(currentDate),
    to: endOfMonth(currentDate)
  });
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(currentMonthIndex / 3) + 1);

  const effectiveDateRange = useMemo(() => {
    switch (periodType) {
      case "luna":
        const monthDate = new Date(selectedYear, selectedMonthIndex, 1);
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

  const selectedMonthsForCalculation = useMemo(() => {
    if (!effectiveDateRange.from || !effectiveDateRange.to) return [MONTHS[currentMonthIndex]];
    
    const months: Month[] = [];
    const startDate = effectiveDateRange.from;
    const endDate = effectiveDateRange.to;
    
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      const monthName = MONTHS[current.getMonth()] as Month;
      if (!months.includes(monthName)) {
        months.push(monthName);
      }
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    
    return months.length > 0 ? months : [MONTHS[currentMonthIndex]];
  }, [effectiveDateRange, currentMonthIndex]);

  const aggregatedTotals = useMemo(() => {
    let totalVenitFirma = 0;
    let totalVenitGardFirma = 0;
    let totalProductionCosts = 0;
    let totalIndirectCosts = 0;

    selectedMonthsForCalculation.forEach(month => {
      const monthTotals = getTotalsForMonth(store, month);
      totalVenitFirma += monthTotals.totalVenitFirma;
      totalVenitGardFirma += monthTotals.totalVenitGardFirma;
      totalProductionCosts += monthTotals.totalProductionCosts;
      totalIndirectCosts += monthTotals.totalIndirectCosts;
    });

    return { totalVenitFirma, totalVenitGardFirma, totalProductionCosts, totalIndirectCosts };
  }, [store, selectedMonthsForCalculation]);

  const agents = employees.filter(e => e.type === 'AGENT');
  
  const agentMetrics = useMemo(() => {
    return agents.map(agent => {
      let totalProfit = 0;
      let totalAdaosGard = 0;
      let totalAdaosAcoperis = 0;
      let totalVenitGard = 0;
      let totalVenitAcoperis = 0;

      selectedMonthsForCalculation.forEach(month => {
        const monthTotals = getTotalsForMonth(store, month);
        const metrics = calculateEmployeeMetrics(agent, month, monthTotals);
        totalProfit += metrics.profitFinal;
        totalAdaosGard += metrics.adaosFaraTVA * (metrics.adaosTVAGard / (metrics.adaosTotalCuTVA || 1));
        totalAdaosAcoperis += metrics.adaosFaraTVA * (metrics.adaosTVAAcoperis / (metrics.adaosTotalCuTVA || 1));
        totalVenitGard += metrics.venitGard || 0;
        totalVenitAcoperis += metrics.venitAcoperis || 0;
      });

      return {
        ...agent,
        metrics: {
          profitFinal: totalProfit,
          adaosNetGard: totalAdaosGard,
          adaosNetAcoperis: totalAdaosAcoperis,
          venitGard: totalVenitGard,
          venitAcoperis: totalVenitAcoperis
        }
      };
    });
  }, [agents, store, selectedMonthsForCalculation]);

  const totalProfitFirma = agentMetrics.reduce((sum, a) => sum + a.metrics.profitFinal, 0);
  const totalVenitFirma = aggregatedTotals.totalVenitFirma;
  const totalVenitGardFirma = agentMetrics.reduce((sum, a) => sum + a.metrics.venitGard, 0);
  const totalVenitAcoperisFirma = agentMetrics.reduce((sum, a) => sum + a.metrics.venitAcoperis, 0);

  const profitByAgent = agentMetrics
    .sort((a, b) => b.metrics.profitFinal - a.metrics.profitFinal)
    .slice(0, 10)
    .map(a => ({
      name: a.name,
      profit: Math.round(a.metrics.profitFinal)
    }));

  const profitByShowroom = showrooms.map(s => {
    const profit = agentMetrics
      .filter(a => a.showroomId === s.id)
      .reduce((sum, a) => sum + a.metrics.profitFinal, 0);
    return { name: s.name.replace('Showroom ', ''), profit: Math.round(profit) };
  });

  const profitGarduri = agentMetrics.reduce((sum, a) => sum + a.metrics.adaosNetGard, 0);
  const profitAcoperisuri = agentMetrics.reduce((sum, a) => sum + a.metrics.adaosNetAcoperis, 0);

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
        return `${MONTHS[selectedMonthIndex]} ${selectedYear}`;
      case "trimestru":
        return `T${selectedQuarter} ${selectedYear}`;
      case "an":
        return `Anul ${selectedYear}`;
      case "perioada":
        return formatDateRange();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financiar</h1>
          <p className="text-muted-foreground">Privire de ansamblu - {getPeriodLabel()}</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
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
            <div className="text-2xl font-bold" data-testid="text-total-venit">{(totalVenitGardFirma + totalVenitAcoperisFirma).toLocaleString('ro-RO')} RON</div>
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
            <CardTitle className="text-sm font-medium">Profit Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfitFirma >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-profit">
              {totalProfitFirma.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-xs text-muted-foreground">Marjă netă calculată</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Producție</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-cost-productie">{aggregatedTotals.totalProductionCosts.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Cost total producție</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costuri Indirecte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-cost-indirecte">{aggregatedTotals.totalIndirectCosts.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">Include 80% București</p>
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
            <CardTitle>Profit per Showroom & Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex flex-col gap-4">
               <div className="h-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitByShowroom} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                      <Tooltip />
                      <Bar dataKey="profit" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <div className="h-1/2 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
