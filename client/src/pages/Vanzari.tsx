import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { 
  ShoppingCart, 
  TrendingUp,
  Calendar,
  Search,
  Phone,
  Mail,
  MapPin,
  Eye,
  Users,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ro } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Client {
  id: string;
  nume: string;
  telefon: string;
  email: string | null;
  judet: string | null;
  localitate: string | null;
  sursa: string | null;
  stadiuOferta: string | null;
  categorieProdus: string | null;
  valoareOferta: string | null;
  agentId: string | null;
  updatedAt: string;
  dataVanzarii: string | null;
  stadiuComanda: string | null;
  isPartnerOrder: boolean | null;
  partnerId: string | null;
  avans: boolean | null;
  avansSuma: string | null;
  avansIncasat: boolean | null;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

// Etichete pentru categoriile de produs (aceleași ca la adăugare client)
const CATEGORY_LABELS: Record<string, string> = {
  ACOPERIS: "Acoperiș",
  GARD: "Gard",
  FATADA: "Fațadă",
  SISTEM_PLUVIAL: "Sistem pluvial",
  SAGEAC: "Sageac",
  ELEMENTE_SPECIALE: "Elemente speciale",
  FERESTRE_MANSARDA: "Ferestre mansardă",
  SCARI_ACCES: "Scări acces",
  ACCESORII_FERESTRE: "Accesorii ferestre/usi",
  SCULE: "Scule",
};

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "GOOGLE", label: "Google" },
  { value: "RECLAME_CAMPANII", label: "Reclame / Campanii" },
  { value: "SITE", label: "Site" },
  { value: "RECOMANDARE", label: "Recomandare" },
  { value: "TARG", label: "Târg" },
  { value: "OLX", label: "OLX" },
  { value: "CEL_RO", label: "Cel.ro" },
  { value: "OKAZII", label: "Okazii" },
  { value: "PUBLI24", label: "Publi24" },
  { value: "TELEFON", label: "Telefon" },
  { value: "MONTATORI", label: "Montatori" },
  { value: "BIROU_SHOWROOM", label: "Birou/Showroom" },
  { value: "COMPLETARE", label: "Completare" },
  { value: "TIKTOK", label: "Tik Tok" },
  { value: "PARTENERI", label: "Parteneri" },
  { value: "FURNIZORI", label: "Furnizori" },
];

