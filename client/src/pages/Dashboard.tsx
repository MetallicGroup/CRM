import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore, getTotalsForMonth, calculateAgentMetrics } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
  const { selectedMonth, agents, showrooms } = useStore();
  const store = useStore();
  const totals = getTotalsForMonth(store, selectedMonth);

  const agentMetrics = agents.map(agent => ({
    ...agent,
    metrics: calculateAgentMetrics(agent, selectedMonth, totals)
  }));

  const totalProfitFirma = agentMetrics.reduce((sum, a) => sum + a.metrics.profitFinal, 0);
  const totalVenitFirma = totals.totalVenitFirma;

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financiar</h1>
          <p className="text-muted-foreground">Privire de ansamblu - {selectedMonth}</p>
        </div>
        <MonthSelector />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Venit Firmă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVenitFirma.toLocaleString('ro-RO')} RON</div>
            <p className="text-xs text-muted-foreground">în luna {selectedMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit Firmă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfitFirma >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfitFirma.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-xs text-muted-foreground">Marjă netă calculată</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adaos Net Garduri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(profitGarduri).toLocaleString('ro-RO')} RON</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adaos Net Acoperișuri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(profitAcoperisuri).toLocaleString('ro-RO')} RON</div>
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
