import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  Users,
  FileText,
  TrendingUp,
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  ShoppingCart,
  XCircle,
  PhoneCall,
  Download,
  UserPlus,
} from "lucide-react";
import { Link } from "wouter";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ro } from "date-fns/locale";

interface TodayStats {
  clientiNoi: number;
  oferteTrimise: number;
  valoareOferte: number;
  followUpEfectuat: number;
  vanzariNr: number;
  vanzariValoare: number;
  refuzuriNr: number;
  refuzuriValoare: number;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const DASHBOARD_PROFIT_AGENT_KEYS = ["alexandru croitoru", "marian costache", "oana", "razvan rosu"];
function isDashboardProfitAgent(user: { firstName?: string; lastName?: string } | null): boolean {
  if (!user) return false;
  const n = `${(user.firstName || "").trim()} ${(user.lastName || "").trim()}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return DASHBOARD_PROFIT_AGENT_KEYS.some((key) => n.includes(key));
}

interface ProfitComisionAgent {
  id: string;
  name: string;
  profitOperational: number;
  comisionValoare: number;
}

export default function CRMDashboard() {
  const { user, isAdmin } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const isProfitAgent = isDashboardProfitAgent(user);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAdmin && user?.id && isProfitAgent) setSelectedAgent(user.id);
  }, [isAdmin, user?.id, isProfitAgent]);

  const formattedDate = format(currentTime, "EEEE, d MMMM yyyy", { locale: ro });
  const formattedTime = format(currentTime, "HH:mm:ss");

  const { data: stats, isLoading } = useQuery<TodayStats>({
    queryKey: ["dashboard-today", isAdmin ? selectedAgent : user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isAdmin && selectedAgent && selectedAgent !== "all") params.set("agentId", selectedAgent);
      const res = await fetch(`/api/dashboard/today?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea statisticilor");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["dashboard-agents"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/agents");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin || isProfitAgent,
  });

  const luna = new Date().getMonth() + 1;
  const an = new Date().getFullYear();
  const showProfitCards = isProfitAgent ? true : isAdmin && selectedAgent !== "all";
  const { data: profitComisionData } = useQuery<{ agents: ProfitComisionAgent[] }>({
    queryKey: ["dashboard-profit-comision", luna, an],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/profit-comision?luna=${luna}&an=${an}`);
      if (!res.ok) throw new Error("Eroare la încărcarea profit/comision");
      return res.json();
    },
    enabled: showProfitCards,
    refetchInterval: 60000,
  });

  const profitAgents = profitComisionData?.agents ?? [];
  const cardAgentId = isProfitAgent ? user?.id : selectedAgent;
  const cardAgentMetrics = profitAgents.find((a) => a.id === cardAgentId);
  const leaderboardOrdered = [...profitAgents].sort((a, b) => {
    const aGreen = a.profitOperational >= 0 ? 1 : 0;
    const bGreen = b.profitOperational >= 0 ? 1 : 0;
    if (bGreen !== aGreen) return bGreen - aGreen;
    return b.comisionValoare - a.comisionValoare;
  });

  const { data: notifications } = useQuery<{
    recentLeads: { id: string; nume: string; sursa: string; dataAdaugare: string | null; dataOfertarii: string | null }[];
  }>({
    queryKey: ["notifications", "dashboard-leads-today"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?recentLeadsTodayOnly=1");
      if (!res.ok) return { recentLeads: [] };
      return res.json();
    },
  });
  const recentLeads = notifications?.recentLeads ?? [];

  const s = stats || {
    clientiNoi: 0,
    oferteTrimise: 0,
    valoareOferte: 0,
    followUpEfectuat: 0,
    vanzariNr: 0,
    vanzariValoare: 0,
    refuzuriNr: 0,
    refuzuriValoare: 0,
  };

  const cards = [
    { title: "Clienți noi (azi)", value: s.clientiNoi.toString(), icon: Users },
    { title: "Oferte trimise (azi)", value: s.oferteTrimise.toString(), icon: FileText },
    { title: "Valoare oferte (azi)", value: `${s.valoareOferte.toLocaleString("ro-RO")} RON`, icon: TrendingUp },
    { title: "Follow-up efectuat", value: s.followUpEfectuat.toString(), icon: PhoneCall },
    { title: "Vânzări (nr)", value: s.vanzariNr.toString(), icon: ShoppingCart },
    { title: "Valoare vânzări", value: `${s.vanzariValoare.toLocaleString("ro-RO")} RON`, icon: TrendingUp },
    { title: "Refuzuri (nr)", value: s.refuzuriNr.toString(), icon: XCircle },
    { title: "Refuzuri (valoare)", value: `${s.refuzuriValoare.toLocaleString("ro-RO")} RON`, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-welcome">
            Bună ziua, {user?.firstName}!
          </h1>
          <p className="text-slate-400">Dashboard – doar ziua curentă, actualizare în timp real</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
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

      {/* Selectare agenți: agenții din cele 4 nu pot alege "Toți agenții", văd doar contul lor */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-slate-400">Agent:</span>
        <Select
          value={selectedAgent}
          onValueChange={setSelectedAgent}
          disabled={!isAdmin && isProfitAgent}
        >
          <SelectTrigger className="w-full sm:w-[220px] min-h-[44px]" data-testid="select-agent-filter">
            <SelectValue placeholder="Selectează agent" />
          </SelectTrigger>
          <SelectContent>
            {isAdmin && <SelectItem value="all">Toți agenții</SelectItem>}
            {agents.filter((a) => a.id).map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.firstName} {agent.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistici azi */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index} className="border-[#4b5563] bg-black/40 shadow-md shadow-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-50" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {isLoading ? "..." : card.value}
                  </p>
                </div>
                <div className="p-3 rounded-full border border-yellow-500/40 bg-[#111827]">
                  <card.icon className="h-6 w-6 text-[#fbbf24]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Carduri Cheltuieli + Comision + Leaderboard (doar pentru cei 4 agenți) */}
      {showProfitCards && (cardAgentMetrics || leaderboardOrdered.length > 0) && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Card className="border-[#4b5563] bg-black/40 shadow-md shadow-yellow-500/10">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-400 mb-1">Cheltuieli</p>
              <p
                className={`text-2xl font-bold ${cardAgentMetrics ? (cardAgentMetrics.profitOperational >= 0 ? "text-emerald-600" : "text-red-600") : "text-slate-500"}`}
              >
                {cardAgentMetrics != null
                  ? cardAgentMetrics.profitOperational.toLocaleString("ro-RO", { minimumFractionDigits: 0 })
                  : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Profit operațional (lună curentă)</p>
            </CardContent>
          </Card>
          <Card className="border-[#4b5563] bg-black/40 shadow-md shadow-yellow-500/10">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-400 mb-1">Comision</p>
              <p
                className={`text-2xl font-bold ${cardAgentMetrics ? (cardAgentMetrics.profitOperational >= 0 ? "text-emerald-600" : "text-red-600") : "text-slate-500"}`}
              >
                {cardAgentMetrics != null
                  ? cardAgentMetrics.comisionValoare.toLocaleString("ro-RO", { minimumFractionDigits: 0 })
                  : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Comision RON (lună curentă)</p>
            </CardContent>
          </Card>
          <Card className="border-[#4b5563] bg-black/40 shadow-md shadow-yellow-500/10">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-400 mb-2">Leaderboard</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-200 font-medium">
                {leaderboardOrdered.length === 0
                  ? "—"
                  : leaderboardOrdered.map((a, i) => (
                      <li key={a.id}>
                        {a.name}
                      </li>
                    ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lead-uri: din reclama/extern și clienți care au primit ofertă */}
      <Card className="border-[#4b5563] bg-black/40 shadow-md shadow-yellow-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#fbbf24]" />
              Lead-uri (reclame / extern / ofertă trimisă)
            </h2>
            <Link href="/clienti">
              <span className="text-sm text-[#fbbf24] hover:underline">Vezi toți clienții</span>
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-slate-500">Niciun lead recent.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {recentLeads.slice(0, 15).map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/clienti?highlight=${lead.id}`}
                    className="block rounded-lg p-2 hover:bg-[#1f2937] text-slate-200 hover:text-[#fbbf24] transition-colors"
                  >
                    <span className="font-medium">{lead.nume}</span>
                    <span className="text-slate-500 text-sm ml-2">
                      {lead.sursa}
                      {lead.dataAdaugare
                        ? " · " + format(new Date(lead.dataAdaugare), "dd.MM.yyyy", { locale: ro })
                        : ""}
                    </span>
                    {lead.dataOfertarii && (
                      <span className="text-xs text-[#fbbf24] ml-2">Ofertă trimisă</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Export pentru agenți (non-admin) */}
      {!isAdmin && user?.id && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-3">Export raport activitate</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/admin/exporturi?agentId=${user.id}&from=${startOfDay(new Date()).toISOString()}&to=${endOfDay(new Date()).toISOString()}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#111827] border border-yellow-500/60 text-[#fbbf24] hover:bg-[#fbbf24] hover:text-black px-4 py-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export zilnic
              </a>
              <a
                href={`/admin/exporturi?agentId=${user.id}&from=${startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()}&to=${endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#111827] border border-yellow-500/60 text-[#fbbf24] hover:bg-[#fbbf24] hover:text-black px-4 py-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export săptămânal
              </a>
              <a
                href={`/admin/exporturi?agentId=${user.id}&from=${startOfMonth(new Date()).toISOString()}&to=${endOfMonth(new Date()).toISOString()}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#111827] border border-yellow-500/60 text-[#fbbf24] hover:bg-[#fbbf24] hover:text-black px-4 py-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export lunar
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