export default function Vanzari() {
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<
    "all" | "with" | "without" | "comisionari"
  >("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["clients", "won", isAdmin ? selectedAgent : user?.id, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("stadiuOferta", "VANDUT");
      if (dateFrom) {
        params.set("dateFrom", dateFrom.toISOString());
      }
      if (dateTo) {
        params.set("dateTo", dateTo.toISOString());
      }
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error("Eroare la încărcarea vânzărilor");
      return res.json();
    },
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

  const { data: partnersComisionari = [] } = useQuery<{ id: string }[]>({
    queryKey: ["partners-comisionari-ids"],
    queryFn: async () => {
      const res = await fetch(
        "/api/partners?tipPartener=PARTENER_COMISIONAR&activ=true"
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  const comisionariPartnerIds = useMemo(
    () => new Set(partnersComisionari.map((p) => p.id)),
    [partnersComisionari]
  );

  const filteredClients = clients.filter((client) => {
    const matchesSearch = search === "" || 
      client.nume.toLowerCase().includes(search.toLowerCase()) ||
      client.telefon.includes(search);
    
    // For non-admins, backend already filters by their agentId, so we don't need to filter by agent here
    // For admins, allow filtering by selected agent
    const matchesAgent = isAdmin 
      ? (selectedAgent === "all" || client.agentId === selectedAgent)
      : true; // Non-admins see only their own clients (already filtered by backend)
    const matchesCategory = selectedCategory === "all" || client.categorieProdus === selectedCategory;
    const matchesOrderStatus = selectedOrderStatus === "all" || client.stadiuComanda === selectedOrderStatus;
    
    // Partner filter — „Cu partener” = cu partener, dar fără parteneri comisionari (aceia sunt la filtrul dedicat)
    const isComisionarPartner =
      !!client.partnerId && comisionariPartnerIds.has(client.partnerId);
    const matchesPartner =
      partnerFilter === "all" ||
      (partnerFilter === "with" &&
        client.isPartnerOrder &&
        !isComisionarPartner) ||
      (partnerFilter === "without" && !client.isPartnerOrder) ||
      (partnerFilter === "comisionari" &&
        !!client.partnerId &&
        comisionariPartnerIds.has(client.partnerId));

    const matchesSource = sourceFilter === "all" || client.sursa === sourceFilter;

    return matchesSearch && matchesAgent && matchesCategory && matchesOrderStatus && matchesPartner && matchesSource;
  });

  const getReportedValue = (client: Client): number => {
    // Întotdeauna afișăm suma totală (valoareOferta), nu doar avansul
    if (client.valoareOferta) {
      return parseFloat(client.valoareOferta);
    }
    return 0;
  };

  const totalValue = filteredClients.reduce((sum, client) => {
    return sum + getReportedValue(client);
  }, 0);

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Neasignat";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : "Necunoscut";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/40">
            <ShoppingCart className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-50" data-testid="text-title">Vânzări</h1>
            <p className="text-slate-400">
              Clienți câștigați și valoarea vânzărilor
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Vânzări</p>
                <p className="text-2xl font-bold" data-testid="stat-total-vanzari">
                  {filteredClients.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/40">
                <ShoppingCart className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Valoare Totală</p>
                <p className="text-2xl font-bold" data-testid="stat-valoare-totala">
                  {totalValue.toLocaleString("ro-RO")} RON
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/20 border border-purple-500/40">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Valoare Medie</p>
                <p className="text-2xl font-bold" data-testid="stat-valoare-medie">
                  {filteredClients.length > 0 
                    ? Math.round(totalValue / filteredClients.length).toLocaleString("ro-RO")
                    : 0} RON
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/40">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtrare Vânzări
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Caută după nume sau telefon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-col gap-2">
                <div className="w-[200px]">
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder="Toți agenții" />
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
                <div className="w-[200px]">
                  <Select value={selectedOrderStatus} onValueChange={setSelectedOrderStatus}>
                    <SelectTrigger data-testid="select-order-status">
                      <SelectValue placeholder="Stadiu comandă" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate stadiile</SelectItem>
                      <SelectItem value="CUSTODIE">Custodie</SelectItem>
                      <SelectItem value="COMANDAT">Comandat</SelectItem>
                      <SelectItem value="LISTAT">Listat</SelectItem>
                      <SelectItem value="IN_PRODUCTIE">În producție</SelectItem>
                      <SelectItem value="PRODUS">Produs</SelectItem>
                      <SelectItem value="LIVRAT">Livrat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="w-[150px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[220px]">
              <Select
                value={partnerFilter}
                onValueChange={(value) =>
                  setPartnerFilter(
                    value as "all" | "with" | "without" | "comisionari"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtru partener" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate vânzările</SelectItem>
                  <SelectItem value="without">Fără partener</SelectItem>
                  <SelectItem value="with">Cu partener</SelectItem>
                  <SelectItem value="comisionari">
                    Parteneri comisionari
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toate sursele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate sursele</SelectItem>
                  {SOURCE_OPTIONS.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-2 block">Data de la</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: ro }) : "Selectați data"}
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
            </div>
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-2 block">Data până la</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: ro }) : "Selectați data"}
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Lista Vânzărilor ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu există vânzări înregistrate</p>
              <Link href="/clienti">
                <Button variant="outline" className="mt-4">
                  Mergi la Clienți
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Locație</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Valoare</TableHead>
                  {isAdmin && <TableHead>Agent</TableHead>}
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} data-testid={`row-sale-${client.id}`}>
                    <TableCell className="font-medium">
                      {client.nume}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <a
                          href={client.telefon ? `tel:${client.telefon.replace(/\s+/g, "")}` : undefined}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                          onClick={() => {
                            fetch(`/api/clients/${client.id}/phone-click`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                            }).catch(() => {});
                          }}
                        >
                          <Phone className="h-3 w-3" /> {client.telefon}
                        </a>
                        {client.email && (
                          <a
                            href={`mailto:${client.email}`}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 hover:underline"
                          >
                            <Mail className="h-3 w-3" /> {client.email}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.judet && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {client.judet}
                          {client.localitate && `, ${client.localitate}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-200">
                        {client.categorieProdus ? (CATEGORY_LABELS[client.categorieProdus] || client.categorieProdus) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-400">
                      {getReportedValue(client)
                        ? `${getReportedValue(client).toLocaleString("ro-RO")} RON`
                        : "-"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {getAgentName(client.agentId)}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-slate-400">
                      {format(new Date(client.dataVanzarii || client.updatedAt), "d MMM yyyy", { locale: ro })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
