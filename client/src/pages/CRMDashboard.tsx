import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Crown,
  Clock,
  RefreshCw,
  UserCheck,
  ShoppingCart,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardStats {
  clients: {
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
    wonValue: number;
    pipelineValue: number;
  };
  activeAgents: number;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function CRMDashboard() {
  const { user, isAdmin } = useAuth();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [period, setPeriod] = useState<string>("luna");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = format(currentTime, "EEEE, d MMMM yyyy", { locale: ro });
  const formattedTime = format(currentTime, "HH:mm:ss");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", isAdmin ? selectedAgent : user?.id, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      // For admins, allow filtering by selected agent
      // For non-admins, backend already filters by their userId, so we don't send agentId
      if (isAdmin && selectedAgent && selectedAgent !== "all") {
        params.set("agentId", selectedAgent);
      }
      if (dateFrom) {
        params.set("dateFrom", dateFrom.toISOString());
      }
      if (dateTo) {
        params.set("dateTo", dateTo.toISOString());
      }
      const res = await fetch(`/api/dashboard/stats?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea statisticilor");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["dashboard-agents"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/agents");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin, // Only load agents list for admins
  });

  const clientStats = stats?.clients || { total: 0, byStatus: {}, totalValue: 0, wonValue: 0, pipelineValue: 0 };
  const activeAgents = stats?.activeAgents || 0;

  const newOffers = clientStats.byStatus["NOUA"] || 0;
  const offersSent = clientStats.byStatus["TRIMISA"] || 0;
  const waiting = clientStats.byStatus["IN_ASTEPTARE"] || 0;
  const accepted = clientStats.byStatus["ACCEPTATA"] || 0;
  const won = clientStats.byStatus["VANDUT"] || 0;
  const lost = clientStats.byStatus["REFUZAT"] || 0;
  const cancelled = clientStats.byStatus["ANULATA"] || 0;

  const statsCards = [
    {
      title: "Total Clienți",
      value: clientStats.total.toString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Oferte Trimise",
      value: (offersSent + waiting + accepted).toString(),
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Vânzări",
      value: won.toString(),
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Valoare Câștigată",
      value: `${clientStats.wonValue.toLocaleString("ro-RO")} RON`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  const offerStatuses = [
    { label: "Vândute", value: won, icon: CheckCircle, color: "text-green-600" },
    { label: "În Așteptare", value: newOffers + offersSent + waiting + accepted, icon: Clock, color: "text-orange-600" },
    { label: "Refuzate/Anulate", value: lost + cancelled, icon: XCircle, color: "text-red-600" },
  ];

  const resetFilters = () => {
    setDate(undefined);
    setSelectedAgent("all");
    setPeriod("luna");
    setDateFrom(startOfMonth(new Date()));
    setDateTo(endOfMonth(new Date()));
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-welcome">
              Bună ziua, {user?.firstName}!
            </h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? `Gestionezi întregul sistem CRM cu ${activeAgents} agenți activi`
                : "Bine ai venit în sistemul CRM"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Filtru Calendar Vânzări</CardTitle>
                <CardDescription>
                  Selectează date și agent pentru a vizualiza vânzările
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={resetFilters}>
              <RefreshCw className="h-4 w-4" />
              Resetează filtrul
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Selectează date sau luni
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ro }) : "Click pentru a selecta date..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      if (d) {
                        const from = startOfDay(d);
                        const to = endOfDay(d);
                        setDateFrom(from);
                        setDateTo(to);
                        setPeriod("azi");
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Poți selecta mai multe zile, luni întregi sau combinații
              </p>
            </div>

            {/* Agent Selector - Only for admins */}
            {isAdmin && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Selectează agent
                </label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger data-testid="select-agent-filter">
                    <SelectValue placeholder="Selectează agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toți agenții</SelectItem>
                    {agents.filter(a => a.id).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selectează un agent specific sau lasă "Toți"
                </p>
              </div>
            )}

            {/* Date Range Selector */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Perioadă (de la / până la)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateFrom ? format(dateFrom, "dd MMM", { locale: ro }) : "De la"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateTo ? format(dateTo, "dd MMM", { locale: ro }) : "Până la"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-muted-foreground">
                {dateFrom && dateTo 
                  ? `${format(dateFrom, "d MMM", { locale: ro })} - ${format(dateTo, "d MMM yyyy", { locale: ro })}`
                  : "Selectați perioada pentru statistici"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons for Agents */}
      {!isAdmin && user?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Raport Activitate
            </CardTitle>
            <CardDescription>
              Exportă raportul tău de activitate pentru perioada selectată
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  const today = new Date();
                  const from = startOfDay(today);
                  const to = endOfDay(today);
                  window.location.href = `/admin/exporturi?agentId=${user.id}&from=${from.toISOString()}&to=${to.toISOString()}`;
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Zilnic
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  const from = startOfWeek(now, { weekStartsOn: 1 });
                  const to = endOfWeek(now, { weekStartsOn: 1 });
                  window.location.href = `/admin/exporturi?agentId=${user.id}&from=${from.toISOString()}&to=${to.toISOString()}`;
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Săptămânal
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  const from = startOfMonth(now);
                  const to = endOfMonth(now);
                  window.location.href = `/admin/exporturi?agentId=${user.id}&from=${from.toISOString()}&to=${to.toISOString()}`;
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Lunar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Vedere Generală Sistem</h2>
              <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Perioada:</span>
              <Select
                value={period}
                onValueChange={(value) => {
                  setPeriod(value);
                  const now = new Date();
                  let from: Date;
                  let to: Date;

                  if (value === "azi") {
                    from = startOfDay(now);
                    to = endOfDay(now);
                  } else if (value === "saptamana") {
                    from = startOfWeek(now, { weekStartsOn: 1 });
                    to = endOfWeek(now, { weekStartsOn: 1 });
                  } else if (value === "luna") {
                    from = startOfMonth(now);
                    to = endOfMonth(now);
                  } else {
                    from = startOfYear(now);
                    to = endOfYear(now);
                  }

                  setDate(undefined);
                  setDateFrom(from);
                  setDateTo(to);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="azi">Azi</SelectItem>
                  <SelectItem value="saptamana">Săptămâna aceasta</SelectItem>
                  <SelectItem value="luna">Luna aceasta</SelectItem>
                  <SelectItem value="an">Anul acesta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Agent:</span>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toți agenții</SelectItem>
                    {agents.filter(a => a.id).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {statsLoading ? "..." : stat.value}
                    </p>
                  </div>
                  <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Offer Statuses */}
      <div className="grid md:grid-cols-3 gap-4">
        {offerStatuses.map((status, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <status.icon className={cn("h-8 w-8", status.color)} />
                <div>
                  <p className="text-2xl font-bold" data-testid={`status-${status.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {statsLoading ? "..." : status.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{status.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card - Updated to reflect completed features */}
      {isAdmin && (
        <Card className="border-dashed border-blue-300 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-5 w-5" />
              Funcționalități CRM
            </CardTitle>
            <CardDescription>
              Progresul dezvoltării:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Gestionare Clienți (CRUD complet)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Dashboard cu statistici live
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Filtrare după agent
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Sistem de Oferte cu PDF
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Target-uri lunare pentru agenți
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Vânzări și rapoarte
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
